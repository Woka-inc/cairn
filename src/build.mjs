// Build and check: fingerprint the inputs, plan the vault, enforce size targets, then swap the new
// vault into place atomically (write to a temporary sibling, verify, rename). check() is read-only.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { configDigestInput } from './config.mjs'
import { FrontMatterError, readFrontMatter } from './frontmatter.mjs'
import { renderWayfinding, START_MARKER, END_MARKER } from './guide.mjs'
import { buildGraph, listSourceFiles, loadNodes, nodeIdOf } from './graph.mjs'
import { describeSizes, oversized, planVault, sizeReport } from './render.mjs'
import { CairnError, bytes, kb, sha256, walkFiles } from './util.mjs'

export const TOOL = 'cairn'
export const FORMAT = 1
export const MANIFEST = '.cairn-fingerprint.json'
const LOCK_STALE_MS = 60 * 1000

const SRC_DIR = path.dirname(fileURLToPath(import.meta.url))
const lf = (buf) => buf.toString('utf8').replace(/\r\n?/g, '\n')

/** Generator identity: version plus a hash of the generator source (line endings normalized). */
export function generatorId() {
  const pkg = JSON.parse(fs.readFileSync(path.join(SRC_DIR, '..', 'package.json'), 'utf8'))
  const parts = fs.readdirSync(SRC_DIR).filter((f) => f.endsWith('.mjs')).sort().map((f) => `${f}\u0000${sha256(lf(fs.readFileSync(path.join(SRC_DIR, f))))}`)
  return { version: pkg.version, sha256: sha256(parts.join('\n')) }
}

/**
 * Fingerprint input for one source file. A file that is not a node (no id field) contributes only its path and
 * a marker, because its content does not reach the output; editing a README or the instruction file inside
 * source.dir therefore does not make the vault stale, while giving such a file an id does.
 */
function filePart(config, rel) {
  const text = lf(fs.readFileSync(path.join(config.sourceDir, ...rel.split('/'))))
  try {
    const { data } = readFrontMatter(text)
    if (!nodeIdOf(config, rel, data)) return `${rel}\u0000-`
  } catch (error) {
    if (!(error instanceof FrontMatterError)) throw error
  }
  return `${rel}\u0000${sha256(text)}`
}

/** Fingerprint of everything the output depends on: node files, config, generator. */
export function fingerprint(config) {
  const files = listSourceFiles(config)
  const parts = files.map((rel) => filePart(config, rel))
  const inputs = sha256(parts.join('\n'))
  const configSha = sha256(configDigestInput(config))
  const gen = generatorId()
  return {
    fingerprint: sha256([TOOL, FORMAT, gen.version, gen.sha256, configSha, inputs].join('\n')),
    inputs,
    config: configSha,
    generator: gen,
    files: files.length,
  }
}

export function readManifest(outDir) {
  try {
    const m = JSON.parse(fs.readFileSync(path.join(outDir, MANIFEST), 'utf8'))
    return m && m.tool === TOOL ? m : null
  } catch {
    return null
  }
}

/** Plan the vault in memory. Returns { files, counts, warnings, over }. */
export function plan(config) {
  const loaded = loadNodes(config)
  const graph = buildGraph(config, loaded.nodes)
  const planned = planVault(config, loaded, graph)
  return { ...planned, warnings: [...loaded.warnings, ...graph.warnings], over: oversized(config, planned.files), graph, loaded }
}

const describeOver = (over) => over.map((o) => `${o.rel}: ${kb(o.bytes)} > ${kb(o.limit)} (${o.kind} target; ${o.bytes - o.limit} bytes over)`)

/**
 * Is the vault older than its inputs? Returns { stale, missing, reasons: string[] }. Read-only.
 * Any config change counts, including wayfinding settings, because WAYFINDING.md is part of the vault.
 */
export function staleness(config, fp = fingerprint(config)) {
  const manifest = readManifest(config.outDir)
  if (!manifest) return { stale: true, missing: true, reasons: [`no vault in ${config.output} yet`] }
  if (manifest.fingerprint === fp.fingerprint) return { stale: false, missing: false, reasons: [] }
  const reasons = []
  if (manifest.inputs !== fp.inputs) reasons.push('node files changed')
  if (manifest.config !== fp.config) reasons.push('config changed')
  if (manifest.generator !== fp.generator.sha256 || manifest.version !== fp.generator.version) reasons.push('generator changed')
  if (!reasons.length) reasons.push('fingerprint differs')
  return { stale: true, missing: false, reasons }
}

