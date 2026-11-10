// Layout, templates, intermediate notes, attribute notes, custom wayfinding markers, and planNodes (library use).
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { test } from 'node:test'
import { build, check, plan, planNodes } from '../src/build.mjs'
import { resolveConfig } from '../src/config.mjs'
import { insertBlock, renderWayfinding } from '../src/guide.mjs'
import { makeConfig, tempDir, writeKb } from './helpers.mjs'

const NODES = [
  { id: 'A', attrs: { tier: 'core', lane: 'Night shift' }, edges: { depends_on: ['B'], evidence: ['E1', 'E2', 'GONE'] } },
  { id: 'B', attrs: { tier: 'edge', lane: 'Night shift' }, edges: { evidence: ['E1'] } },
  { id: 'C', attrs: { tier: 'core' }, edges: { evidence: ['E2'] } },
]

function writeNotes(kb) {
  fs.mkdirSync(path.join(kb, 'evidence'), { recursive: true })
  fs.writeFileSync(path.join(kb, 'evidence', 'E1.md'), '---\ntitle: First source\n---\n\nNotes on E1.\n')
  fs.writeFileSync(path.join(kb, 'evidence', 'E2.md'), '---\ntitle: Second source\n---\n\nNotes on E2.\n')
  fs.writeFileSync(path.join(kb, 'evidence', 'E3.md'), '---\ntitle: Unused source\n---\n\nNobody cites E3.\n')
}

function writeTemplates(dir) {
  const t = path.join(dir, 'tmpl')
  fs.mkdirSync(t, { recursive: true })
  fs.writeFileSync(path.join(t, 'card.tmpl'), [
    '# {{id}} {{title}}',
    '- Voraussetzung: {{#each relations.depends_on.items sep=" · "}}[[{{id}}]] {{name}}{{else}}keine{{/each}}',
    '- Benutzt von: {{#each relations.depends_on.reverse.all sep=" · "}}[[{{id}}]]{{else}}keine{{/each}}',
    '- Gleiche Quellen: {{#if shared.total}}{{#each shared.items sep=" · "}}[[{{id}}]] ({{count}}){{else}}keine gezeigt{{/each}}{{#if shared.truncated}} ({{shared.shown}} von {{shared.total}}){{/if}}{{else}}keine{{/if}}',
    '- Quellen: {{#each relations.evidence.items sep=" · "}}[[{{target}}]]{{else}}keine{{/each}}',
    '- Register: {{#each attributeNotes sep=" · "}}[[{{target}}]]{{else}}keine{{/each}}',
    '- Volltext: [[{{bodyTarget}}]]',
    '',
  ].join('\n'))
  fs.writeFileSync(path.join(t, 'note.tmpl'), '{{note.raw | trimEnd}}\n\n- Zitiert von: {{#each users sep=", "}}[[{{id}}]]{{else}}keine{{/each}}\n')
  fs.writeFileSync(path.join(t, 'attr.tmpl'), '# {{label}} {{value}}\n\n{{#each members}}\n- [[{{id}}]] {{name}}\n{{/each}}\n')
  fs.writeFileSync(path.join(t, 'index.tmpl'), '# Index\n\n- {{counts.nodes}} Karten · {{counts.notes}} Quellen · {{counts.attributeNotes}} Register\n{{#each attributeGroups}}\n- {{label}}: {{#each notes sep=" · "}}[[{{target}}]]{{/each}}\n{{/each}}\n')
  fs.writeFileSync(path.join(t, 'guide.tmpl'), 'Karten: `{{card}}` · Volltext: `{{bodiesDir}}/`\n')
}

