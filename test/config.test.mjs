// Config validation: clear errors for missing, mistyped, unknown, and inconsistent settings.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { test } from 'node:test'
import { loadConfig, resolveConfig, validateConfig } from '../src/config.mjs'
import { CairnError } from '../src/util.mjs'
import { tempDir } from './helpers.mjs'

const errorsOf = (raw) => validateConfig(raw).errors

test('a minimal config is valid and gets defaults', () => {
  const { config, errors } = validateConfig({ source: { dir: 'notes' } })
  assert.deepEqual(errors, [])
  assert.equal(config.idField, 'id')
  assert.equal(config.titleField, 'title')
  assert.equal(config.k, 10)
  assert.equal(config.card.maxBytes, 5120)
  assert.equal(config.catalog.maxBytes, 20480)
  assert.equal(config.output, 'cairn-vault')
  assert.deepEqual(config.source.include, ['**/*.md'])
})

test('missing source.dir is reported', () => {
  assert.deepEqual(errorsOf({}), ['source: is required and must be an object such as { "dir": "notes" }'])
  assert.ok(errorsOf({ source: {} }).some((e) => e.startsWith('source.dir: is required')))
})

test('unknown keys are rejected with a suggestion', () => {
  const errs = errorsOf({ source: { dir: 'kb' }, atributes: ['x'], card: { maxByte: 100 } })
  assert.ok(errs.includes('config: unknown key "atributes" (did you mean "attributes"?)'), errs.join('\n'))
  assert.ok(errs.includes('card: unknown key "maxByte" (did you mean "maxBytes"?)'), errs.join('\n'))
})

test('wrong types are reported per field', () => {
  const errs = errorsOf({ source: { dir: 'kb' }, attributes: 'tier', k: 0, card: { maxBytes: 'big' }, bodies: 'yes' })
  assert.ok(errs.includes('attributes: must be an array of non-empty strings'))
  assert.ok(errs.includes('k: must be an integer >= 1'))
  assert.ok(errs.includes('card.maxBytes: must be an integer >= 256'))
  assert.ok(errs.includes('bodies: must be true or false'))
})

test('sharedNeighbors.via must name an edge field', () => {
  const errs = errorsOf({ source: { dir: 'kb' }, edges: ['depends_on'], sharedNeighbors: { via: 'evidence' } })
  assert.ok(errs.includes('sharedNeighbors.via: "evidence" is not one of the edge fields (depends_on)'), errs.join('\n'))
  assert.ok(errorsOf({ source: { dir: 'kb' }, edges: ['e'], sharedNeighbors: { via: 'e', hubThreshold: 1 } }).includes('sharedNeighbors.hubThreshold: must be an integer >= 2'))
})

test('edge definitions are checked', () => {
  const errs = errorsOf({ source: { dir: 'kb' }, attributes: ['tier'], edges: [{ label: 'x' }, { field: 'a', reverse: 3 }, 'tier', 'b', 'b'] })
  assert.ok(errs.includes('edges[0].field: is required'))
  assert.ok(errs.some((e) => e.startsWith('edges[1].reverse: must be a label')))
  assert.ok(errs.includes('edges: field "tier" is also listed in attributes; use it as one or the other'))
  assert.ok(errs.includes('edges: field "b" is defined twice'))
})

test('catalog.edgeColumns must be edge fields; wayfinding rule keys are checked', () => {
  const errs = errorsOf({ source: { dir: 'kb' }, edges: ['a'], catalog: { edgeColumns: ['z'] }, wayfinding: { rules: { topic: 'x' } } })
  assert.ok(errs.includes('catalog.edgeColumns: "z" is not one of the edge fields (a)'))
  assert.ok(errs.some((e) => e.startsWith('wayfinding.rules: unknown key "topic"')))
})

test('resolveConfig fails on a missing folder and on output overlapping the source', (t) => {
  const dir = tempDir(t)
  assert.throws(() => resolveConfig({ source: { dir: 'nope' } }, dir), (e) => e instanceof CairnError && e.exitCode === 2 && e.details.some((d) => d.startsWith('source.dir: folder not found')))
  fs.mkdirSync(path.join(dir, 'kb'))
  assert.throws(() => resolveConfig({ source: { dir: 'kb' }, output: 'kb/vault' }, dir), (e) => e.details.some((d) => d.startsWith('output: "kb/vault" overlaps')))
  const ok = resolveConfig({ source: { dir: 'kb' } }, dir)
  assert.equal(ok.wayfinding.vaultPath, 'cairn-vault')
})

test('loadConfig reports unreadable files and invalid JSON with exit code 2', (t) => {
  const dir = tempDir(t)
  assert.throws(() => loadConfig(path.join(dir, 'missing.json')), (e) => e.exitCode === 2 && /cannot read config/.test(e.message))
  fs.writeFileSync(path.join(dir, 'bad.json'), '{ "source": ')
  assert.throws(() => loadConfig(path.join(dir, 'bad.json')), (e) => e.exitCode === 2 && /not valid JSON/.test(e.message))
})