function manifestJson(fp, counts) {
  return `${JSON.stringify({
    tool: TOOL,
    format: FORMAT,
    version: fp.generator.version,
    fingerprint: fp.fingerprint,
    inputs: fp.inputs,
    config: fp.config,
    generator: fp.generator.sha256,
    sourceFiles: fp.files,
    counts,
  }, null, 2)}\n`
}

function acquireLock(lock) {
  try {
    fs.mkdirSync(lock)
    return true
  } catch (error) {
    if (error.code !== 'EEXIST') throw error
  }
  let age = Infinity
  try { age = Date.now() - fs.statSync(lock).mtimeMs } catch { /* gone */ }
  if (age < LOCK_STALE_MS) return false
  fs.rmSync(lock, { recursive: true, force: true })
  try {
    fs.mkdirSync(lock)
    return true
  } catch {
    return false
  }
}

/**
 * Build the vault. Returns { action: 'built' | 'fresh', counts, warnings, fingerprint }.
 * Throws CairnError when a size target is exceeded (the previous vault is left untouched),
 * when the output folder holds something that is not a Cairn vault, or when another build holds the lock.
 */
export function build(config, { ifStale = false } = {}) {
  const out = config.outDir
  const existing = readManifest(out)
  if (fs.existsSync(out)) {
    if (!fs.statSync(out).isDirectory()) throw new CairnError(`output is not a folder: ${path.basename(out)}`)
    if (!existing && fs.readdirSync(out).length > 0) {
      throw new CairnError(`output folder "${config.output}" is not empty and is not a Cairn vault (no ${MANIFEST}); choose another folder or empty it`)
    }
  }
  const fp = fingerprint(config)
  if (ifStale && existing && existing.fingerprint === fp.fingerprint) {
    return { action: 'fresh', counts: existing.counts, warnings: [], fingerprint: fp.fingerprint }
  }
  const planned = plan(config)
  if (planned.over.length) {
    throw new CairnError(
      `size targets exceeded; the vault was not replaced (${planned.over.length} file${planned.over.length > 1 ? 's' : ''})`,
      1,
      [...describeOver(planned.over), `Actual sizes: ${describeSizes(sizeReport(config, planned.files))}.`, 'Reduce card.fields, card.maxFieldChars, card.maxHeadings, or k, or raise the target in the config.'],
    )
  }
  const parent = path.dirname(out)
  const base = path.basename(out)
  const stamp = `${process.pid}-${Date.now()}`
  const lock = path.join(parent, `.${base}.lock`)
  const tmp = path.join(parent, `.${base}.tmp-${stamp}`)
  const old = path.join(parent, `.${base}.old-${stamp}`)
  fs.mkdirSync(parent, { recursive: true })
  if (!acquireLock(lock)) throw new CairnError('another Cairn build is running for this output (lock held); try again shortly', 4)
  try {
    try {
      for (const [rel, content] of planned.files) {
        const file = path.join(tmp, ...rel.split('/'))
        fs.mkdirSync(path.dirname(file), { recursive: true })
        fs.writeFileSync(file, content)
      }
      fs.writeFileSync(path.join(tmp, MANIFEST), manifestJson(fp, planned.counts))
      // Verify what was written before it replaces anything.
      const written = walkFiles(tmp)
      if (written.length !== planned.files.size) throw new CairnError(`wrote ${written.length} files, expected ${planned.files.size}`)
      for (const [rel, content] of planned.files) {
        if (fs.statSync(path.join(tmp, ...rel.split('/'))).size !== bytes(content)) throw new CairnError(`verification failed for ${rel}`)
      }
      const hadOld = fs.existsSync(out)
      if (hadOld) fs.renameSync(out, old)
      try {
        fs.renameSync(tmp, out)
      } catch (error) {
        if (hadOld) fs.renameSync(old, out)
        throw error
      }
      if (hadOld) fs.rmSync(old, { recursive: true, force: true })
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true })
    }
  } finally {
    fs.rmSync(lock, { recursive: true, force: true })
  }
  return { action: 'built', counts: planned.counts, warnings: planned.warnings, fingerprint: fp.fingerprint, sizes: sizeReport(config, planned.files) }
}

