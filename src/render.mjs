// Render: turn nodes and the expanded graph into the vault files (cards, CATALOG, INDEX, bodies, WAYFINDING).
// Pure function of its inputs: stable sorting, no timestamps, '\n' line endings.
import path from 'node:path'
import { renderWayfinding } from './guide.mjs'
import { asList } from './graph.mjs'
import { HUB_SHARE, HUB_MIN } from './config.mjs'
import { bytes, cell, clip, kb, naturalCompare, oneLine } from './util.mjs'

const MAX_LIST_ITEMS = 20
const MAX_ATTRIBUTE_VALUES = 20

const q = (s) => JSON.stringify(s)

/** "(K of N shown — reason)": the explicit truncation marker. */
export const truncationMarker = (shown, total, reason) => `(${shown} of ${total} shown — ${reason})`

function headingsOf(body, levels) {
  const out = []
  let fence = null
  for (const line of body.split('\n')) {
    const f = line.match(/^\s{0,3}(`{3,}|~{3,})/)
    if (f) {
      if (!fence) fence = f[1][0]
      else if (f[1][0] === fence) fence = null
      continue
    }
    if (fence) continue
    const m = line.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/)
    if (m && levels.includes(m[1].length)) out.push(oneLine(m[2]))
  }
  return out
}

function valueText(value) {
  if (value == null) return ''
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return oneLine(value)
  if (Array.isArray(value)) return value.map(valueText).filter(Boolean).join(', ')
  return Object.entries(value).map(([k, v]) => `${k}: ${valueText(v)}`).filter((s) => !/:\s*$/.test(s)).join('; ')
}

function cardFieldLines(label, value, maxChars) {
  if (value == null || value === '') return []
  if (Array.isArray(value)) {
    const items = value.map(valueText).filter(Boolean)
    if (!items.length) return []
    const shown = items.slice(0, MAX_LIST_ITEMS).map((t) => `- ${clip(t, maxChars)}`)
    if (items.length > MAX_LIST_ITEMS) shown.push(`- ${truncationMarker(MAX_LIST_ITEMS, items.length, `list capped at ${MAX_LIST_ITEMS}; see the body file`)}`)
    return [`## ${label}`, '', ...shown, '']
  }
  const text = valueText(value)
  return text ? [`## ${label}`, '', clip(text, maxChars), ''] : []
}

function frontValue(value) {
  if (Array.isArray(value)) return q(value.map(valueText).filter(Boolean))
  return q(valueText(value))
}

/** The kind of a node (value of config.kindField), '' when kindField is not set or the node has none. */
const kindOf = (config, node) => (config.kindField ? valueText(node.data[config.kindField]) : '')

/**
 * Which relation rows each kind of node carries. Without kindField every node is of one kind, so a row is
 * left out only when no node at all uses the edge. A forward row (and the two-hop row) is kept for a kind when
 * some node of that kind has the edge field at all, even an empty list; a reverse row is kept when some node of
 * that kind is the target of the edge.
 */
function relationRows(config, nodes, forward) {
  const uses = new Map()
  const targeted = new Map()
  const add = (map, kind, field) => {
    if (!map.has(kind)) map.set(kind, new Set())
    map.get(kind).add(field)
  }
  const kindById = new Map(nodes.map((n) => [n.id, kindOf(config, n)]))
  for (const node of nodes) {
    const kind = kindById.get(node.id)
    for (const edge of config.edges) {
      if (Object.prototype.hasOwnProperty.call(node.data, edge.field)) add(uses, kind, edge.field)
      for (const t of forward[edge.field].get(node.id)) if (kindById.has(t)) add(targeted, kindById.get(t), edge.field)
    }
  }
  return {
    forward: (kind, field) => uses.get(kind)?.has(field) ?? false,
    reverse: (kind, field) => targeted.get(kind)?.has(field) ?? false,
  }
}

/** Plan all output files. Returns { files: Map<rel, content>, counts }. */
export function planVault(config, loaded, graph) {
  const { nodes } = loaded
  const { byId, forward, reverse } = graph
  const files = new Map()
  const k = config.k
  const sn = config.sharedNeighbors
  const rows = relationRows(config, nodes, forward)
  const ref = (id) => {
    if (!config.card.titlesInRelations) return id
    const node = byId.get(id)
    return node && node.title !== id ? `${id} (${node.title})` : id
  }
  const list = (ids) => ids.map(ref).join('; ')

  for (const node of nodes) {
    const fm = ['---', `id: ${q(node.id)}`, `title: ${q(node.title)}`]
    for (const attr of config.attributes) {
      const value = node.data[attr]
      if (value == null || value === '' || (Array.isArray(value) && value.length === 0)) continue
      fm.push(`${attr}: ${frontValue(value)}`)
    }
    fm.push('---')
    const lines = [`# ${node.id} — ${node.title}`, '']
    if (node.description) lines.push(`> ${clip(node.description, config.card.maxFieldChars)}`, '')
    if (config.bodies) lines.push(`Full text: \`bodies/${node.stem}.md\``, '')
    for (const f of config.card.fields) lines.push(...cardFieldLines(f.label, node.data[f.field], config.card.maxFieldChars))
    if (config.card.headings) {
      const hs = headingsOf(node.body, config.card.headingLevels)
      if (hs.length) {
        lines.push('## Sections', '')
        hs.slice(0, config.card.maxHeadings).forEach((h, i) => lines.push(`${i + 1}. ${clip(h, 120)}`))
        if (hs.length > config.card.maxHeadings) lines.push(truncationMarker(config.card.maxHeadings, hs.length, `capped at ${config.card.maxHeadings} headings`))
        lines.push('')
      }
    }
    // Relations section, always last. Rows for edges that this kind of node never has are left out.
    const kind = kindOf(config, node)
    const rel = []
    for (const edge of config.edges) {
      if (!rows.forward(kind, edge.field)) continue
      const targets = forward[edge.field].get(node.id)
      rel.push(`- ${edge.label}: ${targets.length ? list(targets) : 'none'}`)
    }
    for (const edge of config.edges) {
      if (!edge.reverse || !rows.reverse(kind, edge.field)) continue
      const sources = reverse[edge.field].get(node.id) ?? []
      let text = 'none'
      if (sources.length) {
        text = list(sources.slice(0, k))
        if (sources.length > k) text += ` ${truncationMarker(k, sources.length, `capped at k=${k}`)}`
      }
      rel.push(`- ${edge.reverse} (reverse of ${edge.label}): ${text}`)
    }
    if (sn && rows.forward(kind, sn.via)) {
      const s = graph.shared(node.id)
      let text = 'none'
      if (s.total > 0) {
        const shown = s.shown.map(([id, n]) => `${ref(id)} ×${n}`).join('; ')
        if (s.shown.length === s.total) {
          text = shown
        } else {
          const reasons = []
          if (s.hubs) reasons.push(`${s.hubs} hub${s.hubs > 1 ? 's' : ''} skipped: ${sn.via} targets used by ≥${graph.hub.threshold} nodes`)
          if (s.capped) reasons.push(`capped at k=${k}`)
          if (!reasons.length) reasons.push('partial')
          text = `${shown || 'none shown'} ${truncationMarker(s.shown.length, s.total, reasons.join('; '))}`
        }
      }
      const viaLabel = config.edges.find((e) => e.field === sn.via).label
      rel.push(`- ${sn.label} (two hops via ${viaLabel}): ${text}`)
    }
    if (rel.length) lines.push('## Relations', '', ...rel, '')
    files.set(`cards/${node.stem}.md`, `${fm.join('\n')}\n${lines.join('\n')}`)
    if (config.bodies) {
      const body = node.body.replace(/^\s+/, '').replace(/\s+$/, '')
      files.set(`bodies/${node.stem}.md`, `# ${node.id} — ${node.title}\n\n${body}${body ? '\n' : ''}`)
    }
  }

  // CATALOG: one row per node.
  const cols = ['id', 'title', ...config.attributes, ...config.catalog.edgeColumns]
  const tableRows = nodes.map((node) => {
    const cells = [cell(node.id), cell(node.title)]
    for (const attr of config.attributes) cells.push(cell(valueText(node.data[attr])))
    for (const field of config.catalog.edgeColumns) cells.push(cell(forward[field].get(node.id).join(', ')))
    return `| ${cells.join(' | ')} |`
  })
  files.set('CATALOG.md', [
    `# Catalog (${nodes.length} nodes)`,
    '',
    'One row per node. Filter by attribute or edge column here; open `cards/<id>.md` to judge one node.',
    '',
    `| ${cols.join(' | ')} |`,
    `|${cols.map(() => '---').join('|')}|`,
    ...tableRows,
    '',
  ].join('\n'))

  // INDEX: entry point with counts and attribute values.
  const sourceLabel = path.isAbsolute(config.source.dir) ? path.basename(config.source.dir) : config.source.dir.replace(/\\/g, '/')
  const index = [
    '# Cairn vault',
    '',
    `Generated by Cairn from \`${sourceLabel}\`. Do not edit; rebuild with \`cairn build\`.`,
    '',
    '## Files',
    '',
    `- \`CATALOG.md\`: attribute table, one row per node (${nodes.length} rows)`,
    `- \`cards/<id>.md\`: compact card per node (${nodes.length})`,
  ]
  if (config.bodies) index.push(`- \`bodies/<id>.md\`: full text per node (${nodes.length})`)
  index.push('- `WAYFINDING.md`: where to look first, by question type', '')
  if (config.attributes.length) {
    index.push('## Attribute values', '')
    for (const attr of config.attributes) {
      const counts = new Map()
      for (const node of nodes) for (const v of asList(node.data[attr]).map(oneLine).filter(Boolean)) counts.set(v, (counts.get(v) ?? 0) + 1)
      const values = [...counts.entries()].sort((a, b) => b[1] - a[1] || naturalCompare(a[0], b[0]))
      let text = values.slice(0, MAX_ATTRIBUTE_VALUES).map(([v, n]) => `${v} (${n})`).join(', ') || 'none'
      if (values.length > MAX_ATTRIBUTE_VALUES) text += ` ${truncationMarker(MAX_ATTRIBUTE_VALUES, values.length, 'most frequent first; all values in CATALOG.md')}`
      index.push(`- ${attr}: ${text}`)
    }
    index.push('')
  }
  if (config.edges.length) {
    index.push('## Edges', '')
    for (const edge of config.edges) {
      let total = 0
      for (const targets of forward[edge.field].values()) total += targets.length
      index.push(`- ${edge.field} (${edge.label}${edge.reverse ? `; reverse: ${edge.reverse}` : ''}${edge.external ? '; external targets' : ''}): ${total}`)
    }
    if (sn) {
      const how = graph.hub.auto ? `automatic: ${Math.round(HUB_SHARE * 100)}% of the ${graph.hub.users} nodes that use ${sn.via}, at least ${HUB_MIN}` : 'set in the config'
      index.push(`- two-hop: ${sn.label} via ${sn.via} (hubs: targets used by ≥${graph.hub.threshold} nodes, ${how}; k=${k})`)
    }
    index.push('')
  }
  files.set('INDEX.md', index.join('\n'))
  files.set('WAYFINDING.md', renderWayfinding(config))

  const sorted = new Map([...files.entries()].sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0)))
  return {
    files: sorted,
    counts: { nodes: nodes.length, cards: nodes.length, bodies: config.bodies ? nodes.length : 0, catalogRows: tableRows.length },
  }
}