function setup(t) {
  const dir = tempDir(t)
  const kb = writeKb(dir, NODES)
  writeNotes(kb)
  writeTemplates(dir)
  const config = makeConfig(dir, {
    sharedNeighbors: { via: 'evidence', label: 'Shares evidence with', hubThreshold: 5, notes: { include: ['evidence/*.md'], path: 'sources/{stem}.md' } },
    layout: { cards: 'karten/{stem}.md', bodies: 'text/{stem}-text.md', wayfinding: null },
    attributeNotes: { attributes: [{ field: 'tier', label: 'Stufe' }, 'lane'], path: 'register/{attribute}-{value}.md' },
    templates: { card: 'tmpl/card.tmpl', note: 'tmpl/note.tmpl', attributeNote: 'tmpl/attr.tmpl', index: 'tmpl/index.tmpl', wayfinding: 'tmpl/guide.tmpl' },
    wayfinding: { markers: { start: '<!-- kb:start -->', end: '<!-- kb:end -->' } },
  })
  return { dir, kb, config }
}

test('layout and templates place and shape every generated file', (t) => {
  const { config } = setup(t)
  const res = build(config)
  assert.equal(res.action, 'built')
  const files = fs.readdirSync(config.outDir).sort()
  assert.deepEqual(files, ['.cairn-fingerprint.json', 'CATALOG.md', 'INDEX.md', 'karten', 'register', 'sources', 'text'])
  const card = fs.readFileSync(path.join(config.outDir, 'karten', 'A.md'), 'utf8')
  assert.equal(card, [
    '# A Title of A',
    '- Voraussetzung: [[B]] Title of B',
    '- Benutzt von: keine',
    '- Gleiche Quellen: [[B]] (1) · [[C]] (1)',
    '- Quellen: [[sources/E1]] · [[sources/E2]]',
    '- Register: [[register/tier-core]] · [[register/lane-Night-shift]]',
    '- Volltext: [[text/A-text]]',
    '',
  ].join('\n'))
  // Built-in body at the configured path, CATALOG still built in.
  assert.match(fs.readFileSync(path.join(config.outDir, 'text', 'A-text.md'), 'utf8'), /^# A — Title of A\n\n## Overview/)
  assert.match(fs.readFileSync(path.join(config.outDir, 'CATALOG.md'), 'utf8'), /^# Catalog \(3 nodes\)/)
  // Intermediate notes: every note is written, used or not, with its users.
  assert.equal(fs.readFileSync(path.join(config.outDir, 'sources', 'E1.md'), 'utf8'), '---\ntitle: First source\n---\n\nNotes on E1.\n\n- Zitiert von: [[A]], [[B]]\n')
  assert.match(fs.readFileSync(path.join(config.outDir, 'sources', 'E3.md'), 'utf8'), /Zitiert von: keine\n$/)
  // Attribute notes: one per value, unsafe characters replaced in the file name.
  assert.equal(fs.readFileSync(path.join(config.outDir, 'register', 'lane-Night-shift.md'), 'utf8'), '# Lane Night shift\n\n- [[A]] Title of A\n- [[B]] Title of B\n')
  assert.equal(fs.readFileSync(path.join(config.outDir, 'INDEX.md'), 'utf8'), '# Index\n\n- 3 Karten · 3 Quellen · 3 Register\n- Stufe: [[register/tier-core]] · [[register/tier-edge]]\n- Lane: [[register/lane-Night-shift]]\n')
  // The dangling via target is reported, not linked.
  assert.ok(res.warnings.some((w) => w.includes('A -[evidence]-> GONE')), res.warnings.join('\n'))
  const ok = check(config)
  assert.ok(ok.ok, ok.problems.join('\n'))
  assert.ok(ok.passed.some((p) => p.includes('3 cards = 3 nodes')))
})

test('editing a template or an intermediate note makes the vault stale', (t) => {
  const { dir, kb, config } = setup(t)
  build(config)
  fs.appendFileSync(path.join(dir, 'tmpl', 'note.tmpl'), '<!-- changed -->\n')
  assert.match(check(config).problems.join('\n'), /stale: config changed/)
  build(config)
  fs.appendFileSync(path.join(kb, 'evidence', 'E2.md'), 'More notes.\n')
  assert.match(check(config).problems.join('\n'), /stale: node files changed/)
})

test('size targets follow the card layout', (t) => {
  const { config } = setup(t)
  config.card.maxBytes = 64
  const planned = plan(config)
  assert.ok(planned.over.some((o) => o.rel.startsWith('karten/') && o.kind === 'card'), JSON.stringify(planned.over))
})

test('the wayfinding block uses the template and custom markers, and insertBlock honors them', (t) => {
  const { config } = setup(t)
  const block = renderWayfinding(config)
  assert.equal(block, '<!-- kb:start -->\nKarten: `vault/karten/<id>.md` · Volltext: `vault/text/`\n<!-- kb:end -->\n')
  const once = insertBlock('# Notes\n', block, config.wayfinding.markers)
  assert.equal(insertBlock(once.text, block, config.wayfinding.markers).action, 'unchanged')
  assert.throws(() => insertBlock('<!-- kb:start -->\n', block, config.wayfinding.markers), /expected exactly one of each/)
})

test('default rules follow the layout', (t) => {
  const dir = tempDir(t)
  writeKb(dir, NODES)
  const config = makeConfig(dir, { layout: { cards: 'notes/{stem}.md', bodies: 'full/{stem}.md' } })
  const block = renderWayfinding(config)
  assert.ok(block.includes('`vault/notes/<id>.md`') && block.includes('`vault/full/`') && !block.includes('cards/'), block)
})

test('planNodes plans from documents read by the caller, without a source folder', (t) => {
  const dir = tempDir(t)
  writeTemplates(dir)
  const config = resolveConfig({
    edges: [{ field: 'depends_on', label: 'Depends on', reverse: 'Used by' }, { field: 'evidence', label: 'Evidence' }],
    sharedNeighbors: { via: 'evidence', hubThreshold: 5, notes: { path: 'sources/{stem}.md' } },
    layout: { wayfinding: null },
    templates: { note: 'tmpl/note.tmpl' },
  }, dir, { requireSource: false })
  const planned = planNodes(config, {
    nodes: [{ id: 'X', data: { title: 'Ex', depends_on: ['Y'], evidence: ['S1'] }, body: 'x body' }, { id: 'Y', data: { title: 'Why', evidence: ['S1'] }, body: '' }],
    notes: [{ id: 'S1', raw: 'raw S1 text\n', data: {}, body: 'raw S1 text\n' }],
  })
  assert.deepEqual([...planned.files.keys()], ['CATALOG.md', 'INDEX.md', 'bodies/X.md', 'bodies/Y.md', 'cards/X.md', 'cards/Y.md', 'sources/S1.md'])
  assert.equal(planned.files.get('sources/S1.md'), 'raw S1 text\n\n- Zitiert von: [[X]], [[Y]]\n')
  assert.match(planned.files.get('cards/Y.md'), /- Used by \(reverse of Depends on\): X \(Ex\)/)
  assert.deepEqual(planned.warnings, [])
})

test('config errors for the new keys are specific', (t) => {
  const dir = tempDir(t)
  writeKb(dir, NODES)
  assert.throws(() => makeConfig(dir, { layout: { cards: '../out/{stem}.md' } }), (e) => e.details.some((d) => d.startsWith('layout.cards: must be a relative path')))
  assert.throws(() => makeConfig(dir, { layout: { bodies: 'bodies/x.md' } }), (e) => e.details.some((d) => d.includes('contains {stem} or {id}')))
  assert.throws(() => makeConfig(dir, { templates: { card: 'missing.tmpl' } }), (e) => e.details.some((d) => d === 'templates.card: file not found: missing.tmpl (relative to the config file)'))
  assert.throws(() => makeConfig(dir, { templates: { cards: 'x' } }), (e) => e.details.some((d) => d.includes('did you mean "card"')))
  assert.throws(() => makeConfig(dir, { attributeNotes: { attributes: [] } }), (e) => e.details.some((d) => d.startsWith('attributeNotes.attributes')))
  assert.throws(() => makeConfig(dir, { attributeNotes: { attributes: ['tier'], path: 'reg/{attribute}.md' } }), (e) => e.details.some((d) => d.includes('{value}')))
  assert.throws(() => makeConfig(dir, { wayfinding: { markers: { start: 'same', end: 'same' } } }), (e) => e.details.some((d) => d.includes('start and end must differ')))
})

test('two outputs that map to the same path are refused', (t) => {
  const dir = tempDir(t)
  const kb = writeKb(dir, NODES)
  writeNotes(kb)
  const config = makeConfig(dir, {
    sharedNeighbors: { via: 'evidence', notes: { include: ['evidence/*.md'], path: 'cards/{stem}.md' } },
  })
  fs.writeFileSync(path.join(kb, 'evidence', 'A.md'), '---\ntitle: clash\n---\n')
  assert.throws(() => plan(config), /two generated files map to cards\/A\.md/)
})

test('cards at the vault root: fixed files keep their own size targets and are not counted as cards', (t) => {
  const dir = tempDir(t)
  writeKb(dir, NODES)
  const config = makeConfig(dir, { layout: { cards: '{stem}.md' }, card: { maxBytes: 600 } })
  const res = build(config)
  assert.equal(res.action, 'built')
  const ok = check(config)
  assert.ok(ok.ok, ok.problems.join('\n'))
  assert.ok(ok.passed.some((p) => p.includes('3 cards = 3 nodes')), ok.passed.join('\n'))
})

test('references carry every key, so templates never fall back to the enclosing node', (t) => {
  const dir = tempDir(t)
  const kb = writeKb(dir, NODES)
  writeNotes(kb)
  fs.mkdirSync(path.join(dir, 'tmpl'), { recursive: true })
  fs.writeFileSync(path.join(dir, 'tmpl', 'card.tmpl'), '{{#each relations.evidence.items}}[{{description}}|{{bodyTarget}}|{{cardPath}}]{{/each}}\n')
  const config = makeConfig(dir, {
    descriptionField: 'tier',
    sharedNeighbors: { via: 'evidence', notes: { include: ['evidence/*.md'] } },
    templates: { card: 'tmpl/card.tmpl' },
  })
  assert.equal(plan(config).files.get('cards/A.md'), '[||][||]\n')
})

test('the built-in card titles via targets from their notes and leaves the via reverse row to the notes', (t) => {
  const dir = tempDir(t)
  const kb = writeKb(dir, [...NODES, { id: 'E1', title: 'Node named like a note' }])
  writeNotes(kb)
  const config = makeConfig(dir, { sharedNeighbors: { via: 'evidence', notes: { include: ['evidence/*.md'] } } })
  const files = plan(config).files
  assert.match(files.get('cards/A.md'), /- Evidence: E1 \(First source\); E2 \(Second source\)/)
  assert.ok(!files.get('cards/E1.md').includes('Evidence for'), files.get('cards/E1.md'))
})

test('outputs that differ only by case collide, and a note glob that matches nothing is reported', (t) => {
  const dir = tempDir(t)
  const kb = writeKb(dir, [{ id: 'A', attrs: { tier: 'Core' } }, { id: 'B', attrs: { tier: 'core' } }])
  const config = makeConfig(dir, { attributeNotes: { attributes: ['tier'] } })
  assert.throws(() => plan(config), /two generated files map to attributes\/tier-core\.md/)
  const quiet = makeConfig(dir, { sharedNeighbors: { via: 'evidence', notes: { include: ['nothing/*.md'] } } })
  assert.ok(plan(quiet).warnings.some((w) => w.includes('sharedNeighbors.notes.include matched no files')))
  void kb
})

test('path patterns with empty, dot, or drive segments are refused', (t) => {
  const dir = tempDir(t)
  writeKb(dir, NODES)
  for (const bad of ['cards//{stem}.md', 'cards/./{stem}.md', 'C:/x/{stem}.md']) {
    assert.throws(() => makeConfig(dir, { layout: { cards: bad } }), (e) => e.details.some((d) => d.startsWith('layout.cards: must be a relative path')), bad)
  }
})
