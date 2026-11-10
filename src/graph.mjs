// Graph: read node documents, resolve typed edges, and expand neighborhoods
// (reverse edges by type and two-hop shared-intermediate neighbors with hub exclusion and a top-k cap).
import fs from 'node:fs'
import path from 'node:path'
import { FILENAME_ID, autoHubThreshold } from './config.mjs'
import { FrontMatterError, readFrontMatter } from './frontmatter.mjs'
import { CairnError, globToRegExp, isInside, naturalCompare, oneLine, walkFiles } from './util.mjs'

/**
 * Source files selected by include/exclude globs, as sorted relative paths.
 * Cairn's own output and the configured instruction file (wayfinding.instructionFile) are never inputs.
 */
export function listSourceFiles(config) {
  const include = config.source.include.map(globToRegExp)
  const exclude = config.source.exclude.map(globToRegExp)
  const outRel = path.relative(config.sourceDir, config.outDir)
  return walkFiles(config.sourceDir).filter((rel) => {
    if (!include.some((re) => re.test(rel))) return false
    if (exclude.some((re) => re.test(rel))) return false
    const full = path.join(config.sourceDir, ...rel.split('/'))
    if (outRel && !outRel.startsWith('..') && isInside(full, config.outDir)) return false
    if (config.instructionPath && path.relative(config.instructionPath, full) === '') return false
    return true
  })
}

/** The node id of a parsed source file, or '' when the file is not a node (no id field). */
export function nodeIdOf(config, rel, data, idField = config.idField) {
  if (idField === FILENAME_ID) return path.posix.basename(rel).replace(/\.[^.]+$/, '')
  return oneLine(Array.isArray(data[idField]) ? '' : data[idField])
}

/** Is this source file an intermediate note (sharedNeighbors.notes.include) rather than a node? */
export function isNoteFile(config, rel) {
  const include = config.sharedNeighbors?.notes?.include ?? []
  return include.length > 0 && include.map(globToRegExp).some((re) => re.test(rel))
}

export const asList = (value) => {
  if (value == null || value === '') return []
  const list = Array.isArray(value) ? value : [value]
  return list.filter((v) => typeof v === 'string' || typeof v === 'number').map((v) => String(v))
}

