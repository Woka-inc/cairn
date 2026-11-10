// The template language: values, filters, blocks, standalone block lines, and syntax errors.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { compile, render } from '../src/template.mjs'

test('values, dotted paths, literals, and filters', () => {
  const ctx = { a: { b: ' two   words ' }, n: 0, list: ['x', ' ', 'y', 3, { o: 1 }], s: 'abcdef', t: 'p|q' }
  assert.equal(render('{{a.b | oneLine}}|{{a.b | trim | upper}}|{{"lit"}}|{{n}}|{{missing}}', ctx), 'two words|TWO   WORDS|lit|0|')
  assert.equal(render('{{list | list | compact | join:"/"}}', ctx), 'x/y/3')
  assert.equal(render('{{list | list | json}}', ctx), '["x","","y","3"]')
  assert.equal(render('{{s | clip:4}} {{s | truncate:4}} {{s | count}}', ctx), 'abc… abcd… 6')
  assert.equal(render('{{t | cell}} {{t | cell:"/"}}', ctx), 'p\\|q p/q')
  assert.equal(render('{{rows | pluck:"title" | list | join}}', { rows: [{ title: 'A' }, 'skip', { title: 'B' }] }), 'A, B')
  assert.equal(render('{{z | default:"-"}}', { z: '' }), '-')
})

test('if, unless, else, each with sep, @number, with, and filter blocks', () => {
  const ctx = { items: [{ id: 'A', name: 'Alpha' }, { id: 'B', name: '' }], none: [], obj: { k: 'v' }, label: 'x"y' }
  assert.equal(render('{{#each items sep=" · "}}[[{{id}}]]{{#if name}} {{name}}{{/if}}{{else}}none{{/each}}', ctx), '[[A]] Alpha · [[B]]')
  assert.equal(render('{{#each none sep=", "}}x{{else}}none{{/each}}', ctx), 'none')
  assert.equal(render('{{#each items}}{{@number}}.{{id}}{{#unless @last}},{{/unless}}{{/each}}', ctx), '1.A,2.B')
  assert.equal(render('{{#with obj}}{{k}}{{/with}}', ctx), 'v')
  assert.equal(render('{{#filter json}}{{label}} note{{/filter}}', ctx), '"x\\"y note"')
  assert.equal(render('{{#if n}}yes{{else}}no{{/if}}', { n: 0 }), 'no')
})

test('a line that holds only a block tag disappears with its line break', () => {
  const tpl = 'a\n{{#if x}}\nb\n{{/if}}\n{{#each xs}}\n- {{.}}\n{{else}}\n- none\n{{/each}}\nc\n'
  assert.equal(render(tpl, { x: true, xs: ['1', '2'] }), 'a\nb\n- 1\n- 2\nc\n')
  assert.equal(render(tpl, { x: false, xs: [] }), 'a\n- none\nc\n')
  // A tag with other text on its line stays inline.
  assert.equal(render('k: {{#if v}}{{v}}{{/if}}\n', { v: '' }), 'k: \n')
})

test('inserted values are never parsed as template syntax', () => {
  assert.equal(render('{{v}}', { v: '{{#if x}}' }), '{{#if x}}')
})

test('syntax errors name the template and line', () => {
  assert.throws(() => compile('ok\n{{#if x}}\nno end', 'card.tmpl'), /card\.tmpl: \{\{#if\}\} from card\.tmpl:2 is never closed/)
  assert.throws(() => compile('{{x | nope}}', 't'), /t:1: unknown filter "nope"/)
  assert.throws(() => compile('{{#loop x}}{{/loop}}', 't'), /unknown block/)
  assert.throws(() => compile('{{#if x}}{{/each}}', 't'), /does not close/)
  assert.throws(() => compile('{{else}}', 't'), /outside an if, unless, or each block/)
})
