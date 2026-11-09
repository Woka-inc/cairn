// Reverse edges, two-hop shared neighbors, hub exclusion, the top-k cap, and the truncation marker.
import assert from 'node:assert/strict'
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

test('"none" only when truly none, on every card of the example', () => {
  const config = loadConfig(path.join(EXAMPLE_DIR, 'cairn.config.json'))
  const { files, graph } = plan(config)
  let checked = 0
  for (const [id] of graph.byId) {
    const card = files.get(`cards/${id}.md`)
    for (const edge of config.edges) {
      const fwd = graph.forward[edge.field].get(id)
      assert.equal(relationLine(card, `${edge.label}:`) === 'none', fwd.length === 0, `${id} ${edge.label}`)
      if (edge.reverse) {
        const rev = graph.reverse[edge.field].get(id) ?? []
        assert.equal(relationLine(card, edge.reverse) === 'none', rev.length === 0, `${id} ${edge.reverse}`)
      }
      checked += 1
    }
    const s = graph.shared(id)
    const line = relationLine(card, config.sharedNeighbors.label)
    assert.equal(line === 'none', s.total === 0, `${id} shared`)
    // A truncation marker appears exactly when fewer than all neighbors are shown.
    assert.equal(/\(\d+ of \d+ shown — /.test(line), s.shown.length < s.total, `${id} marker`)
  }
  assert.ok(checked > 0)
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
