// Determinism, size targets enforced before replacement, attribute-table row count, fingerprint and rebuild detection.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { test } from 'node:test'
import { build, check, fingerprint, MANIFEST } from '../src/build.mjs'
import { loadConfig, resolveConfig } from '../src/config.mjs'
import { CairnError } from '../src/util.mjs'
import { EXAMPLE_DIR, makeConfig, snapshot, tempDir, writeKb } from './helpers.mjs'

const EXAMPLE_CONFIG = path.join(EXAMPLE_DIR, 'cairn.config.json')
const exampleRaw = () => JSON.parse(fs.readFileSync(EXAMPLE_CONFIG, 'utf8'))

/** A copy of the example KB in dir, with the example config writing to dir/vault. */
function exampleInto(dir, patch = {}) {
  if (!fs.existsSync(path.join(dir, 'kb'))) fs.cpSync(path.join(EXAMPLE_DIR, 'kb'), path.join(dir, 'kb'), { recursive: true })
  return resolveConfig({ ...exampleRaw(), ...patch, output: 'vault' }, dir)
}

test('same input gives byte-identical output', (t) => {
  const a = tempDir(t)
  const b = tempDir(t)
  const ca = exampleInto(a)
  const cb = exampleInto(b)
  build(ca)
  build(cb)
  const sa = snapshot(ca.outDir)
  const sb = snapshot(cb.outDir)
  assert.deepEqual([...sa.keys()], [...sb.keys()])
  for (const [rel, buf] of sa) assert.ok(buf.equals(sb.get(rel)), `${rel} differs`)
  // Rebuilding in place changes nothing either.
  build(ca)
  for (const [rel, buf] of snapshot(ca.outDir)) assert.ok(buf.equals(sa.get(rel)), `${rel} changed on rebuild`)
  assert.ok(sa.has(MANIFEST))
  assert.doesNotMatch(sa.get(MANIFEST).toString(), /\d{4}-\d{2}-\d{2}T/, 'no timestamps in the manifest')
})

test('the committed example vault equals a fresh build', () => {
  const res = check(loadConfig(EXAMPLE_CONFIG))
  assert.deepEqual(res.problems, [], 'run: npm run build-example')
  assert.equal(res.ok, true)
})

test('every card respects the size target', (t) => {
  const dir = tempDir(t)
  const config = exampleInto(dir)
  build(config)
  for (const f of fs.readdirSync(path.join(config.outDir, 'cards'))) {
    assert.ok(fs.statSync(path.join(config.outDir, 'cards', f)).size <= config.card.maxBytes, f)
  }
})

test('an exceeded size target fails the build and leaves the previous vault untouched', (t) => {
  const dir = tempDir(t)
  build(exampleInto(dir))
  const before = snapshot(path.join(dir, 'vault'))
  const tight = exampleInto(dir, { card: { ...exampleRaw().card, maxBytes: 700 } })
  assert.throws(() => build(tight), (error) => {
    assert.ok(error instanceof CairnError)
    assert.match(error.message, /size targets exceeded; the vault was not replaced/)
    assert.ok(error.details.some((d) => /^cards\/qs-io-s3\.md: \d+\.\dKB > 0\.7KB \(card target; \d+ bytes over\)$/.test(d)), error.details.join('\n'))
    assert.ok(error.details.some((d) => /^Actual sizes: largest card \d+\.\dKB of 0\.7KB \(cards\/.+\.md\), CATALOG /.test(d)), error.details.join('\n'))
    return true
  })
  const after = snapshot(path.join(dir, 'vault'))
  assert.deepEqual([...after.keys()], [...before.keys()])
  for (const [rel, buf] of before) assert.ok(buf.equals(after.get(rel)), rel)
  // No temporary or lock folders are left behind.
  assert.deepEqual(fs.readdirSync(dir).filter((n) => n.startsWith('.')), [])
})

test('an exceeded attribute-table target also fails the build', (t) => {
  const dir = tempDir(t)
  assert.throws(() => build(exampleInto(dir, { catalog: { maxBytes: 1024 } })), /size targets exceeded/)
  assert.equal(fs.existsSync(path.join(dir, 'vault')), false)
})

test('the attribute table has exactly one row per node', (t) => {
  const dir = tempDir(t)
  const config = exampleInto(dir)
  const res = build(config)
  const catalog = fs.readFileSync(path.join(config.outDir, 'CATALOG.md'), 'utf8')
  const rows = catalog.split('\n').filter((l) => l.startsWith('| ') && !l.startsWith('| id |'))
  const nodes = fs.readdirSync(path.join(config.outDir, 'cards')).length
  assert.equal(rows.length, nodes)
  assert.equal(rows.length, res.counts.nodes)
  assert.equal(new Set(rows.map((r) => r.split(' | ')[0])).size, rows.length, 'ids are unique')
})

