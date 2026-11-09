#!/usr/bin/env node
// Compare two configurations (e.g. a baseline and Cairn) on the same fixed question set.
// Reads a generic JSONL file of runs; no account, provider, or tool is assumed.
//
// One JSON object per line:
//   { "question": "Q-01", "arm": "baseline", "tokens": 31234, "cost_usd": 0.041, "requests": 3,
//     "type": "relation", "run": 1, "recall": 1 }
// Required: question, arm. Metrics are any numeric fields you pass with --metrics.
// Several runs per question and arm are averaged first; the change is the ratio of the means
// of per-question means minus 1, with a percentile CI from a paired bootstrap over questions.
//
//   node scripts/measure.mjs runs.jsonl --baseline baseline --treatment cairn
//        [--metrics tokens,cost_usd,requests] [--by type] [--resamples 10000] [--seed 20261013] [--json]
import fs from 'node:fs'
import { pathToFileURL } from 'node:url'
import { parseArgs } from 'node:util'

/** Deterministic PRNG (mulberry32). */
export function rng(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function parseRuns(text) {
  const runs = []
  text.split(/\r?\n/).forEach((line, i) => {
    if (!line.trim()) return
    let obj
    try {
      obj = JSON.parse(line)
    } catch {
      throw new Error(`line ${i + 1}: not valid JSON`)
    }
    if (typeof obj.question !== 'string' || typeof obj.arm !== 'string') throw new Error(`line ${i + 1}: "question" and "arm" must be strings`)
    runs.push(obj)
  })
  return runs
}

const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length

function quantile(sorted, p) {
  const idx = (sorted.length - 1) * p
  const lo = Math.floor(idx)
  const hi = Math.ceil(idx)
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo)
}

/**
 * Paired comparison for one metric.
 * Returns { questions, runsPerArm, baseline, treatment, change, ci: [lo, hi], unpaired }.
 */
export function compare(runs, { baseline, treatment, metric, resamples = 10000, seed = 20261013, filter = () => true }) {
  const per = new Map() // question -> { b: [], t: [] }
  for (const r of runs) {
    if (!filter(r)) continue
    if (r.arm !== baseline && r.arm !== treatment) continue
    const v = r[metric]
    if (typeof v !== 'number' || !Number.isFinite(v)) continue
    if (!per.has(r.question)) per.set(r.question, { b: [], t: [] })
    per.get(r.question)[r.arm === baseline ? 'b' : 't'].push(v)
  }
  const paired = [...per.entries()].filter(([, x]) => x.b.length && x.t.length).sort((a, b) => (a[0] < b[0] ? -1 : 1))
  const unpaired = [...per.entries()].filter(([, x]) => !x.b.length || !x.t.length).map(([q]) => q).sort()
  if (!paired.length) return { questions: 0, unpaired, change: null, ci: null }
  const b = paired.map(([, x]) => mean(x.b))
  const t = paired.map(([, x]) => mean(x.t))
  const change = mean(t) / mean(b) - 1
  const next = rng(seed)
  const n = paired.length
  const draws = new Array(resamples)
  for (let r = 0; r < resamples; r += 1) {
    let sb = 0
    let st = 0
    for (let i = 0; i < n; i += 1) {
      const j = Math.floor(next() * n)
      sb += b[j]
      st += t[j]
    }
    draws[r] = st / sb - 1
  }
  draws.sort((x, y) => x - y)
  return {
    questions: n,
    runsPerArm: { baseline: paired.reduce((a, [, x]) => a + x.b.length, 0), treatment: paired.reduce((a, [, x]) => a + x.t.length, 0) },
    baseline: mean(b),
    treatment: mean(t),
    change,
    ci: [quantile(draws, 0.025), quantile(draws, 0.975)],
    unpaired,
  }
}

const pct = (x) => `${x >= 0 ? '+' : '−'}${Math.abs(x * 100).toFixed(1)}%`
const num = (x) => (Math.abs(x) >= 100 ? x.toFixed(0) : x.toPrecision(4))

function main(argv) {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      baseline: { type: 'string' },
      treatment: { type: 'string' },
      metrics: { type: 'string', default: 'tokens,cost_usd,requests' },
      by: { type: 'string' },
      resamples: { type: 'string', default: '10000' },
      seed: { type: 'string', default: '20261013' },
      json: { type: 'boolean', default: false },
    },
  })
  if (positionals.length !== 1 || !values.baseline || !values.treatment) {
    process.stderr.write('usage: node scripts/measure.mjs runs.jsonl --baseline <arm> --treatment <arm> [--metrics a,b] [--by field] [--resamples N] [--seed N] [--json]\n')
    return 2
  }
  const runs = parseRuns(fs.readFileSync(positionals[0], 'utf8'))
  const opts = { baseline: values.baseline, treatment: values.treatment, resamples: Number(values.resamples), seed: Number(values.seed) }
  const metrics = values.metrics.split(',').map((s) => s.trim()).filter(Boolean)
  const groups = [['all', () => true]]
  if (values.by) {
    const keys = [...new Set(runs.map((r) => r[values.by]).filter((v) => v != null))].map(String).sort()
    for (const k of keys) groups.push([`${values.by}=${k}`, (r) => String(r[values.by]) === k])
  }
  const results = []
  for (const metric of metrics) for (const [group, filter] of groups) results.push({ metric, group, ...compare(runs, { ...opts, metric, filter }) })
  if (values.json) {
    process.stdout.write(`${JSON.stringify(results, null, 2)}\n`)
    return 0
  }
  process.stdout.write(`${values.treatment} vs ${values.baseline}: ratio of means − 1, 95% paired-bootstrap CI over questions (${opts.resamples} resamples, seed ${opts.seed})\n\n`)
  process.stdout.write('metric       group                 n   baseline     treatment    change    95% CI\n')
  for (const r of results) {
    if (r.change === null) {
      process.stdout.write(`${r.metric.padEnd(12)} ${r.group.padEnd(20)} 0   (no paired questions)\n`)
      continue
    }
    process.stdout.write(`${r.metric.padEnd(12)} ${r.group.padEnd(20)} ${String(r.questions).padEnd(3)} ${num(r.baseline).padEnd(12)} ${num(r.treatment).padEnd(12)} ${pct(r.change).padEnd(9)} [${pct(r.ci[0])}, ${pct(r.ci[1])}]\n`)
  }
  const unpaired = [...new Set(results.flatMap((r) => r.unpaired ?? []))]
  if (unpaired.length) process.stdout.write(`\nleft out (not run in both arms): ${unpaired.join(', ')}\n`)
  return 0
}

const direct = Boolean(process.argv[1]) && import.meta.url === pathToFileURL(fs.realpathSync(process.argv[1])).href
if (direct) {
  try {
    process.exitCode = main(process.argv.slice(2))
  } catch (error) {
    process.stderr.write(`measure: ${error.message}\n`)
    process.exitCode = 1
  }
}
