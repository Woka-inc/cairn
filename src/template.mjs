// Templates: a small, dependency-free template language for overriding the layout of generated files
// (cards, bodies, CATALOG, INDEX, intermediate notes, attribute notes, and the wayfinding block).
//
//   {{path}}                         insert a value: a dotted path (`node.title`), `.` (the current item),
//                                    @index / @number / @first / @last inside each, or a "string literal"
//   {{path | filter:arg | filter}}   pipe the value through filters (see FILTERS)
//   {{#if expr}} … {{else}} … {{/if}}          {{#unless expr}} … {{/unless}}
//   {{#each expr sep=", "}} … {{else}} … {{/each}}   loop; `sep` goes between items; else runs when empty
//   {{#with expr}} … {{/with}}                  make a value the current item
//   {{#filter json}} … {{/filter}}              render the inside, then pipe the text through filters
//   {{! comment }}
//
// A line that holds nothing but one block tag ({{#…}}, {{else}}, {{/…}}, {{!…}}) and spaces is removed together
// with its line break, so block tags can sit on their own lines without leaving blank lines behind.
// Falsy values: undefined, null, false, 0, '', and empty arrays. Inserted values are never re-parsed.
import { CairnError, oneLine } from './util.mjs'

const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)

/** Text for an inserted value: arrays are joined with ", ", objects become "key: value; …". */
export function valueText(value) {
  if (value == null || value === false) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) return value.map(valueText).filter((s) => s !== '').join(', ')
  return Object.entries(value).map(([k, v]) => `${k}: ${valueText(v)}`).join('; ')
}

const truthy = (v) => !(v == null || v === false || v === 0 || v === '' || (Array.isArray(v) && v.length === 0))
const asArray = (v) => (Array.isArray(v) ? v : v == null || v === '' ? [] : [v])
const chars = (s) => [...String(s)]

/** Filters. Each receives the value and its arguments (strings or numbers). */
export const FILTERS = {
  json: (v) => JSON.stringify(v === undefined ? null : v),
  oneLine: (v) => oneLine(valueText(v)),
  trim: (v) => valueText(v).replace(/^\s+/, '').replace(/\s+$/, ''),
  trimEnd: (v) => valueText(v).replace(/\s+$/, ''),
  upper: (v) => valueText(v).toUpperCase(),
  lower: (v) => valueText(v).toLowerCase(),
  /** Strings and numbers of a value (a single value becomes a one-item list), each collapsed to one line. */
  list: (v) => asArray(v).filter((x) => typeof x === 'string' || typeof x === 'number').map((x) => oneLine(x)),
  /** Drop empty items from a list. */
  compact: (v) => asArray(v).filter(truthy),
  /** The given field of every object in a list (non-objects become undefined). */
  pluck: (v, field) => asArray(v).map((x) => (isObject(x) ? x[field] : undefined)),
  join: (v, sep = ', ') => asArray(v).map(valueText).join(String(sep)),
  count: (v) => (Array.isArray(v) ? v.length : typeof v === 'string' ? chars(v).length : v == null ? 0 : 1),
  /** At most n characters in total, the last one an ellipsis when cut. */
  clip: (v, n) => { const c = chars(valueText(v)); return c.length > n ? `${c.slice(0, Math.max(0, n - 1)).join('')}…` : c.join('') },
  /** The first n characters followed by an ellipsis when cut (n + 1 characters in total). */
  truncate: (v, n) => { const c = chars(valueText(v)); return c.length > n ? `${c.slice(0, n).join('')}…` : c.join('') },
  /** A Markdown table cell: one line, with "|" replaced (default "\|"). */
  cell: (v, pipe = '\\|') => oneLine(valueText(v)).replace(/\|/g, String(pipe)),
  default: (v, fallback = '') => (truthy(v) ? v : fallback),
}

// ── parsing ──────────────────────────────────────────────────────────────────
function splitOutside(text, sep) {
  const parts = []
  let cur = ''
  let quote = false
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i]
    if (quote) {
      cur += c
      if (c === '\\') { cur += text[i + 1] ?? ''; i += 1 } else if (c === '"') quote = false
    } else if (c === '"') { quote = true; cur += c } else if (c === sep) { parts.push(cur); cur = '' } else cur += c
  }
  parts.push(cur)
  return parts
}

function literal(token, where) {
  const t = token.trim()
  if (t.startsWith('"')) {
    try { return JSON.parse(t) } catch { throw new CairnError(`${where}: bad string ${t}`) }
  }
  if (/^-?\d+(\.\d+)?$/.test(t)) return Number(t)
  return t
}

function parseExpr(text, where) {
  const [head, ...filters] = splitOutside(text, '|').map((s) => s.trim())
  if (!head) throw new CairnError(`${where}: empty expression`)
  const value = head.startsWith('"') ? { literal: literal(head, where) } : { path: head }
  if (value.literal === undefined && !/^(\.|@?[\w$-]+(\.[\w$-]+)*)$/.test(head)) throw new CairnError(`${where}: bad path "${head}"`)
  const chain = filters.map((f) => {
    const [name, ...args] = splitOutside(f, ':').map((s) => s.trim())
    if (!Object.prototype.hasOwnProperty.call(FILTERS, name)) throw new CairnError(`${where}: unknown filter "${name}" (known: ${Object.keys(FILTERS).join(', ')})`)
    return { name, args: args.map((a) => literal(a, where)) }
  })
  return { ...value, chain }
}