test('a changed input changes the fingerprint; check reports stale and --if-stale rebuilds', (t) => {
  const dir = tempDir(t)
  const kb = writeKb(dir, [{ id: 'A', edges: { depends_on: ['B'] } }, { id: 'B' }])
  const config = makeConfig(dir)
  assert.equal(build(config, { ifStale: true }).action, 'built')
  assert.equal(build(config, { ifStale: true }).action, 'fresh')
  assert.equal(check(config).ok, true)
  const fp1 = fingerprint(config).fingerprint

  fs.appendFileSync(path.join(kb, 'B.md'), '\nA new paragraph.\n')
  assert.notEqual(fingerprint(config).fingerprint, fp1)
  const res = check(config)
  assert.equal(res.ok, false)
  assert.equal(res.stale, true)
  assert.ok(res.problems.some((p) => p.startsWith('stale: node files changed')), res.problems.join('\n'))
  assert.equal(build(config, { ifStale: true }).action, 'built')
  assert.equal(check(config).ok, true)

  // A new file and a config change are detected too.
  writeKb(dir, [{ id: 'C' }])
  assert.equal(check(config).stale, true)
  build(config)
  const changed = makeConfig(dir, { k: 3 })
  assert.ok(check(changed).problems.some((p) => p.includes('config changed')))
  assert.equal(build(changed, { ifStale: true }).action, 'built')
})

test('check detects a hand-edited card', (t) => {
  const dir = tempDir(t)
  writeKb(dir, [{ id: 'A' }, { id: 'B' }])
  const config = makeConfig(dir)
  build(config)
  fs.appendFileSync(path.join(config.outDir, 'cards', 'A.md'), 'edited\n')
  const res = check(config)
  assert.equal(res.ok, false)
  assert.ok(res.problems.some((p) => p.includes('differ from a fresh build') && p.includes('cards/A.md')))
})

test('build refuses to replace a folder that is not a Cairn vault', (t) => {
  const dir = tempDir(t)
  writeKb(dir, [{ id: 'A' }])
  fs.mkdirSync(path.join(dir, 'vault'))
  fs.writeFileSync(path.join(dir, 'vault', 'notes.txt'), 'keep me')
  assert.throws(() => build(makeConfig(dir)), /is not empty and is not a Cairn vault/)
  assert.equal(fs.readFileSync(path.join(dir, 'vault', 'notes.txt'), 'utf8'), 'keep me')
})

test('files without the id field are skipped with a warning; duplicate ids fail', (t) => {
  const dir = tempDir(t)
  const kb = writeKb(dir, [{ id: 'A' }])
  fs.writeFileSync(path.join(kb, 'README.md'), '# Notes folder\n')
  const res = build(makeConfig(dir))
  assert.equal(res.counts.nodes, 1)
  assert.ok(res.warnings.some((w) => w.includes('README.md')))
  fs.writeFileSync(path.join(kb, 'copy.md'), '---\nid: A\n---\n')
  assert.throws(() => build(makeConfig(dir)), (error) => error.details.some((d) => d.includes('duplicate id "A"')))
})

test('front-matter errors name the file and line', (t) => {
  const dir = tempDir(t)
  const kb = writeKb(dir, [{ id: 'A' }])
  fs.writeFileSync(path.join(kb, 'bad.md'), '---\nid: bad\ntitle: "unterminated\n---\n')
  assert.throws(() => build(makeConfig(dir)), (error) => error.details.some((d) => /^bad\.md: line 3: /.test(d)))
})

test('$filename ids and bodies: false', (t) => {
  const dir = tempDir(t)
  const kb = path.join(dir, 'kb')
  fs.mkdirSync(path.join(kb, 'sub'), { recursive: true })
  fs.writeFileSync(path.join(kb, 'alpha.md'), '---\ntitle: Alpha\nlinks: [beta]\n---\n# Alpha\n')
  fs.writeFileSync(path.join(kb, 'sub', 'beta.md'), '---\ntitle: Beta\n---\n# Beta\n')
  const config = resolveConfig({ source: { dir: 'kb' }, idField: '$filename', edges: [{ field: 'links', reverse: 'Linked from' }], bodies: false, output: 'vault' }, dir)
  build(config)
  assert.deepEqual(fs.readdirSync(path.join(config.outDir, 'cards')).sort(), ['alpha.md', 'beta.md'])
  assert.equal(fs.existsSync(path.join(config.outDir, 'bodies')), false)
  assert.match(fs.readFileSync(path.join(config.outDir, 'cards', 'beta.md'), 'utf8'), /- Linked from \(reverse of Links\): alpha \(Alpha\)/)
})