/** Normalize an edge reference: [[id|alias]], [text](path/id.md), path/id.md -> id. */
export function normalizeRef(value) {
  let s = oneLine(value)
  const wiki = s.match(/^\[\[([^\]|#]+)(?:[#|][^\]]*)?\]\]$/)
  if (wiki) s = wiki[1].trim()
  const md = s.match(/^\[[^\]]*\]\(([^)]+)\)$/)
  if (md) s = md[1].trim()
  if (/\.md$/i.test(s)) s = path.posix.basename(s.replace(/\\/g, '/')).replace(/\.md$/i, '')
  return s
}

/** Filesystem-safe file stem for an id. */
export const fileStem = (id) => id.replace(/[\\/:*?"<>|\u0000-\u001f]+/g, '-').replace(/^\.+/, '_')

/**
 * Read all node documents. Returns { nodes, skipped, warnings }.
 * nodes: [{ id, stem, rel, data, body, title, description }] sorted by id.
 * Throws CairnError listing every parse error or duplicate id.
 */
export function loadNodes(config) {
  const files = listSourceFiles(config)
  const errors = []
  const docs = []
  const noteDocs = []
  for (const rel of files) {
    const raw = fs.readFileSync(path.join(config.sourceDir, ...rel.split('/')), 'utf8')
    let parsed
    try {
      parsed = readFrontMatter(raw)
    } catch (error) {
      if (error instanceof FrontMatterError) { errors.push(`${rel}: ${error.message}`); continue }
      throw error
    }
    if (isNoteFile(config, rel)) noteDocs.push({ rel, raw, data: parsed.data, body: parsed.body })
    else docs.push({ rel, data: parsed.data, body: parsed.body })
  }
  if (errors.length) throw new CairnError(`cannot read the knowledge base (${errors.length} problem${errors.length > 1 ? 's' : ''})`, 1, errors)
  const loaded = nodesFromDocs(config, docs)
  return { ...loaded, notes: notesFromDocs(config, noteDocs), fileCount: files.length }
}

/** A text field of a front-matter object as one line ('' when missing or not a string or number). */
const textField = (data, field) => (field && typeof data[field] === 'string' ? oneLine(data[field]) : '')

/**
 * Turn parsed documents into nodes: [{ rel, data, body, id? }] -> { nodes, skipped, warnings }.
 * A document without an id (given or read from the id field) is skipped. Used by loadNodes and by
 * library callers that read their own files (planNodes).
 */
export function nodesFromDocs(config, docs) {
  const errors = []
  const skipped = []
  const nodes = []
  for (const doc of docs) {
    const rel = doc.rel ?? ''
    const data = doc.data ?? {}
    const id = oneLine(doc.id ?? '') || nodeIdOf(config, rel, data)
    if (!id) { skipped.push(rel || '(unnamed document)'); continue }
    const name = textField(data, config.titleField)
    nodes.push({ id, stem: fileStem(id), rel, data, body: String(doc.body ?? ''), name, title: name || id, description: textField(data, config.descriptionField) })
  }
  const byId = new Map()
  const byStem = new Map()
  for (const node of nodes) {
    if (byId.has(node.id)) errors.push(`duplicate id "${node.id}" in ${byId.get(node.id).rel} and ${node.rel}`)
    else byId.set(node.id, node)
    const key = node.stem.toLowerCase()
    if (byStem.has(key) && byStem.get(key).id !== node.id) errors.push(`ids "${byStem.get(key).id}" and "${node.id}" map to the same file name; rename one`)
    else byStem.set(key, node)
  }
  if (errors.length) throw new CairnError(`cannot read the knowledge base (${errors.length} problem${errors.length > 1 ? 's' : ''})`, 1, errors)
  nodes.sort((a, b) => naturalCompare(a.id, b.id))
  const warnings = []
  if (skipped.length) {
    warnings.push(`${skipped.length} file(s) skipped because they have no "${config.idField}" field (they are not nodes and do not affect the fingerprint; add them to source.exclude to silence this): ${skipped.slice(0, 5).join(', ')}${skipped.length > 5 ? ', …' : ''}`)
  }
  return { nodes, skipped, warnings }
}

/**
 * Intermediate notes (the targets of sharedNeighbors.via, rendered as their own files):
 * [{ rel, raw, data, body, id? }] -> [{ id, stem, rel, raw, data, body, name, title }] sorted by id.
 */
export function notesFromDocs(config, docs) {
  const spec = config.sharedNeighbors?.notes
  if (!spec) return []
  const errors = []
  const notes = []
  const seen = new Map()
  for (const doc of docs) {
    const rel = doc.rel ?? ''
    const data = doc.data ?? {}
    const id = oneLine(doc.id ?? '') || nodeIdOf(config, rel, data, spec.idField)
    if (!id) { errors.push(`${rel || '(unnamed note)'}: no "${spec.idField}" field`); continue }
    if (seen.has(id)) { errors.push(`duplicate note id "${id}" in ${seen.get(id)} and ${rel}`); continue }
    seen.set(id, rel)
    const name = textField(data, spec.titleField)
    notes.push({ id, stem: fileStem(id), rel, raw: String(doc.raw ?? doc.body ?? ''), data, body: String(doc.body ?? ''), name, title: name || id })
  }
  if (errors.length) throw new CairnError(`cannot read the intermediate notes (${errors.length} problem${errors.length > 1 ? 's' : ''})`, 1, errors)
  return notes.sort((a, b) => naturalCompare(a.id, b.id))
}

/**
 * Build the expanded graph.
 * Returns { byId, forward, reverse, shared(id), usersOf, hub, dangling, warnings }.
 *  forward[field]: Map<id, string[]>  outgoing targets in author order (deduplicated)
 *  reverse[field]: Map<id, string[]>  incoming sources, naturally sorted
 *  shared(id): { ranked: [[id, count]], total, hubs, shown, truncated, reason }
 *  hub: { threshold, auto, users } — users = nodes with at least one sharedNeighbors.via target
 */
export function buildGraph(config, nodes, notes = []) {
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const notesById = new Map(notes.map((n) => [n.id, n]))
  const viaNotes = Boolean(config.sharedNeighbors?.notes)
  const forward = {}
  const reverse = {}
  const dangling = []
  for (const edge of config.edges) {
    const fwd = new Map()
    const rev = new Map()
    for (const node of nodes) {
      const seen = new Set()
      const targets = []
      for (const raw of asList(node.data[edge.field])) {
        const target = normalizeRef(raw)
        if (!target || seen.has(target) || target === node.id) continue
        // With intermediate notes, the via edge points at notes instead of nodes.
        const known = viaNotes && edge.field === config.sharedNeighbors.via ? notesById.has(target) : byId.has(target) || edge.external
        if (!known) { dangling.push(`${node.id} -[${edge.field}]-> ${target}`); continue }
        seen.add(target)
        targets.push(target)
      }
      fwd.set(node.id, targets)
      for (const t of targets) {
        if (!rev.has(t)) rev.set(t, [])
        rev.get(t).push(node.id)
      }
    }
    for (const list of rev.values()) list.sort(naturalCompare)
    forward[edge.field] = fwd
    reverse[edge.field] = rev
  }

  const sn = config.sharedNeighbors
  const usersOf = new Map()
  let hub = null
  if (sn) {
    let users = 0
    for (const node of nodes) {
      const targets = forward[sn.via].get(node.id)
      if (targets.length) users += 1
      for (const x of targets) {
        if (!usersOf.has(x)) usersOf.set(x, [])
        usersOf.get(x).push(node.id)
      }
    }
    const auto = sn.hubThreshold == null
    hub = { threshold: auto ? autoHubThreshold(users) : sn.hubThreshold, auto, users }
  }
  const sharedCache = new Map()
  const shared = (id) => {
    if (!sn) return null
    if (sharedCache.has(id)) return sharedCache.get(id)
    const counts = new Map()
    const everyone = new Set()
    let hubs = 0
    for (const x of forward[sn.via].get(id) ?? []) {
      const users = usersOf.get(x) ?? []
      for (const u of users) if (u !== id) everyone.add(u)
      if (users.length >= hub.threshold) { hubs += 1; continue }
      for (const u of users) if (u !== id) counts.set(u, (counts.get(u) ?? 0) + 1)
    }
    const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1] || naturalCompare(a[0], b[0]))
    const shown = ranked.slice(0, config.k)
    const result = { shown, total: everyone.size, hubs, capped: ranked.length > config.k }
    sharedCache.set(id, result)
    return result
  }

  const warnings = []
  if (dangling.length) {
    warnings.push(`${dangling.length} edge(s) point to unknown ids and were left out (mark the edge "external": true if its targets are not nodes): ${dangling.slice(0, 5).join(', ')}${dangling.length > 5 ? ', …' : ''}`)
  }
  return { byId, notesById, forward, reverse, shared, usersOf, hub, dangling, warnings }
}
