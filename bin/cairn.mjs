#!/usr/bin/env node
// Cairn CLI. Node.js 22+, no dependencies.
import fs from 'node:fs'
import path from 'node:path'
import { parseArgs } from 'node:util'
import { build, check, staleness } from '../src/build.mjs'
import { loadConfig } from '../src/config.mjs'
import { FrontMatterError, readFrontMatter } from '../src/frontmatter.mjs'
import { listSourceFiles, nodeIdOf } from '../src/graph.mjs'
import { insertBlock, renderWayfinding } from '../src/guide.mjs'
import { proposeConfig } from '../src/init.mjs'
import { describeSizes } from '../src/render.mjs'
import { CairnError, isInside } from '../src/util.mjs'

const HELP = `cairn: compact cards and wayfinding for a linked Markdown knowledge base

Usage:
  cairn build [--config cairn.config.json] [--if-stale] [--quiet]
      Generate the vault (cards, CATALOG, INDEX, bodies, WAYFINDING). Size targets are
      checked before the previous vault is replaced. --if-stale skips the build when the
      input fingerprint is unchanged.
  cairn check [--config cairn.config.json]
      Read-only: config valid, fingerprint current, files equal a fresh build, size targets met,
      and wayfinding.instructionFile (if set) carries the current block.
  cairn guide [--config cairn.config.json] [--write FILE]
      Print the wayfinding block, or insert/replace it between markers in FILE
      (CLAUDE.md, AGENTS.md, or a skill file). Paths in the block are relative to FILE.
      Rebuild first after any config change; guide warns when the vault is stale.
  cairn init <kb-folder> [--config cairn.config.json] [--write] [--force]
      Scan the folder and propose a config (best effort). --config names the config file the
      proposal is for: source.dir is written relative to its folder, and --write saves it there.
      Without --write the JSON goes to stdout and the report to stderr.
  cairn watch [--config cairn.config.json]
      Rebuild when files in source.dir or the config change (Ctrl-C to stop).

Exit codes: 0 ok, 1 failure, 2 usage or config error, 4 another build holds the lock.
`

const COMMON = { config: { type: 'string', short: 'c', default: 'cairn.config.json' }, quiet: { type: 'boolean', short: 'q', default: false }, help: { type: 'boolean', short: 'h', default: false } }
const SPECS = {
  build: { ...COMMON, 'if-stale': { type: 'boolean', default: false } },
  check: { ...COMMON },
  guide: { ...COMMON, write: { type: 'string' } },
  init: { ...COMMON, write: { type: 'boolean', default: false }, force: { type: 'boolean', default: false } },
  watch: { ...COMMON },
}

const out = (line) => process.stdout.write(`${line}\n`)
const errOut = (line) => process.stderr.write(`${line}\n`)

function parse(command, argv) {
  try {
    return parseArgs({ args: argv, options: SPECS[command], allowPositionals: command === 'init', strict: true })
  } catch (error) {
    throw new CairnError(`${error.message}\n\n${HELP}`, 2)
  }
}

function runBuild(values) {
  const config = loadConfig(values.config)
  const started = Date.now()
  const res = build(config, { ifStale: values['if-stale'] })
  for (const w of res.warnings) errOut(`warning: ${w}`)
  if (!values.quiet) {
    if (res.action === 'fresh') out(`cairn: vault is up to date (${config.output})`)
    else {
      out(`cairn: built ${config.output} in ${Date.now() - started} ms: ${res.counts.cards} cards, ${res.counts.catalogRows} catalog rows, ${res.counts.bodies} bodies`)
      out(`cairn: sizes: ${describeSizes(res.sizes)}`)
    }
  }
  return 0
}

function runCheck(values) {
  const config = loadConfig(values.config)
  const res = check(config)
  for (const line of res.passed) out(`ok    ${line}`)
  for (const w of res.warnings ?? []) out(`warn  ${w}`)
  for (const line of res.problems) out(`FAIL  ${line}`)
  out(res.ok ? 'cairn check: passed' : `cairn check: failed (${res.problems.length} problem${res.problems.length > 1 ? 's' : ''})`)
  return res.ok ? 0 : 1
}

/** Refuse to write the block into a note: a file inside source.dir that is a node (has an id). */
function assertNotNode(config, file) {
  if (!isInside(file, config.sourceDir)) return
  const rel = path.relative(config.sourceDir, file).split(path.sep).join('/')
  if (!listSourceFiles(config).includes(rel) || !fs.existsSync(file)) return
  let data
  try {
    ({ data } = readFrontMatter(fs.readFileSync(file, 'utf8')))
  } catch (error) {
    if (error instanceof FrontMatterError) return
    throw error
  }
  if (nodeIdOf(config, rel, data)) {
    throw new CairnError(`${display(file)} is a node of the knowledge base (it has an id); write the block into an instruction file that is not a note`, 1)
  }
}

