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
  assert.match(b.stdout, /sizes: largest card \d+\.\dKB of 5\.0KB \(cards\/[AB]\.md\), CATALOG \d+\.\dKB of 20\.0KB, INDEX \d+\.\dKB of 4\.0KB/)
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
  assert.match(c.stdout, /FAIL {2}stale: node files changed/)
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
  assert.deepEqual(config.sharedNeighbors, { via: 'design_docs' }, 'hubThreshold is left automatic')
  assert.ok(report.some((l) => /hub threshold left automatic: 25% of the 26 nodes that use it, at least 3 = 7/.test(l)), report.join('\n'))
  for (const a of ['layer', 'stability', 'language']) assert.ok(config.attributes.includes(a), a)
  assert.deepEqual(config.source.exclude, ['README.md'], 'the README has no id')
  assert.equal(config.kindField, 'kind')
  // Fields present on every node of one kind are found although they cover only 23% of all files.
  assert.ok(config.attributes.includes('status'))
  assert.ok(config.card.fields.includes('decision'))
  assert.ok(report.some((l) => l.startsWith('attribute: "status"') && l.includes('in 100% of kind=design-doc, 8 files; 23% overall')), report.join('\n'))
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

test('an instruction file and a README inside source.dir never make the vault stale', (t) => {
  // The trap: notes and AGENTS.md share one folder, include is **/*.md and exclude is empty.
  const dir = tempDir(t)
  writeKb(dir, [{ id: 'A', edges: { depends_on: ['B'] } }, { id: 'B' }])
  fs.writeFileSync(path.join(dir, 'kb', 'AGENTS.md'), '# Agent notes\n')
  fs.writeFileSync(path.join(dir, 'kb', 'README.md'), '# About these notes\n')
  fs.writeFileSync(path.join(dir, 'cairn.config.json'), JSON.stringify({ source: { dir: 'kb', include: ['**/*.md'], exclude: [] }, edges: [{ field: 'depends_on', reverse: 'Used by' }] }))
  assert.equal(run(['build'], dir).status, 0)
  const g = run(['guide', '--write', 'kb/AGENTS.md'], dir)
  assert.equal(g.status, 0, g.stderr)
  assert.doesNotMatch(g.stderr, /stale/)
  const c = run(['check'], dir)
  assert.equal(c.status, 0, c.stdout)
  // Editing the README (no id) changes nothing; giving it an id makes it a node, and the vault stale.
  fs.appendFileSync(path.join(dir, 'kb', 'README.md'), '\nMore words.\n')
  assert.equal(run(['check'], dir).status, 0)
  fs.writeFileSync(path.join(dir, 'kb', 'README.md'), '---\nid: R\n---\n# R\n')
  assert.match(run(['check'], dir).stdout, /FAIL {2}stale: node files changed/)
})

test('with wayfinding.instructionFile, the instruction file is no input and check verifies its block', (t) => {
  const dir = tempDir(t)
  writeKb(dir, [{ id: 'A' }])
  fs.writeFileSync(path.join(dir, 'kb', 'CLAUDE.md'), '---\nid: looks-like-a-node\n---\n# Project\n')
  const cfg = { source: { dir: 'kb' }, wayfinding: { instructionFile: 'kb/CLAUDE.md' } }
  fs.writeFileSync(path.join(dir, 'cairn.config.json'), JSON.stringify(cfg))
  const b = run(['build'], dir)
  assert.equal(b.status, 0, b.stderr)
  assert.match(b.stdout, /1 cards/, 'CLAUDE.md is left out of the inputs even though it has an id')
  assert.match(run(['check'], dir).stdout, /FAIL {2}kb\/CLAUDE\.md has no wayfinding block \(run cairn guide --write kb\/CLAUDE\.md\)/)
  assert.equal(run(['guide', '--write', 'kb/CLAUDE.md'], dir).status, 0)
  const c = run(['check'], dir)
  assert.equal(c.status, 0, c.stdout)
  assert.match(c.stdout, /ok {4}kb\/CLAUDE\.md carries the current wayfinding block/)
  // Paths in the block are relative to the instruction file (kb/), not to the config folder.
  const block = fs.readFileSync(path.join(dir, 'kb', 'CLAUDE.md'), 'utf8')
  assert.match(block, /The Cairn vault in `\.\.\/cairn-vault\/` is generated from `\.\/`/)
  assert.match(block, /`\.\.\/cairn-vault\/CATALOG\.md`/)
  // A config change without a rebuild: guide warns, check explains.
  cfg.wayfinding.search = 'run `kb search "<query>"`'
  fs.writeFileSync(path.join(dir, 'cairn.config.json'), JSON.stringify(cfg))
  const g = run(['guide', '--write', 'kb/CLAUDE.md'], dir)
  assert.match(g.stderr, /warning: the vault is stale \(config changed\).*Run: cairn build/)
  assert.match(run(['check'], dir).stdout, /stale: config changed since the last build \(run cairn build; every config change, including wayfinding settings, needs a rebuild before guide and check\)/)
  run(['build'], dir)
  assert.equal(run(['check'], dir).status, 0)
})

