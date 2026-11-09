// Reverse edges, two-hop shared neighbors, hub exclusion, the top-k cap, and the truncation marker.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { test } from 'node:test'
import { build, plan } from '../src/build.mjs'
import { loadConfig } from '../src/config.mjs'
import { EXAMPLE_DIR, makeConfig, readCard, relationLine, tempDir, writeKb } from './helpers.mjs'

// A -> B (depends_on); A <-> C (related); A, B cite E1; A, C cite E2; D, E, F cite HUB (3 users = hub at threshold 3).
const GRAPH = [
  { id: 'A', edges: { depends_on: ['B'], related: ['C'], evidence: ['E1', 'E2'] } },
  { id: 'B', edges: { evidence: ['E1'] } },
  { id: 'C', edges: { related: ['A'], evidence: ['E2'] } },
  { id: 'D', edges: { depends_on: ['B'], evidence: ['HUB'] } },
  { id: 'E', edges: { depends_on: ['B'], evidence: ['HUB'] } },
  { id: 'F', edges: { evidence: ['HUB'] } },
  { id: 'G' },
  { id: 'E1', title: 'Evidence one' },
  { id: 'E2', title: 'Evidence two' },
  { id: 'HUB', title: 'Hub evidence' },
]

function setup(t, overrides = {}) {
  const dir = tempDir(t)
  writeKb(dir, GRAPH)
  const config = makeConfig(dir, overrides)
  build(config)
  return config
}

test('reverse edges are written on the target card, by type', (t) => {
  const config = setup(t)
  assert.equal(relationLine(readCard(config, 'B'), 'Used by'), 'A (Title of A); D (Title of D); E (Title of E)')
  assert.equal(relationLine(readCard(config, 'A'), 'Related from'), 'C (Title of C)')
  assert.equal(relationLine(readCard(config, 'C'), 'Related from'), 'A (Title of A)')
  assert.equal(relationLine(readCard(config, 'E1'), 'Evidence for'), 'A (Title of A); B (Title of B)')
  // Forward edges stay as written.
  assert.equal(relationLine(readCard(config, 'A'), 'Depends on:'), 'B (Title of B)')
  assert.equal(relationLine(readCard(config, 'A'), 'Evidence:'), 'E1 (Evidence one); E2 (Evidence two)')
})

test('two-hop shared neighbors go through a shared intermediate node', (t) => {
  const config = setup(t)
  assert.equal(relationLine(readCard(config, 'A'), 'Shares evidence with'), 'B (Title of B) ×1; C (Title of C) ×1')
  assert.equal(relationLine(readCard(config, 'B'), 'Shares evidence with'), 'A (Title of A) ×1')
  assert.equal(relationLine(readCard(config, 'C'), 'Shares evidence with'), 'A (Title of A) ×1')
})

test('neighbors ranked by the number of shared intermediates', (t) => {
  const dir = tempDir(t)
  writeKb(dir, [
    { id: 'P', edges: { evidence: ['X1', 'X2'] } },
    { id: 'Q', edges: { evidence: ['X1'] } },
    { id: 'R', edges: { evidence: ['X1', 'X2'] } },
    { id: 'X1' },
    { id: 'X2' },
  ])
  const config = makeConfig(dir, { sharedNeighbors: { via: 'evidence', hubThreshold: 5 } })
  build(config)
  assert.equal(relationLine(readCard(config, 'P'), 'Shares evidence with'), 'R (Title of R) ×2; Q (Title of Q) ×1')
})

test('hub intermediates are skipped and the list is marked as truncated', (t) => {
  const config = setup(t)
  // D's only intermediate is HUB (used by D, E, F >= threshold 3): neighbors exist but none are shown.
  assert.equal(
    relationLine(readCard(config, 'D'), 'Shares evidence with'),
    'none shown (0 of 2 shown — 1 hub skipped: evidence targets used by ≥3 nodes)',
  )
})

test('the top-k cap applies to reverse and shared lists and states the full count', (t) => {
  const config = setup(t, { k: 2 })
  assert.equal(relationLine(readCard(config, 'B'), 'Used by'), 'A (Title of A); D (Title of D) (2 of 3 shown — capped at k=2)')
  const dir = tempDir(t)
  writeKb(dir, [
    { id: 'N0', edges: { evidence: ['S'] } },
    { id: 'N1', edges: { evidence: ['S'] } },
    { id: 'N2', edges: { evidence: ['S'] } },
    { id: 'N3', edges: { evidence: ['S'] } },
    { id: 'S' },
  ])
  const c2 = makeConfig(dir, { k: 2, sharedNeighbors: { via: 'evidence', hubThreshold: 10 } })
  build(c2)
  assert.equal(relationLine(readCard(c2, 'N0'), 'Shares evidence with'), 'N1 (Title of N1) ×1; N2 (Title of N2) ×1 (2 of 3 shown — capped at k=2)')
})

