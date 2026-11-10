// Views: output paths (layout) and the data that templates see for each generated file.
// Everything here is derived from the nodes, the intermediate notes, and the expanded graph; nothing is rendered.
import { ATTRIBUTE_NAME_UNSAFE } from './config.mjs'
import { asList } from './graph.mjs'
import { CairnError, naturalCompare, oneLine } from './util.mjs'

/** Replace {name} placeholders that have a value; leave the others. */
export const fillPath = (pattern, vars) => pattern.replace(/\{(\w+)\}/g, (m, key) => (Object.prototype.hasOwnProperty.call(vars, key) ? vars[key] : m))
const noExt = (rel) => rel.replace(/\.md$/, '')

/** A regular expression that matches the paths a pattern such as "cards/{stem}.md" produces. */
export function patternRegExp(pattern) {
  const parts = pattern.split(/(\{\w+\})/).map((p) => (/^\{\w+\}$/.test(p) ? '[^/]+' : p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  return new RegExp(`^${parts.join('')}$`)
}

export const cardPath = (config, node) => fillPath(config.layout.cards, { stem: node.stem, id: node.stem })
export const bodyPath = (config, node) => fillPath(config.layout.bodies, { stem: node.stem, id: node.stem })
export const notePath = (config, note) => fillPath(config.sharedNeighbors.notes.path, { stem: note.stem, id: note.stem })
/** Attribute-note file-name part for a value: characters unsafe in file names or wikilinks become "-". */
export const attributeValueName = (value) => oneLine(value).replace(ATTRIBUTE_NAME_UNSAFE, '-').replace(/^\.+/, '_')

/**
 * Attribute notes: for each configured attribute, the notes (one per value) and each node's memberships.
 * Returns { groups: [{ field, label, notes: [{ value, path, target, ids }] }], byNode: Map<id, [{ field, label, value, path, target }]>, warnings }.
 */
export function attributeGroups(config, nodes) {
  const spec = config.attributeNotes
  const byNode = new Map(nodes.map((n) => [n.id, []]))
  const warnings = []
  if (!spec) return { groups: [], byNode, warnings }
  const groups = []
  for (const attr of spec.attributes) {
    const byPath = new Map()
    for (const node of nodes) {
      for (const value of asList(node.data[attr.field]).map(oneLine).filter(Boolean)) {
        const rel = fillPath(spec.path, { attribute: attributeValueName(attr.field), value: attributeValueName(value) })
        if (!byPath.has(rel)) byPath.set(rel, { value, path: rel, target: noExt(rel), ids: [] })
        const note = byPath.get(rel)
        if (note.value !== value) warnings.push(`attribute values "${note.value}" and "${value}" of ${attr.field} share the note ${rel}`)
        if (!note.ids.includes(node.id)) note.ids.push(node.id)
        byNode.get(node.id).push({ field: attr.field, attribute: attr.field, label: attr.label, value: note.value, path: rel, target: note.target })
      }
    }
    const notes = [...byPath.values()].sort((a, b) => naturalCompare(a.path, b.path))
    for (const note of notes) note.ids.sort(naturalCompare)
    groups.push({ field: attr.field, attribute: attr.field, label: attr.label, notes })
  }
  return { groups, byNode, warnings: [...new Set(warnings)] }
}

/**
 * The view factory. nodeView(id) is what a card, body, CATALOG row, or attribute-note member sees:
 *  { id, stem, name, title, description, data, body, headings, kind, path, target, cardPath, cardTarget,
 *    bodyPath, bodyTarget, relations: { <edge field>: { label, reverse: {...} | null, items } }, shared, attributeNotes }
 */
export function makeViews(config, loaded, graph, attrs, headingsOf, kindOf) {
  const { byId, notesById, forward, reverse } = graph
  const k = config.k
  const sn = config.sharedNeighbors
  const viaNotes = Boolean(sn?.notes)

  const nodeRef = (id) => {
    const n = byId.get(id)
    const card = cardPath(config, n)
    const ref = { id: n.id, stem: n.stem, name: n.name, title: n.title, description: n.description, path: card, target: noExt(card), cardPath: card, cardTarget: noExt(card), bodyPath: '', bodyTarget: '' }
    if (config.bodies) { const b = bodyPath(config, n); ref.bodyPath = b; ref.bodyTarget = noExt(b) }
    return ref
  }
  const noteRef = (id) => {
    const n = notesById.get(id)
    const rel = notePath(config, n)
    // Every reference carries every key, so a template never falls back to the enclosing node's values.
    return { id: n.id, stem: n.stem, name: n.name, title: n.title, description: '', path: rel, target: noExt(rel), cardPath: '', cardTarget: '', bodyPath: '', bodyTarget: '' }
  }
  /** A target of an edge: a node, an intermediate note, or (for an external edge) a bare id. */
  const targetRef = (field, id) => {
    if (viaNotes && field === sn.via) return noteRef(id)
    if (byId.has(id)) return nodeRef(id)
    return { id, stem: id, name: '', title: id, description: '', path: '', target: id, cardPath: '', cardTarget: '', bodyPath: '', bodyTarget: '' }
  }

  const cache = new Map()
  const nodeView = (id) => {
    if (cache.has(id)) return cache.get(id)
    const n = byId.get(id)
    const relations = {}
    for (const edge of config.edges) {
      const items = forward[edge.field].get(id).map((t) => targetRef(edge.field, t))
      let rev = null
      if (!(viaNotes && edge.field === sn.via)) {
        const all = (reverse[edge.field].get(id) ?? []).map(nodeRef)
        rev = { label: edge.reverse ?? '', all, items: all.slice(0, k), total: all.length, shown: Math.min(all.length, k), truncated: all.length > k }
      }
      relations[edge.field] = { field: edge.field, label: edge.label, reverseLabel: edge.reverse ?? '', external: edge.external, items, reverse: rev }
    }
    let shared = null
    if (sn) {
      const s = graph.shared(id)
      const items = s.shown.map(([other, count]) => ({ ...nodeRef(other), count }))
      shared = { label: sn.label, via: sn.via, items, total: s.total, shown: items.length, hubs: s.hubs, capped: s.capped, truncated: items.length < s.total, threshold: graph.hub.threshold, k }
    }
    const ref = nodeRef(id)
    const view = {
      ...ref,
      data: n.data,
      body: n.body,
      headings: headingsOf(n.body, config.card.headingLevels),
      kind: kindOf(config, n),
      relations,
      shared,
      attributeNotes: attrs.byNode.get(id) ?? [],
    }
    cache.set(id, view)
    return view
  }

  const noteView = (id) => {
    const n = notesById.get(id)
    const users = [...(graph.usersOf.get(id) ?? [])].sort(naturalCompare).map(nodeRef)
    return { note: { ...noteRef(id), raw: n.raw, body: n.body, data: n.data }, users, via: sn.via, label: sn.label }
  }

  return { nodeRef, noteRef, nodeView, noteView }
}

/** Fail when two generated files would land on the same path. */
export function assertNoCollision(taken, rel, what) {
  // Compared without case: on case-insensitive file systems (macOS, Windows) "A.md" and "a.md" are one file.
  const key = rel.toLowerCase()
  if (taken.has(key)) throw new CairnError(`two generated files map to ${rel} (${what}; also ${taken.get(key)}); change layout, sharedNeighbors.notes.path, or attributeNotes.path`)
  taken.set(key, what)
}