/** Files over their size target: [{ rel, bytes, limit, kind }]. */
export function oversized(config, files) {
  const over = []
  for (const [rel, content] of files) {
    let limit = null
    let kind = null
    if (rel.startsWith('cards/')) { limit = config.card.maxBytes; kind = 'card' }
    else if (rel === 'CATALOG.md') { limit = config.catalog.maxBytes; kind = 'catalog' }
    else if (rel === 'INDEX.md') { limit = config.index.maxBytes; kind = 'index' }
    if (limit === null) continue
    const n = bytes(content)
    if (n > limit) over.push({ rel, bytes: n, limit, kind })
  }
  return over
}

/** Actual sizes against the targets: { card: { rel, bytes, limit } | null, catalog, index }. */
export function sizeReport(config, files) {
  let card = null
  for (const [rel, content] of files) {
    if (!rel.startsWith('cards/')) continue
    const n = bytes(content)
    if (!card || n > card.bytes) card = { rel, bytes: n, limit: config.card.maxBytes }
  }
  const one = (rel, limit) => (files.has(rel) ? { rel, bytes: bytes(files.get(rel)), limit } : null)
  return { card, catalog: one('CATALOG.md', config.catalog.maxBytes), index: one('INDEX.md', config.index.maxBytes) }
}

/** "largest card 2.9KB of 3.0KB (cards/x.md), CATALOG 6.1KB of 8.0KB, INDEX 1.2KB of 4.0KB" */
export function describeSizes(sizes) {
  const parts = []
  if (sizes.card) parts.push(`largest card ${kb(sizes.card.bytes)} of ${kb(sizes.card.limit)} (${sizes.card.rel})`)
  if (sizes.catalog) parts.push(`CATALOG ${kb(sizes.catalog.bytes)} of ${kb(sizes.catalog.limit)}`)
  if (sizes.index) parts.push(`INDEX ${kb(sizes.index.bytes)} of ${kb(sizes.index.limit)}`)
  return parts.join(', ')
}