test('guide --write puts paths relative to FILE and refuses to write into a note', (t) => {
  const dir = tempDir(t)
  writeKb(dir, [{ id: 'A' }])
  fs.mkdirSync(path.join(dir, 'docs'))
  fs.writeFileSync(path.join(dir, 'cairn.config.json'), JSON.stringify({ source: { dir: 'kb' } }))
  run(['build'], dir)
  const g = run(['guide', '--write', 'docs/AGENTS.md'], dir)
  assert.equal(g.status, 0, g.stderr)
  assert.match(fs.readFileSync(path.join(dir, 'docs', 'AGENTS.md'), 'utf8'), /vault in `\.\.\/cairn-vault\/` is generated from `\.\.\/kb\/`/)
  assert.match(g.stderr, /note: paths in the block are relative to docs\/AGENTS\.md.*Set wayfinding\.instructionFile/)
  const r = run(['guide', '--write', 'kb/A.md'], dir)
  assert.equal(r.status, 1)
  assert.match(r.stderr, /is a node of the knowledge base/)
})

test('notes in the config folder: the vault may live inside source.dir', (t) => {
  const dir = tempDir(t)
  const kb = writeKb(dir, [{ id: 'A', edges: { depends_on: ['B'] } }, { id: 'B' }])
  fs.writeFileSync(path.join(kb, 'cairn.config.json'), JSON.stringify({ source: { dir: '.' }, edges: [{ field: 'depends_on', reverse: 'Used by' }] }))
  assert.equal(run(['build'], kb).status, 0)
  assert.equal(run(['build'], kb).status, 0, 'the vault is not read back as notes')
  const c = run(['check'], kb)
  assert.equal(c.status, 0, c.stdout)
  assert.match(c.stdout, /2 cards = 2 nodes/)
  // init does not count the cards of an existing vault as notes.
  const i = run(['init', '.'], kb)
  assert.match(i.stderr, /left out \d+ file\(s\) inside an existing Cairn vault/)
  assert.match(i.stderr, /scanned 2 Markdown files/)
  assert.match(i.stderr, /output: "cairn-vault" will sit inside the notes folder/)
})

test('init excludes instruction files, READMEs, and files without the id field', (t) => {
  const dir = tempDir(t)
  const kb = writeKb(dir, Array.from({ length: 10 }, (_, i) => ({ id: `N${i}` })))
  fs.writeFileSync(path.join(kb, 'AGENTS.md'), '# Agents\n')
  fs.mkdirSync(path.join(kb, 'sub'))
  fs.writeFileSync(path.join(kb, 'sub', 'README.md'), '# Sub\n')
  fs.writeFileSync(path.join(kb, 'template.md'), '---\ntitle: Template\n---\n')
  const { config, report } = proposeConfig(kb, dir)
  assert.equal(config.idField, 'id')
  assert.deepEqual(config.source.exclude, ['AGENTS.md', 'sub/README.md', 'template.md'])
  assert.ok(report.some((l) => l.startsWith('exclude: 3 file(s) that are not nodes')), report.join('\n'))
})

test('the hook prints one line instead of failing silently when node or the config is missing', (t) => {
  const dir = tempDir(t)
  const git = spawnSync('git', ['init', '-q', dir], { encoding: 'utf8' })
  if (git.status !== 0) { t.skip('git is not available'); return }
  const hook = path.join(ROOT, 'hooks', 'post-merge.sample')
  const env = { ...process.env, CAIRN_BIN: BIN, CAIRN_CONFIG: 'missing.json' }
  const r = spawnSync('sh', [hook], { cwd: dir, encoding: 'utf8', env })
  assert.equal(r.status, 0)
  assert.match(r.stderr, /^cairn hook: skipped: config not found: missing\.json/)
  const noNode = spawnSync('/bin/sh', [hook], { cwd: dir, encoding: 'utf8', env: { ...env, PATH: '/nonexistent' } })
  assert.equal(noNode.status, 0)
  assert.match(noNode.stderr, /cairn hook: skipped: node not found/)
})
