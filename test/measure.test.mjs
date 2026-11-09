// The measurement helper: ratio of means over paired questions and a deterministic bootstrap CI.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { compare, parseRuns, rng } from '../scripts/measure.mjs'

const RUNS = [
  { question: 'Q1', arm: 'base', tokens: 100 }, { question: 'Q1', arm: 'base', tokens: 120 },
  { question: 'Q1', arm: 'cairn', tokens: 60 },
  { question: 'Q2', arm: 'base', tokens: 200 }, { question: 'Q2', arm: 'cairn', tokens: 180 },
  { question: 'Q3', arm: 'base', tokens: 300 }, { question: 'Q3', arm: 'cairn', tokens: 150 },
  { question: 'Q4', arm: 'base', tokens: 50 },
]

test('change is the ratio of means of per-question means, minus 1', () => {
  const r = compare(RUNS, { baseline: 'base', treatment: 'cairn', metric: 'tokens', resamples: 2000 })
  assert.equal(r.questions, 3)
  assert.deepEqual(r.unpaired, ['Q4'])
  assert.equal(r.baseline, (110 + 200 + 300) / 3)
  assert.equal(r.treatment, (60 + 180 + 150) / 3)
  assert.ok(Math.abs(r.change - (390 / 610 - 1)) < 1e-12)
  assert.ok(r.ci[0] <= r.change && r.change <= r.ci[1])
})

test('the bootstrap is deterministic for a given seed', () => {
  const a = compare(RUNS, { baseline: 'base', treatment: 'cairn', metric: 'tokens', seed: 1, resamples: 500 })
  const b = compare(RUNS, { baseline: 'base', treatment: 'cairn', metric: 'tokens', seed: 1, resamples: 500 })
  assert.deepEqual(a.ci, b.ci)
  const g = rng(42)
  const xs = Array.from({ length: 5 }, () => g())
  assert.ok(xs.every((x) => x >= 0 && x < 1))
})

test('parseRuns validates each line', () => {
  assert.equal(parseRuns('{"question":"Q1","arm":"a"}\n\n').length, 1)
  assert.throws(() => parseRuns('{"question":1,"arm":"a"}'), /line 1/)
  assert.throws(() => parseRuns('not json'), /line 1: not valid JSON/)
})