function parseFilterChain(text, where) {
  // "#filter json | trim" — the text is a chain without a head value.
  return parseExpr(`"" | ${text}`, where).chain
}

/** Remove lines that hold only one block tag (and spaces), together with their line break. */
function stripStandalone(src) {
  const lines = src.split('\n')
  let out = ''
  lines.forEach((line, i) => {
    const last = i === lines.length - 1
    const m = line.match(/^[ \t]*(\{\{\s*(?:[#/!][\s\S]*?|else\s*)\}\})[ \t]*$/)
    if (m && line.split('{{').length === 2) out += m[1]
    else out += line + (last ? '' : '\n')
  })
  return out
}

/** Compile a template into a tree. Throws CairnError with the template name on syntax errors. */
export function compile(source, name = 'template') {
  const src = stripStandalone(String(source).replace(/\r\n?/g, '\n'))
  const root = { type: 'root', children: [] }
  const stack = [root]
  const top = () => stack[stack.length - 1]
  const push = (item) => { const t = top(); (t.alt ?? t.children).push(item) }
  const re = /\{\{([\s\S]*?)\}\}/g
  let last = 0
  let m
  const lineOf = (index) => src.slice(0, index).split('\n').length
  while ((m = re.exec(src))) {
    if (m.index > last) push({ type: 'text', value: src.slice(last, m.index) })
    last = re.lastIndex
    const where = `${name}:${lineOf(m.index)}`
    const body = m[1].trim()
    if (body.startsWith('!')) continue
    if (body.startsWith('#')) {
      const kw = body.slice(1).match(/^(\w+)\s*([\s\S]*)$/)
      if (!kw || !['if', 'unless', 'each', 'with', 'filter'].includes(kw[1])) throw new CairnError(`${where}: unknown block "${body}"`)
      let rest = kw[2]
      let sep = ''
      if (kw[1] === 'each') {
        const s = rest.match(/\s+sep=("(?:[^"\\]|\\.)*")\s*$/)
        if (s) { sep = literal(s[1], where); rest = rest.slice(0, s.index) }
      }
      const node = { type: kw[1], children: [], alt: null, where, sep }
      if (kw[1] === 'filter') node.chain = parseFilterChain(rest, where)
      else node.expr = parseExpr(rest, where)
      push(node)
      stack.push(node)
      continue
    }
    if (body === 'else') {
      const node = top()
      if (!['if', 'unless', 'each'].includes(node.type) || node.alt) throw new CairnError(`${where}: {{else}} outside an if, unless, or each block`)
      node.alt = []
      continue
    }
    if (body.startsWith('/')) {
      const kw = body.slice(1).trim()
      const node = top()
      if (node.type !== kw) throw new CairnError(`${where}: {{/${kw}}} does not close ${node.type === 'root' ? 'any block' : `{{#${node.type}}} from ${node.where}`}`)
      stack.pop()
      continue
    }
    push({ type: 'value', expr: parseExpr(body, where) })
  }
  if (last < src.length) push({ type: 'text', value: src.slice(last) })
  if (stack.length > 1) throw new CairnError(`${name}: {{#${top().type}}} from ${top().where} is never closed`)
  return root
}

// ── rendering ────────────────────────────────────────────────────────────────
function lookup(scopes, path) {
  if (path === '.') return scopes[scopes.length - 1].value
  const [first, ...rest] = path.split('.')
  let value
  if (first.startsWith('@')) {
    const frame = [...scopes].reverse().find((s) => s.loop)
    value = frame ? frame.loop[first.slice(1)] : undefined
  } else {
    const scope = [...scopes].reverse().find((s) => isObject(s.value) && Object.prototype.hasOwnProperty.call(s.value, first))
    value = scope ? scope.value[first] : undefined
  }
  for (const key of rest) value = value == null ? undefined : value[key]
  return value
}

function evaluate(expr, scopes) {
  let value = expr.literal !== undefined ? expr.literal : lookup(scopes, expr.path)
  for (const f of expr.chain) value = FILTERS[f.name](value, ...f.args)
  return value
}

function renderNodes(nodes, scopes) {
  let out = ''
  for (const node of nodes) {
    switch (node.type) {
      case 'text': out += node.value; break
      case 'value': out += valueText(evaluate(node.expr, scopes)); break
      case 'if':
      case 'unless': {
        const ok = truthy(evaluate(node.expr, scopes)) === (node.type === 'if')
        out += renderNodes(ok ? node.children : node.alt ?? [], scopes)
        break
      }
      case 'with': {
        const v = evaluate(node.expr, scopes)
        if (truthy(v)) out += renderNodes(node.children, [...scopes, { value: v }])
        break
      }
      case 'each': {
        const list = asArray(evaluate(node.expr, scopes))
        if (!list.length) { out += renderNodes(node.alt ?? [], scopes); break }
        out += list.map((item, i) => renderNodes(node.children, [...scopes, { value: item, loop: { index: i, number: i + 1, first: i === 0, last: i === list.length - 1 } }])).join(node.sep)
        break
      }
      case 'filter': {
        let v = renderNodes(node.children, scopes)
        for (const f of node.chain) v = FILTERS[f.name](v, ...f.args)
        out += valueText(v)
        break
      }
      default: throw new CairnError(`unknown template node ${node.type}`)
    }
  }
  return out
}

/** Render a compiled template (or template source) against a context object. */
export function render(template, context, name) {
  const tree = typeof template === 'string' ? compile(template, name) : template
  return renderNodes(tree.children, [{ value: context }])
}
