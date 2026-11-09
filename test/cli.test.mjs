// CLI: commands, exit codes, and init proposals.
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { test } from 'node:test'
import { proposeConfig } from '../src/init.mjs'
import { EXAMPLE_DIR, ROOT, tempDir, writeKb } from './helpers.mjs'

const BIN = path.join(ROOT, 'bin', 'cairn.mjs')
const run = (args, cwd) => spawnSync(process.execPath, [BIN, ...args], { cwd, encoding: 'utf8' })

function project(t) {
  const dir = tempDir(t)
  writeKb(dir, [{ id: 'A', attrs: { tier: 'gold' }, edges: { depends_on: ['B'] } }, { id: 'B', attrs: { tier: 'silver' } }])
  fs.writeFileSync(path.join(dir, 'cairn.config.json'), JSON.stringify({ source: { dir: 'kb' }, attributes: ['tier'], edges: [{ field: 'depends_on', reverse: 'Used by' }] }))
  return dir
}

test('build, check, and guide --write', (t) => {
  const dir = project(t)
  const b = run(['build'], dir)
  assert.equal(b.status, 0, b.stderr)
  assert.match(b.stdout, /built cairn-vault .*2 cards, 2 catalog rows, 2 bodies/)
  assert.equal(run(['build', '--if-stale'], dir).stdout.trim(), 'cairn: vault is up to date (cairn-vault)')
  const c = run(['check'], dir)
  assert.equal(c.status, 0, c.stdout)
  assert.match(c.stdout, /cairn check: passed/)
  fs.writeFileSync(path.join(dir, 'CLAUDE.md'), '# Project\n')
  const g = run(['guide', '--write', 'CLAUDE.md'], dir)
  assert.equal(g.status, 0, g.stderr)
  assert.match(fs.readFileSync(path.join(dir, 'CLAUDE.md'), 'utf8'), /^# Project\n\n<!-- cairn:wayfinding:start -->/)
  assert.match(run(['guide', '--write', 'CLAUDE.md'], dir).stdout, /unchanged/)
})

test('check fails with exit 1 when the vault is stale', (t) => {
  const dir = project(t)
  run(['build'], dir)
  fs.appendFileSync(path.join(dir, 'kb', 'A.md'), '\nmore\n')
  const c = run(['check'], dir)
  assert.equal(c.status, 1)
  assert.match(c.stdout, /FAIL {2}stale: source files changed/)
})

test('config errors exit 2 and list every problem', (t) => {
  const dir = tempDir(t)
  fs.writeFileSync(path.join(dir, 'cairn.config.json'), JSON.stringify({ source: { dir: 'missing' }, k: -1 }))
  const r = run(['build'], dir)
  assert.equal(r.status, 2)
  assert.match(r.stderr, /invalid config cairn\.config\.json \(2 problems\)/)
  assert.match(r.stderr, / {2}- k: must be an integer >= 1/)
  assert.match(r.stderr, / {2}- source\.dir: folder not found/)
})

test('unknown commands and options exit 2', (t) => {
  const dir = tempDir(t)
  assert.equal(run(['frobnicate'], dir).status, 2)
  assert.equal(run(['build', '--nope'], dir).status, 2)
  assert.equal(run(['--help'], dir).status, 0)
})

test('init proposes a config from the example knowledge base', () => {
  const { config, report } = proposeConfig(path.join(EXAMPLE_DIR, 'kb'), EXAMPLE_DIR)
  assert.equal(config.source.dir, 'kb')
  assert.equal(config.idField, 'id')
  assert.equal(config.titleField, 'title')
  assert.equal(config.descriptionField, 'summary')
  assert.deepEqual(config.edges.map((e) => e.field).sort(), ['depends_on', 'design_docs', 'related'])
  assert.equal(config.sharedNeighbors.via, 'design_docs')
  for (const a of ['layer', 'stability', 'language']) assert.ok(config.attributes.includes(a), a)
  assert.ok(report.some((l) => l.startsWith('not classified')))
})

test('init --write refuses to overwrite without --force', (t) => {
  const dir = project(t)
  const r = run(['init', 'kb', '--write'], dir)
  assert.equal(r.status, 1)
  assert.match(r.stderr, /already exists; pass --force/)
  assert.equal(run(['init', 'kb', '--write', '--force'], dir).status, 0)
  const written = JSON.parse(fs.readFileSync(path.join(dir, 'cairn.config.json'), 'utf8'))
  assert.equal(written.idField, 'id')
  assert.deepEqual(written.edges.map((e) => e.field), ['depends_on'])
})
