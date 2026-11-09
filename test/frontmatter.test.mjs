// The YAML subset used in front matter.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { FrontMatterError, parseYaml, readFrontMatter, splitFrontMatter } from '../src/frontmatter.mjs'

test('scalars, quotes, comments, and nulls', () => {
  const data = parseYaml([
    'id: mod-1 # trailing comment',
    'title: "Quoted: with colon"',
    "single: 'it''s'",
    'empty:',
    'tilde: ~',
    'number: 42',
    'url: https://example.test/a#b',
  ].join('\n'))
  assert.deepEqual(data, { id: 'mod-1', title: 'Quoted: with colon', single: "it's", empty: null, tilde: null, number: '42', url: 'https://example.test/a#b' })
})

test('flow and block sequences, nested maps, and "- key: value" items', () => {
  const data = parseYaml([
    'tags: [a, "b, c", d]',
    'deps:',
    '  - core',
    '  - io',
    'same_indent:',
    '- x',
    '- y',
    'chapters:',
    '  - title: One',
    '    goal: First',
    '  - title: Two',
    'meta:',
    '  owner: team-a',
    '  inline: {k: v, n: [1, 2]}',
  ].join('\n'))
  assert.deepEqual(data.tags, ['a', 'b, c', 'd'])
  assert.deepEqual(data.deps, ['core', 'io'])
  assert.deepEqual(data.same_indent, ['x', 'y'])
  assert.deepEqual(data.chapters, [{ title: 'One', goal: 'First' }, { title: 'Two' }])
  assert.deepEqual(data.meta, { owner: 'team-a', inline: { k: 'v', n: ['1', '2'] } })
})

test('block scalars and folded plain scalars', () => {
  const data = parseYaml(['lit: |', '  line one', '  line two', 'fold: >-', '  a', '  b', '', '  c', 'plain: long text', '  continues here'].join('\n'))
  assert.equal(data.lit, 'line one\nline two\n')
  assert.equal(data.fold, 'a b\nc')
  assert.equal(data.plain, 'long text continues here')
})

test('errors carry file line numbers', () => {
  assert.throws(() => readFrontMatter('---\nid: x\n  bad: indent\n---\n'), (e) => e instanceof FrontMatterError && e.line === 3)
  assert.throws(() => readFrontMatter('---\nid: x\nid: y\n---\n'), /line 3: duplicate key: id/)
  assert.throws(() => readFrontMatter('---\nref: *anchor\n---\n'), /anchors, aliases, and tags are not supported/)
  assert.throws(() => splitFrontMatter('---\nid: x\n'), /no closing ---/)
})

test('files without front matter, CRLF, and BOM', () => {
  assert.deepEqual(readFrontMatter('# Just a note\n'), { data: {}, body: '# Just a note\n', hasFrontMatter: false })
  const r = readFrontMatter('\uFEFF---\r\nid: a\r\n---\r\nBody\r\n')
  assert.deepEqual(r.data, { id: 'a' })
  assert.equal(r.body, 'Body\n')
})
