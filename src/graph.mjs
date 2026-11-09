// Graph: read node documents, resolve typed edges, and expand neighborhoods
// (reverse edges by type and two-hop shared-intermediate neighbors with hub exclusion and a top-k cap).
import fs from 'node:fs'
import path from 'node:path'
import { FILENAME_ID } from './config.mjs'
import { FrontMatterError, readFrontMatter } from './frontmatter.mjs'
import { CairnError, globToRegExp, isInside, naturalCompare, oneLine, walkFiles } from './util.mjs'

/** Source files selected by include/exclude globs, as sorted relative paths. */
export function listSourceFiles(config) {
  const include = config.source.include.map(globToRegExp)
  const exclude = config.source.exclude.map(globToRegExp)
  const outRel = path.relative(config.sourceDir, config.outDir)
  return walkFiles(config.sourceDir).filter((rel) => {
    if (!include.some((re) => re.test(rel))) return false
    if (exclude.some((re) => re.test(rel))) return false
    if (outRel && !outRel.startsWith('..') && isInside(path.join(config.sourceDir, rel), config.outDir)) return false
    return true
  })
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
  const skipped = []
  const nodes = []
  for (const rel of files) {
    const text = fs.readFileSync(path.join(config.sourceDir, ...rel.split('/')), 'utf8')
    let parsed
    try {
      parsed = readFrontMatter(text)
    } catch (error) {
      if (error instanceof FrontMatterError) { errors.push(`${rel}: ${error.message}`); continue }
      throw error
    }
    const { data, body } = parsed
    let id
    if (config.idField === FILENAME_ID) id = path.posix.basename(rel).replace(/\.[^.]+$/, '')
    else id = oneLine(Array.isArray(data[config.idField]) ? '' : data[config.idField])
    if (!id) { skipped.push(rel); continue }
    const title = oneLine(typeof data[config.titleField] === 'string' ? data[config.titleField] : '') || id
    const description = config.descriptionField ? oneLine(typeof data[config.descriptionField] === 'string' ? data[config.descriptionField] : '') : ''
    nodes.push({ id, stem: fileStem(id), rel, data, body, title, description })
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
    warnings.push(`${skipped.length} file(s) skipped because they have no "${config.idField}" field: ${skipped.slice(0, 5).join(', ')}${skipped.length > 5 ? ', …' : ''}`)
  }
  return { nodes, skipped, warnings, fileCount: files.length }
}

/**
 * Build the expanded graph.
 * Returns { byId, forward, reverse, shared(id), usersOf, dangling, warnings }.
 *  forward[field]: Map<id, string[]>  outgoing targets in author order (deduplicated)
 *  reverse[field]: Map<id, string[]>  incoming sources, naturally sorted
 *  shared(id): { ranked: [[id, count]], total, hubs, shown, truncated, reason }
 */
export function buildGraph(config, nodes) {
  const byId = new Map(nodes.map((n) => [n.id, n]))
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
        if (!byId.has(target) && !edge.external) { dangling.push(`${node.id} -[${edge.field}]-> ${target}`); continue }
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
  if (sn) {
    for (const node of nodes) {
      for (const x of forward[sn.via].get(node.id)) {
        if (!usersOf.has(x)) usersOf.set(x, [])
        usersOf.get(x).push(node.id)
      }
    }
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
      if (users.length >= sn.hubThreshold) { hubs += 1; continue }
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
  return { byId, forward, reverse, shared, usersOf, dangling, warnings }
}
