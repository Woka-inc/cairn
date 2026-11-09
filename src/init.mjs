// init: scan a folder of Markdown notes and propose a cairn.config.json (best effort).
// It only proposes; a person or agent should read real files and confirm each choice.
import fs from 'node:fs'
import path from 'node:path'
import { FILENAME_ID, HUB_MIN, HUB_SHARE, autoHubThreshold } from './config.mjs'
import { FrontMatterError, readFrontMatter } from './frontmatter.mjs'
import { asList, normalizeRef } from './graph.mjs'
import { oneLine, walkFiles } from './util.mjs'

const ID_CANDIDATES = ['id', 'slug', 'key', 'uid']
const TITLE_CANDIDATES = ['title', 'name', 'label']
const DESCRIPTION_CANDIDATES = ['description', 'summary', 'abstract', 'excerpt']
const SHARED_HINT = /^(evidence|sources?|cites|citations|references|refs|datasets?|design_?docs?|specs?|rfcs?)$/i
const REVERSE_LABELS = [
  [/^(depends_?on|dependencies|requires|prereq(uisite)?s?|needs|imports|uses)$/i, 'Used by'],
  [/^(related|see_?also|links?)$/i, 'Related from'],
  [/^(cites|citations|references|refs|design_?docs?|specs?|rfcs?|datasets?)$/i, 'Cited by'],
  [/^(parent|parents|part_?of|belongs_?to)$/i, 'Children'],
  [/^(supersedes|replaces)$/i, 'Superseded by'],
  [/^(evidence|sources?)$/i, 'Evidence for'],
]

const KIND_CANDIDATES = ['kind', 'type', 'category', 'class', 'doctype', 'template', 'layout']
const INSTRUCTION_FILES = /^(AGENTS|CLAUDE|GEMINI)\.md$/i
const README = /^README[^/]*\.md$/i
const MAX_LISTED_EXCLUDES = 20
const MANIFEST = '.cairn-fingerprint.json'
const pct = (x) => `${Math.round(x * 100)}%`

const kindOf = (v) => (Array.isArray(v) ? (v.every((x) => typeof x === 'string') ? 'list' : 'complex') : v && typeof v === 'object' ? 'complex' : v == null ? 'null' : 'scalar')

/** True when rel lies inside a folder (below sourceDir) that holds a Cairn vault. */
function inVault(sourceDir, rel, cache) {
  const parts = rel.split('/').slice(0, -1)
  for (let i = 1; i <= parts.length; i += 1) {
    const dir = parts.slice(0, i).join('/')
    if (!cache.has(dir)) cache.set(dir, fs.existsSync(path.join(sourceDir, ...parts.slice(0, i), MANIFEST)))
    if (cache.get(dir)) return true
  }
  return false
}

/**
 * Scan a folder. Returns { config, report: string[] }. sourceDir is written relative to configDir.
 * Besides fields, it proposes source.exclude (instruction files, READMEs and other files that are not nodes),
 * kindField (a field such as "kind" that splits notes into kinds), and fields that are complete within one kind.
 */