const display = (file) => (path.relative(process.cwd(), file) || file).split(path.sep).join('/')

function runGuide(values) {
  const config = loadConfig(values.config)
  if (!values.write) {
    process.stdout.write(renderWayfinding(config))
    return 0
  }
  const file = path.resolve(values.write)
  assertNotNode(config, file)
  const block = renderWayfinding(config, { file })
  const before = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : ''
  const { text, action } = insertBlock(before, block)
  if (action !== 'unchanged') fs.writeFileSync(file, text)
  if (!values.quiet) out(`cairn: wayfinding block ${action} in ${display(file)}`)
  const st = staleness(config)
  if (st.stale) {
    errOut(`warning: the vault is stale (${st.reasons.join(', ')}); the block above matches the current config, but the vault does not yet. Run: cairn build --config ${values.config}, then cairn check --config ${values.config}`)
  }
  if (block !== renderWayfinding(config)) {
    const where = config.wayfinding.instructionFile ? `wayfinding.instructionFile ("${config.wayfinding.instructionFile}")` : 'the config folder'
    errOut(`note: paths in the block are relative to ${display(file)}, while ${config.output}/WAYFINDING.md is written relative to ${where}. Set wayfinding.instructionFile to this file and rebuild so that both match and check verifies the block.`)
  }
  return 0
}

function runInit(values, positionals) {
  if (positionals.length !== 1) throw new CairnError(`init needs exactly one knowledge-base folder\n\n${HELP}`, 2)
  const sourceDir = path.resolve(positionals[0])
  if (!fs.existsSync(sourceDir) || !fs.statSync(sourceDir).isDirectory()) throw new CairnError(`folder not found: ${positionals[0]}`, 2)
  const configFile = path.resolve(values.config)
  const { config, report } = proposeConfig(sourceDir, path.dirname(configFile))
  for (const line of report) errOut(`init: ${line}`)
  const json = `${JSON.stringify(config, null, 2)}\n`
  if (!values.write) {
    process.stdout.write(json)
    return 0
  }
  if (fs.existsSync(configFile) && !values.force) throw new CairnError(`${path.basename(configFile)} already exists; pass --force to overwrite`, 1)
  fs.writeFileSync(configFile, json)
  if (!values.quiet) out(`cairn: wrote ${path.relative(process.cwd(), configFile) || configFile}`)
  return 0
}

function runWatch(values) {
  const config = loadConfig(values.config)
  const rebuild = () => {
    try {
      const res = build(loadConfig(values.config), { ifStale: true })
      for (const w of res.warnings) errOut(`warning: ${w}`)
      out(res.action === 'fresh' ? 'cairn: up to date' : `cairn: rebuilt (${res.counts.cards} cards)`)
    } catch (error) {
      errOut(`cairn: ${error.message}`)
      for (const d of error.details ?? []) errOut(`  - ${d}`)
    }
  }
  let timer = null
  const schedule = () => {
    clearTimeout(timer)
    timer = setTimeout(rebuild, 400)
  }
  rebuild()
  fs.watch(config.sourceDir, { recursive: true }, schedule)
  fs.watch(path.resolve(values.config), schedule)
  out(`cairn: watching ${config.source.dir} (Ctrl-C to stop)`)
  return new Promise(() => {})
}

async function main(argv) {
  const [command, ...rest] = argv
  if (!command || command === '--help' || command === '-h' || command === 'help') {
    process.stdout.write(HELP)
    return command ? 0 : 2
  }
  if (command === '--version' || command === '-v') {
    const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
    out(pkg.version)
    return 0
  }
  if (!SPECS[command]) throw new CairnError(`unknown command "${command}"\n\n${HELP}`, 2)
  const { values, positionals } = parse(command, rest)
  if (values.help) {
    process.stdout.write(HELP)
    return 0
  }
  if (command === 'build') return runBuild(values)
  if (command === 'check') return runCheck(values)
  if (command === 'guide') return runGuide(values)
  if (command === 'init') return runInit(values, positionals)
  return runWatch(values)
}

try {
  process.exitCode = await main(process.argv.slice(2))
} catch (error) {
  if (error instanceof CairnError) {
    errOut(`cairn: ${error.message}`)
    for (const d of error.details) errOut(`  - ${d}`)
    process.exitCode = error.exitCode
  } else {
    errOut(`cairn: unexpected error: ${error?.stack ?? error}`)
    process.exitCode = 1
  }
}