test('"none" appears only when no neighbor exists', (t) => {
  const config = setup(t)
  const g = readCard(config, 'G')
  for (const label of ['Depends on:', 'Related:', 'Evidence:', 'Used by', 'Related from', 'Evidence for', 'Shares evidence with']) {
    assert.equal(relationLine(g, label), 'none', label)
  }
  // D has hub-only neighbors: not "none".
  assert.notEqual(relationLine(readCard(config, 'D'), 'Shares evidence with'), 'none')
})

/** The value of a relation row, or null when the card leaves the row out. */
const rowOf = (card, label) => {
  const line = card.split('\n').find((l) => l.startsWith(`- ${label}`))
  return line ? line.slice(line.indexOf(': ') + 2) : null
}

test('"none" only when truly none, on every card of the example', () => {
  const config = loadConfig(path.join(EXAMPLE_DIR, 'cairn.config.json'))
  const { files, graph } = plan(config)
  let checked = 0
  let omitted = 0
  for (const [id] of graph.byId) {
    const card = files.get(`cards/${id}.md`)
    for (const edge of config.edges) {
      const fwd = graph.forward[edge.field].get(id)
      const f = rowOf(card, `${edge.label}:`)
      // A row may be left out (kindField: this kind never uses the edge), but then the node has no such edge.
      if (f === null) { omitted += 1; assert.equal(fwd.length, 0, `${id} ${edge.label} omitted`) } else assert.equal(f === 'none', fwd.length === 0, `${id} ${edge.label}`)
      if (edge.reverse) {
        const rev = graph.reverse[edge.field].get(id) ?? []
        const r = rowOf(card, edge.reverse)
        if (r === null) { omitted += 1; assert.equal(rev.length, 0, `${id} ${edge.reverse} omitted`) } else assert.equal(r === 'none', rev.length === 0, `${id} ${edge.reverse}`)
      }
      checked += 1
    }
    const s = graph.shared(id)
    const line = rowOf(card, config.sharedNeighbors.label)
    if (line === null) { assert.equal(s.total, 0, `${id} shared omitted`); continue }
    assert.equal(line === 'none', s.total === 0, `${id} shared`)
    // A truncation marker appears exactly when fewer than all neighbors are shown.
    assert.equal(/\(\d+ of \d+ shown — /.test(line), s.shown.length < s.total, `${id} marker`)
  }
  assert.ok(checked > 0)
  assert.ok(omitted > 0, 'the example sets kindField, so design-doc cards leave out module-only rows')
})

test('kindField: cards leave out rows that a kind never uses and keep "none" for used but empty edges', (t) => {
  const dir = tempDir(t)
  writeKb(dir, [
    { id: 'M1', attrs: { kind: 'module' }, edges: { depends_on: ['M2'], evidence: ['D1'] } },
    { id: 'M2', attrs: { kind: 'module' }, edges: { depends_on: [], evidence: ['D1'] } },
    { id: 'D1', attrs: { kind: 'doc' }, edges: { related: [] } },
  ])
  const config = makeConfig(dir, { kindField: 'kind', sharedNeighbors: { via: 'evidence', hubThreshold: 5 } })
  build(config)
  const d1 = readCard(config, 'D1')
  assert.equal(rowOf(d1, 'Related:'), 'none', 'docs carry the related field, even empty')
  assert.equal(rowOf(d1, 'Depends on:'), null, 'no doc has depends_on')
  assert.equal(rowOf(d1, 'Used by'), null, 'no doc is depended on')
  assert.equal(rowOf(d1, 'Shares evidence with'), null, 'docs do not use the via edge')
  assert.equal(rowOf(d1, 'Evidence for'), 'M1 (Title of M1); M2 (Title of M2)')
  const m2 = readCard(config, 'M2')
  assert.equal(rowOf(m2, 'Depends on:'), 'none', 'modules use depends_on; M2 has none')
  assert.equal(rowOf(m2, 'Used by'), 'M1 (Title of M1)')
  assert.equal(rowOf(m2, 'Related:'), null, 'no module has related')
  assert.equal(rowOf(m2, 'Evidence for'), null, 'no module is evidence')
  assert.equal(rowOf(m2, 'Shares evidence with'), 'M1 (Title of M1) ×1')
  assert.match(fs.readFileSync(path.join(config.outDir, 'WAYFINDING.md'), 'utf8'), /Rows for relations that no node of the same kind has are left out\./)
  // Without kindField every row stays.
  const all = makeConfig(dir, { sharedNeighbors: { via: 'evidence', hubThreshold: 5 }, output: 'vault2' })
  build(all)
  assert.equal(rowOf(readCard(all, 'D1'), 'Depends on:'), 'none')
})

test('hubThreshold left out is automatic: 25% of the nodes that use the via edge, at least 3', (t) => {
  const dir = tempDir(t)
  // 12 nodes use evidence; S1 is cited by 4 of them (>= ceil(0.25 * 12) = 3 is a hub), S2 by 2.
  const nodes = []
  for (let i = 0; i < 12; i += 1) nodes.push({ id: `N${String(i).padStart(2, '0')}`, edges: { evidence: i < 4 ? ['S1'] : i < 6 ? ['S2'] : [`U${i}`] } })
  nodes.push({ id: 'S1' }, { id: 'S2' })
  for (let i = 6; i < 12; i += 1) nodes.push({ id: `U${i}` })
  writeKb(dir, nodes)
  const config = makeConfig(dir, { sharedNeighbors: { via: 'evidence' } })
  const { graph } = plan(config)
  assert.deepEqual(graph.hub, { threshold: 3, auto: true, users: 12 })
  build(config)
  assert.match(relationLine(readCard(config, 'N00'), 'Shares evidence with'), /^none shown \(0 of 3 shown — 1 hub skipped: evidence targets used by ≥3 nodes\)$/)
  assert.equal(relationLine(readCard(config, 'N04'), 'Shares evidence with'), 'N05 (Title of N05) ×1')
  assert.match(fs.readFileSync(path.join(config.outDir, 'INDEX.md'), 'utf8'), /hubs: targets used by ≥3 nodes, automatic: 25% of the 12 nodes that use evidence, at least 3/)
  // With 40 users the threshold is ceil(0.25 * 40) = 10; an explicit value wins.
  const big = Array.from({ length: 40 }, (_, i) => ({ id: `B${i}`, edges: { evidence: ['X'] } }))
  const dir2 = tempDir(t)
  writeKb(dir2, [...big, { id: 'X' }])
  assert.equal(plan(makeConfig(dir2, { sharedNeighbors: { via: 'evidence' } })).graph.hub.threshold, 10)
  assert.equal(plan(makeConfig(dir2, { sharedNeighbors: { via: 'evidence', hubThreshold: 50 } })).graph.hub.threshold, 50)
})

test('external edge targets need not be nodes and can still be shared intermediates', (t) => {
  const dir = tempDir(t)
  writeKb(dir, [
    { id: 'P1', edges: { datasets: ['ImageSet-A', 'TextSet-B'] } },
    { id: 'P2', edges: { datasets: ['ImageSet-A'] } },
    { id: 'P3', edges: { datasets: ['Unrelated'] } },
  ])
  const config = makeConfig(dir, {
    attributes: [],
    edges: [{ field: 'datasets', label: 'Datasets', external: true }],
    sharedNeighbors: { via: 'datasets', label: 'Shares a dataset with', hubThreshold: 5 },
  })
  const res = build(config)
  assert.deepEqual(res.warnings, [])
  assert.equal(relationLine(readCard(config, 'P1'), 'Datasets:'), 'ImageSet-A; TextSet-B')
  assert.equal(relationLine(readCard(config, 'P1'), 'Shares a dataset with'), 'P2 (Title of P2) ×1')
  assert.equal(relationLine(readCard(config, 'P3'), 'Shares a dataset with'), 'none')
})

test('edges to unknown ids are dropped with a warning; wikilinks and .md paths are normalized', (t) => {
  const dir = tempDir(t)
  writeKb(dir, [
    { id: 'A', edges: { depends_on: ['"[[B|the B note]]"', 'missing-node', 'notes/C.md'] } },
    { id: 'B' },
    { id: 'C' },
  ])
  const config = makeConfig(dir, { sharedNeighbors: null })
  const res = build(config)
  assert.equal(relationLine(readCard(config, 'A'), 'Depends on:'), 'B (Title of B); C (Title of C)')
  assert.ok(res.warnings.some((w) => w.includes('A -[depends_on]-> missing-node')), res.warnings.join('\n'))
})
