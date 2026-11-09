// init: scan a folder of Markdown notes and propose a cairn.config.json (best effort).
// It only proposes; a person or agent should read real files and confirm each choice.
import fs from 'node:fs'
import path from 'node:path'
import { FILENAME_ID } from './config.mjs'
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

const kindOf = (v) => (Array.isArray(v) ? (v.every((x) => typeof x === 'string') ? 'list' : 'complex') : v && typeof v === 'object' ? 'complex' : v == null ? 'null' : 'scalar')

/** Scan a folder. Returns { config, report: string[] }. sourceDir is written relative to configDir. */
export function proposeConfig(sourceDir, configDir = process.cwd()) {
  const files = walkFiles(sourceDir).filter((f) => f.endsWith('.md'))
  const docs = []
  const report = []
  let parseErrors = 0
  for (const rel of files) {
    try {
      const { data, hasFrontMatter } = readFrontMatter(fs.readFileSync(path.join(sourceDir, ...rel.split('/')), 'utf8'))
      if (hasFrontMatter) docs.push({ rel, data })
    } catch (error) {
      if (!(error instanceof FrontMatterError)) throw error
      parseErrors += 1
      if (parseErrors <= 3) report.push(`could not parse front matter: ${rel}: ${error.message}`)
    }
  }
  report.unshift(`scanned ${files.length} Markdown files; ${docs.length} have front matter${parseErrors ? `; ${parseErrors} failed to parse` : ''}`)
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
    if (reserved.has(s.key)) continue
    const kind = mainKind(s)
    if (s.count / n < 0.1 || kind === 'complex' || kind === 'null') { unclassified.push(s); continue }
    const refs = s.values.map(normalizeRef).filter(Boolean)
    const resolving = refs.filter((r) => ids.has(r)).length
    const ratio = refs.length ? resolving / refs.length : 0
    const distinct = new Set(s.values).size
    const meanLen = s.lengths.length ? s.lengths.reduce((a, b) => a + b, 0) / s.lengths.length : 0
    if (refs.length && ratio >= 0.6) {
      const reverse = REVERSE_LABELS.find(([re]) => re.test(s.key))?.[1] ?? `Referenced by (${s.key})`
      edges.push({ field: s.key, label: s.key.replace(/[_-]+/g, ' ').replace(/^./, (c) => c.toUpperCase()), reverse })
      report.push(`edge: "${s.key}" (${Math.round(ratio * 100)}% of ${refs.length} values are node ids)`)
      if (!shared && SHARED_HINT.test(s.key)) shared = s.key
      continue
    }
    if (kind === 'list' && SHARED_HINT.test(s.key) && distinct < refs.length) {
      edges.push({ field: s.key, label: s.key.replace(/[_-]+/g, ' ').replace(/^./, (c) => c.toUpperCase()), external: true })
      report.push(`edge (external targets): "${s.key}" looks like shared references that are not nodes`)
      if (!shared) shared = s.key
      continue
    }
    if (s.count / n >= 0.4 && distinct >= 2 && distinct <= Math.max(20, Math.ceil(n / 3)) && meanLen <= 40) {
      attributes.push(s.key)
      report.push(`attribute: "${s.key}" (${distinct} distinct values)`)
      continue
    }
    if (s.count / n >= 0.4 && meanLen > 40) {
      cardFields.push(s.key)
      report.push(`card field: "${s.key}" (text, mean ${Math.round(meanLen)} chars)`)
      continue
    }
    unclassified.push(s)
  }
  if (unclassified.length) {
    report.push(`not classified (decide by hand): ${unclassified.map((s) => `${s.key} (${Math.round((s.count / n) * 100)}% of files)`).join(', ')}`)
  }
  if (!edges.length) report.push('no edge fields found: values of no field resolve to node ids; add edges by hand if links exist')
  const config = {
    source: { dir: path.relative(configDir, sourceDir).split(path.sep).join('/') || '.', include: ['**/*.md'], exclude: [] },
    idField,
    titleField,
    ...(descriptionField ? { descriptionField } : {}),
    attributes,
    edges,
    ...(shared ? { sharedNeighbors: { via: shared, hubThreshold: Math.max(3, Math.ceil(docs.length * 0.15)) } } : {}),
    k: 10,
    card: { fields: cardFields.slice(0, 3), maxBytes: 5120 },
    catalog: { maxBytes: 20480 },
    output: 'cairn-vault',
  }
  if (shared) report.push(`two-hop: shared neighbors via "${shared}" (hub threshold ${config.sharedNeighbors.hubThreshold}; confirm this)`)
  report.push('This is a proposal. Open a few real files, confirm each field, and edit the config before building.')
  return { config, report }
}
