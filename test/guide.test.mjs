// Wayfinding block: content, templates, and insertion between markers.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { test } from 'node:test'
import { loadConfig, resolveConfig } from '../src/config.mjs'
import { END_MARKER, START_MARKER, insertBlock, renderWayfinding } from '../src/guide.mjs'
import { EXAMPLE_DIR, tempDir } from './helpers.mjs'

const exampleConfig = () => loadConfig(path.join(EXAMPLE_DIR, 'cairn.config.json'))

test('the block has one rule per question type plus general rules', () => {
  const block = renderWayfinding(exampleConfig())
  assert.ok(block.startsWith(`${START_MARKER}\n`))
  assert.ok(block.endsWith(`${END_MARKER}\n`))
  for (const type of ['Topical lookup', 'Attribute filter', 'Relation lookup', 'Multi-node composition']) assert.ok(block.includes(`- ${type} (`), type)
  for (const rule of ['only when a card does not contain', 'second route', 'not shell commands', 'exactly as they appear']) assert.ok(block.includes(rule), rule)
  assert.ok(block.includes('`cairn-vault/CATALOG.md`'))
  assert.ok(block.includes('reverse edges (Used by; Related from; Cited by)'))
  assert.ok(block.includes('two-hop neighbors (Shares design docs with)'))
  assert.ok(block.includes('(K of N shown — reason)'))
  assert.doesNotMatch(block, /\{\w+\}/, 'no unfilled placeholders')
})

test('custom search, rules, and extra rules are applied', (t) => {
  const dir = tempDir(t)
  fs.mkdirSync(path.join(dir, 'kb'))
  const config = resolveConfig({
    source: { dir: 'kb' },
    wayfinding: { search: 'run `kb search "<query>"`', rules: { attribute: 'Filter questions: open {vault}/CATALOG.md.' }, extraRules: ['Ask before writing.'], general: [] },
  }, dir)
  const block = renderWayfinding(config)
  assert.ok(block.includes('Topical lookup (nodes whose content matches a topic): run `kb search "<query>"`.'))
  assert.ok(block.includes('- Filter questions: open cairn-vault/CATALOG.md.'))
  assert.ok(block.includes('- Ask before writing.'))
  assert.ok(!block.includes('General rules:'))
})

test('insertBlock appends, replaces, and leaves identical text alone', () => {
  const block = `${START_MARKER}\nnew\n${END_MARKER}\n`
  const appended = insertBlock('# Agent notes\n\nKeep this.\n', block)
  assert.equal(appended.action, 'appended')
  assert.equal(appended.text, `# Agent notes\n\nKeep this.\n\n${START_MARKER}\nnew\n${END_MARKER}\n`)
  const old = `intro\n${START_MARKER}\nold\n${END_MARKER}\noutro\n`
  const replaced = insertBlock(old, block)
  assert.equal(replaced.action, 'replaced')
  assert.equal(replaced.text, `intro\n${START_MARKER}\nnew\n${END_MARKER}\noutro\n`)
  assert.equal(insertBlock(replaced.text, block).action, 'unchanged')
  assert.equal(insertBlock('', block).text, block)
})

test('insertBlock refuses malformed markers', () => {
  assert.throws(() => insertBlock(`${START_MARKER}\nno end\n`, 'x'), /expected exactly one of each/)
  assert.throws(() => insertBlock(`${END_MARKER}\n${START_MARKER}\n`, 'x'), /end marker comes before/)
})

test('the example AGENTS.md carries the current block', () => {
  const agents = fs.readFileSync(path.join(EXAMPLE_DIR, 'AGENTS.md'), 'utf8')
  const vault = fs.readFileSync(path.join(EXAMPLE_DIR, 'cairn-vault', 'WAYFINDING.md'), 'utf8')
  assert.ok(agents.includes(vault.trimEnd()), 'run: npm run build-example')
})