/** Read-only verification. Returns { ok, passed: string[], problems: string[], stale: boolean, warnings: string[] }. */
export function check(config) {
  const passed = ['config is valid']
  const problems = []
  const out = config.outDir
  if (!fs.existsSync(out)) return { ok: false, passed, problems: [`vault not found: ${config.output} (run cairn build)`], stale: true }
  const manifest = readManifest(out)
  if (!manifest) return { ok: false, passed, problems: [`${MANIFEST} missing or not written by Cairn in ${config.output}`], stale: true }
  if (manifest.format !== FORMAT) problems.push(`vault format ${manifest.format} differs from this generator's format ${FORMAT}; rebuild`)

  const fp = fingerprint(config)
  const { stale, reasons } = staleness(config, fp)
  if (stale) {
    const hint = reasons.includes('config changed') ? '; every config change, including wayfinding settings, needs a rebuild before guide and check' : ''
    problems.push(`stale: ${reasons.join(', ')} since the last build (run cairn build${hint})`)
  } else {
    passed.push(`fingerprint matches the inputs (${fp.files} source files)`)
  }

  const planned = plan(config)
  const onDisk = new Set(walkFiles(out))
  const missing = [...planned.files.keys()].filter((rel) => !onDisk.has(rel))
  const extra = [...onDisk].filter((rel) => !planned.files.has(rel))
  const differ = [...planned.files.entries()].filter(([rel, content]) => onDisk.has(rel) && fs.readFileSync(path.join(out, ...rel.split('/')), 'utf8') !== content).map(([rel]) => rel)
  if (missing.length || extra.length || differ.length) {
    const list = (xs) => `${xs.slice(0, 5).join(', ')}${xs.length > 5 ? ', …' : ''}`
    if (missing.length) problems.push(`${missing.length} expected file(s) missing: ${list(missing)}`)
    if (extra.length) problems.push(`${extra.length} unexpected file(s): ${list(extra)}`)
    if (differ.length) problems.push(`${differ.length} file(s) differ from a fresh build (edited by hand or stale): ${list(differ)}`)
  } else {
    passed.push(`all ${planned.files.size} files match a fresh build byte for byte`)
  }

  // Size targets, measured on disk.
  const diskFiles = new Map([...onDisk].filter((rel) => rel.endsWith('.md')).map((rel) => [rel, fs.readFileSync(path.join(out, ...rel.split('/')), 'utf8')]))
  const over = oversized(config, diskFiles)
  const sizes = describeSizes(sizeReport(config, diskFiles))
  if (over.length) problems.push(...describeOver(over), `actual sizes: ${sizes}`)
  else passed.push(`size targets met: ${sizes}`)

  const nodes = planned.counts.nodes
  const cards = [...onDisk].filter((rel) => rel.startsWith('cards/')).length
  if (cards !== nodes) problems.push(`${cards} cards for ${nodes} nodes`)
  else passed.push(`${cards} cards = ${nodes} nodes`)
  const catalog = diskFiles.get('CATALOG.md')
  if (catalog !== undefined) {
    const rows = catalog.split('\n').filter((l) => l.startsWith('| ') && !l.startsWith('| id |')).length
    if (rows !== nodes) problems.push(`CATALOG.md has ${rows} rows for ${nodes} nodes`)
    else passed.push(`CATALOG.md rows = ${nodes} nodes`)
  }

  // The configured instruction file carries the current block.
  if (config.instructionPath) {
    const shown = config.wayfinding.instructionFile
    const text = fs.existsSync(config.instructionPath) ? fs.readFileSync(config.instructionPath, 'utf8') : null
    const block = renderWayfinding(config).replace(/\n+$/, '')
    if (text === null) problems.push(`instruction file not found: ${shown} (run cairn guide --write ${shown})`)
    else if (!text.includes(START_MARKER) || !text.includes(END_MARKER)) problems.push(`${shown} has no wayfinding block (run cairn guide --write ${shown})`)
    else if (!text.includes(block)) problems.push(`${shown} carries an outdated wayfinding block (run cairn guide --write ${shown})`)
    else passed.push(`${shown} carries the current wayfinding block`)
  }
  return { ok: problems.length === 0, passed, problems, stale, warnings: planned.warnings }
}