export function proposeConfig(sourceDir, configDir = process.cwd()) {
  const vaultCache = new Map()
  const all = walkFiles(sourceDir).filter((f) => f.endsWith('.md'))
  const files = all.filter((rel) => !inVault(sourceDir, rel, vaultCache))
  const docs = []
  const others = []
  const report = []
  let parseErrors = 0
  for (const rel of files) {
    try {
      const { data, hasFrontMatter } = readFrontMatter(fs.readFileSync(path.join(sourceDir, ...rel.split('/')), 'utf8'))
      if (hasFrontMatter) docs.push({ rel, data })
      else others.push(rel)
    } catch (error) {
      if (!(error instanceof FrontMatterError)) throw error
      parseErrors += 1
      if (parseErrors <= 3) report.push(`could not parse front matter: ${rel}: ${error.message}`)
    }
  }
  report.unshift(`scanned ${files.length} Markdown files; ${docs.length} have front matter${parseErrors ? `; ${parseErrors} failed to parse` : ''}`
    + `${all.length > files.length ? `; left out ${all.length - files.length} file(s) inside an existing Cairn vault` : ''}`)
  const n = docs.length || 1

  // Field statistics.
  const stats = new Map()
  for (const { data } of docs) {
    for (const [key, value] of Object.entries(data)) {
      if (!stats.has(key)) stats.set(key, { key, count: 0, kinds: new Map(), values: [], lengths: [] })
      const s = stats.get(key)
      s.count += 1
      const kind = kindOf(value)
      s.kinds.set(kind, (s.kinds.get(kind) ?? 0) + 1)
      for (const v of asList(value)) { s.values.push(oneLine(v)); s.lengths.push(oneLine(v).length) }
    }
  }
  const share = (key) => (stats.get(key)?.count ?? 0) / n
  const mainKind = (s) => [...s.kinds.entries()].sort((a, b) => b[1] - a[1])[0][0]

  // id
  let idField = FILENAME_ID
  for (const key of ID_CANDIDATES) {
    const s = stats.get(key)
    if (!s || share(key) < 0.9 || mainKind(s) !== 'scalar') continue
    const vals = docs.map((d) => oneLine(d.data[key])).filter(Boolean)
    if (new Set(vals).size === vals.length) { idField = key; break }
  }
  report.push(idField === FILENAME_ID ? 'id: no unique id field in ≥90% of files; using the file name ("$filename")' : `id: field "${idField}" (unique, in ${Math.round(share(idField) * 100)}% of files)`)
  const ids = new Set(idField === FILENAME_ID ? docs.map((d) => path.posix.basename(d.rel, '.md')) : docs.map((d) => oneLine(d.data[idField])).filter(Boolean))

  // Files that are not nodes: agent instruction files and READMEs always (unless a README has an id), and with
  // an id field every file that lacks it. They go to source.exclude so that writing the wayfinding block into
  // an instruction file inside the notes, or editing a README, never touches the inputs.
  const hasId = (d) => (idField === FILENAME_ID ? true : Boolean(oneLine(Array.isArray(d.data[idField]) ? '' : d.data[idField])))
  const isNamed = (rel) => INSTRUCTION_FILES.test(path.posix.basename(rel)) || README.test(path.posix.basename(rel))
  const exclude = []
  const unlisted = []
  for (const rel of others) if (isNamed(rel) || idField !== FILENAME_ID) exclude.push(rel)
  for (const d of docs) {
    const named = INSTRUCTION_FILES.test(path.posix.basename(d.rel)) || (README.test(path.posix.basename(d.rel)) && (idField === FILENAME_ID || !hasId(d)))
    if (named || !hasId(d)) exclude.push(d.rel)
  }
  exclude.sort()
  const named = exclude.filter(isNamed)
  const rest = exclude.filter((rel) => !isNamed(rel))
  const listed = [...named, ...(rest.length <= MAX_LISTED_EXCLUDES ? rest : [])].sort()
  if (rest.length > MAX_LISTED_EXCLUDES) unlisted.push(...rest)
  if (listed.length) report.push(`exclude: ${listed.length} file(s) that are not nodes (instruction files, READMEs${idField === FILENAME_ID ? '' : `, files without "${idField}"`}): ${listed.slice(0, 8).join(', ')}${listed.length > 8 ? ', …' : ''}`)
  if (unlisted.length) report.push(`not listed in exclude: ${unlisted.length} more files without "${idField}" (for example ${unlisted.slice(0, 3).join(', ')}); the build skips them with a warning and they do not affect the fingerprint; exclude their folders with a glob if they are templates or drafts`)
  const excluded = new Set(exclude)
  const nodes = docs.filter((d) => !excluded.has(d.rel))

  // Kinds: a field such as "kind" or "type" with a few values in nearly every node.
  let kindField = null
  for (const key of KIND_CANDIDATES) {
    const vals = nodes.map((d) => d.data[key]).filter((v) => typeof v === 'string' && v.trim())
    const distinct = new Set(vals.map(oneLine)).size
    if (nodes.length && vals.length / nodes.length >= 0.9 && distinct >= 2 && distinct <= 12) { kindField = key; break }
  }
  const groups = new Map()
  if (kindField) {
    for (const d of nodes) {
      const g = oneLine(typeof d.data[kindField] === 'string' ? d.data[kindField] : '')
      if (!groups.has(g)) groups.set(g, [])
      groups.get(g).push(d)
    }
    report.push(`kinds: field "${kindField}" (${[...groups.entries()].map(([g, ds]) => `${g || '(none)'} ${ds.length}`).join(', ')}); cards leave out relation rows that a kind never uses`)
  }
  /** Best coverage of a field within one kind of at least 3 nodes: { kind, share, size } or null. */
  const bestKind = (key) => {
    let best = null
    for (const [g, ds] of groups) {
      if (ds.length < 3) continue
      const share = ds.filter((d) => Object.prototype.hasOwnProperty.call(d.data, key)).length / ds.length
      if (!best || share > best.share) best = { kind: g, share, size: ds.length }
    }
    return best
  }

  const firstPresent = (cands, min) => cands.find((k) => share(k) >= min && stats.get(k) && mainKind(stats.get(k)) === 'scalar') ?? null
  const titleField = firstPresent(TITLE_CANDIDATES, 0.5) ?? 'title'
  const descriptionField = firstPresent(DESCRIPTION_CANDIDATES, 0.3)
  report.push(`title: "${titleField}"${descriptionField ? `; description: "${descriptionField}"` : '; no description field found'}`)

  const reserved = new Set([idField, titleField, descriptionField].filter(Boolean))
  const edges = []
  const attributes = []
  const cardFields = []
  let shared = null
  const unclassified = []
  const sorted = [...stats.values()].sort((a, b) => b.count - a.count || (a.key < b.key ? -1 : 1))
  for (const s of sorted) {
    if (reserved.has(s.key) || s.key === kindField) continue
    const kind = mainKind(s)
    const overall = s.count / n
    const within = bestKind(s.key)
    // A field complete within one kind (status on every design doc) counts as complete, whatever its overall share.
    const perKind = within && within.share >= 0.9 && overall < 0.9 ? within : null
    const coverage = perKind ? Math.max(overall, within.share) : overall
    const where = perKind ? ` (in ${pct(perKind.share)} of ${kindField}=${perKind.kind}, ${perKind.size} files; ${pct(overall)} overall)` : ''
    s.where = where
    if (coverage < 0.1 || kind === 'complex' || kind === 'null') { unclassified.push(s); continue }
    const refs = s.values.map(normalizeRef).filter(Boolean)
    const resolving = refs.filter((r) => ids.has(r)).length
    const ratio = refs.length ? resolving / refs.length : 0
    const distinct = new Set(s.values).size
    const meanLen = s.lengths.length ? s.lengths.reduce((a, b) => a + b, 0) / s.lengths.length : 0
    if (refs.length && ratio >= 0.6) {
      const reverse = REVERSE_LABELS.find(([re]) => re.test(s.key))?.[1] ?? `Referenced by (${s.key})`
      edges.push({ field: s.key, label: s.key.replace(/[_-]+/g, ' ').replace(/^./, (c) => c.toUpperCase()), reverse })
      report.push(`edge: "${s.key}" (${Math.round(ratio * 100)}% of ${refs.length} values are node ids)${where}`)
      if (!shared && SHARED_HINT.test(s.key)) shared = s.key
      continue
    }
    if (kind === 'list' && SHARED_HINT.test(s.key) && distinct < refs.length) {
      edges.push({ field: s.key, label: s.key.replace(/[_-]+/g, ' ').replace(/^./, (c) => c.toUpperCase()), external: true })
      report.push(`edge (external targets): "${s.key}" looks like shared references that are not nodes${where}`)
      if (!shared) shared = s.key
      continue
    }
    if (coverage >= 0.4 && distinct >= 2 && distinct <= Math.max(20, Math.ceil(n / 3)) && meanLen <= 40) {
      attributes.push(s.key)
      report.push(`attribute: "${s.key}" (${distinct} distinct values)${where}`)
      continue
    }
    if (coverage >= 0.4 && meanLen > 40) {
      cardFields.push(s.key)
      report.push(`card field: "${s.key}" (text, mean ${Math.round(meanLen)} chars)${where}`)
      continue
    }
    unclassified.push(s)
  }
  if (unclassified.length) {
    report.push(`not classified (decide by hand): ${unclassified.map((s) => `${s.key} (${s.where ? s.where.slice(2, -1) : `${pct(s.count / n)} of files`})`).join(', ')}`)
  }
  if (!edges.length) report.push('no edge fields found: values of no field resolve to node ids; add edges by hand if links exist')
  const sourceRel = path.relative(configDir, sourceDir).split(path.sep).join('/') || '.'
  const config = {
    source: { dir: sourceRel, include: ['**/*.md'], exclude: listed },
    idField,
    titleField,
    ...(descriptionField ? { descriptionField } : {}),
    ...(kindField ? { kindField } : {}),
    attributes: kindField && !attributes.includes(kindField) ? [kindField, ...attributes] : attributes,
    edges,
    ...(shared ? { sharedNeighbors: { via: shared } } : {}),
    k: 10,
    card: { fields: cardFields.slice(0, 3), maxBytes: 5120 },
    catalog: { maxBytes: 20480 },
    output: 'cairn-vault',
  }
  if (shared) {
    const users = nodes.filter((d) => asList(d.data[shared]).some((v) => normalizeRef(v))).length
    report.push(`two-hop: shared neighbors via "${shared}"; hub threshold left automatic: ${Math.round(HUB_SHARE * 100)}% of the ${users} nodes that use it, at least ${HUB_MIN} = ${autoHubThreshold(users)} (confirm the edge; set hubThreshold only for a reason)`)
  }
  if (sourceRel === '.' || !sourceRel.startsWith('..') && path.resolve(configDir, 'cairn-vault').startsWith(path.resolve(sourceDir) + path.sep)) {
    report.push('output: "cairn-vault" will sit inside the notes folder; Cairn leaves it out of the inputs, but add it to .gitignore and to the ignore lists of other tools that read the notes (for example Obsidian), or put the config one level up')
  }
  report.push('This is a proposal. Open a few real files, confirm each field, and edit the config before building.')
  return { config, report }
}
