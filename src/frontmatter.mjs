// Front matter: split a Markdown file into YAML front matter and body, and parse the YAML subset
// that knowledge-base front matter uses in practice. No dependencies.
//
// Supported: mappings, nested mappings, block sequences (also "- key: value" items), flow sequences
// and mappings ([a, "b"], {k: v}), single- and double-quoted strings, plain scalars (also folded
// continuation lines), block scalars (| and > with - or + chomping), comments. Anchors, aliases,
// tags, and multi-document streams are not supported and raise an error with the line number.
// All scalars are returned as strings, except null / ~ / empty, which become null.

export class FrontMatterError extends Error {
  constructor(message, line) {
    super(line ? `line ${line}: ${message}` : message)
    this.name = 'FrontMatterError'
    this.line = line
  }
}

/** Split `---\n...\n---\nbody`. Returns { yaml: string|null, body, yamlStartLine }. */
export function splitFrontMatter(text) {
  const src = String(text).replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n')
  if (!src.startsWith('---\n') && src !== '---') return { yaml: null, body: src, yamlStartLine: 0 }
  const lines = src.split('\n')
  for (let i = 1; i < lines.length; i += 1) {
    if (lines[i] === '---' || lines[i] === '...') {
      return { yaml: lines.slice(1, i).join('\n'), body: lines.slice(i + 1).join('\n'), yamlStartLine: 2 }
    }
  }
  throw new FrontMatterError('front matter starts with --- but has no closing --- line', 1)
}

const isBlank = (line) => /^\s*(#.*)?$/.test(line)
const indentOf = (line) => line.match(/^ */)[0].length
const isSeqItem = (text) => text === '-' || text.startsWith('- ')

/** Remove a trailing " # comment" that is outside quotes. */
function stripComment(text) {
  let quote = null
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i]
    if (quote) {
      if (c === '\\' && quote === '"') i += 1
      else if (c === quote) quote = null
    } else if (c === '"' || c === "'") {
      quote = c
    } else if (c === '#' && (i === 0 || /\s/.test(text[i - 1]))) {
      return text.slice(0, i).trimEnd()
    }
  }
  return text.trimEnd()
}

/** Index of the ':' that ends a mapping key (followed by space or end), or -1. */
function keyColon(text) {
  if (text.startsWith('"') || text.startsWith("'")) {
    const q = text[0]
    let i = 1
    for (; i < text.length; i += 1) {
      if (q === '"' && text[i] === '\\') { i += 1; continue }
      if (text[i] === q) {
        if (q === "'" && text[i + 1] === "'") { i += 1; continue }
        break
      }
    }
    const rest = text.slice(i + 1)
    const m = rest.match(/^\s*:(\s|$)/)
    return m ? i + 1 + m[0].indexOf(':') : -1
  }
  const m = text.match(/:(\s|$)/)
  if (!m) return -1
  // A flow collection or quoted scalar is a value, not a key.
  if (/^[[{]/.test(text)) return -1
  return m.index
}

function unquote(text, line) {
  if (text.startsWith('"')) {
    if (!text.endsWith('"') || text.length < 2) throw new FrontMatterError('unterminated double-quoted string', line)
    try {
      return JSON.parse(text.replace(/\\'/g, "'").replace(/\t/g, '\\t'))
    } catch {
      return text.slice(1, -1)
    }
  }
  if (text.startsWith("'")) {
    if (!text.endsWith("'") || text.length < 2) throw new FrontMatterError('unterminated single-quoted string', line)
    return text.slice(1, -1).replace(/''/g, "'")
  }
  return text
}

function plainScalar(text, line) {
  const t = text.trim()
  if (t === '' || t === '~' || t === 'null' || t === 'Null' || t === 'NULL') return null
  if (/^[&*!]/.test(t)) throw new FrontMatterError(`anchors, aliases, and tags are not supported: ${t.slice(0, 20)}`, line)
  if (t.startsWith('"') || t.startsWith("'")) return unquote(t, line)
  return t
}

/** Parse an inline value: quoted, flow collection, or plain. */
function inlineValue(text, line) {
  const t = text.trim()
  if (t.startsWith('[') || t.startsWith('{')) {
    const p = { s: t, i: 0, line }
    const value = flowValue(p)
    skipSpaces(p)
    if (p.i !== t.length) throw new FrontMatterError(`unexpected text after flow collection: ${t.slice(p.i, p.i + 20)}`, line)
    return value
  }
  return plainScalar(t, line)
}

function skipSpaces(p) {
  while (p.i < p.s.length && /\s/.test(p.s[p.i])) p.i += 1
}

function flowValue(p) {
  skipSpaces(p)
  const c = p.s[p.i]
  if (c === '[') {
    p.i += 1
    const out = []
    for (;;) {
      skipSpaces(p)
      if (p.s[p.i] === ']') { p.i += 1; return out }
      out.push(flowValue(p))
      skipSpaces(p)
      if (p.s[p.i] === ',') { p.i += 1; continue }
      if (p.s[p.i] === ']') { p.i += 1; return out }
      throw new FrontMatterError('expected , or ] in flow sequence', p.line)
    }
  }
  if (c === '{') {
    p.i += 1
    const out = {}
    for (;;) {
      skipSpaces(p)
      if (p.s[p.i] === '}') { p.i += 1; return out }
      const key = flowScalar(p, true)
      skipSpaces(p)
      if (p.s[p.i] !== ':') throw new FrontMatterError('expected : in flow mapping', p.line)
      p.i += 1
      out[String(key ?? '')] = flowValue(p)
      skipSpaces(p)
      if (p.s[p.i] === ',') { p.i += 1; continue }
      if (p.s[p.i] === '}') { p.i += 1; return out }
      throw new FrontMatterError('expected , or } in flow mapping', p.line)
    }
  }
  return flowScalar(p, false)
}

function flowScalar(p, isKey) {
  skipSpaces(p)
  const c = p.s[p.i]
  if (c === '"' || c === "'") {
    let j = p.i + 1
    for (; j < p.s.length; j += 1) {
      if (c === '"' && p.s[j] === '\\') { j += 1; continue }
      if (p.s[j] === c) {
        if (c === "'" && p.s[j + 1] === "'") { j += 1; continue }
        break
      }
    }
    if (j >= p.s.length) throw new FrontMatterError('unterminated quoted string in flow collection', p.line)
    const raw = p.s.slice(p.i, j + 1)
    p.i = j + 1
    return unquote(raw, p.line)
  }
  if (c === '[' || c === '{') return flowValue(p)
  const stop = isKey ? /[,:\]}]/ : /[,\]}]/
  let j = p.i
  while (j < p.s.length && !stop.test(p.s[j])) j += 1
  const raw = p.s.slice(p.i, j)
  p.i = j
  return plainScalar(raw, p.line)
}

/** Parse the YAML subset. lineOffset maps local line numbers to file line numbers. */
export function parseYaml(yaml, lineOffset = 1) {
  const lines = String(yaml ?? '').replace(/\t/g, '    ').split('\n')
  const n = lines.length
  let i = 0
  const lineNo = (k) => k + lineOffset

  const skipBlank = () => {
    while (i < n && isBlank(lines[i])) i += 1
  }

  function parseNode(minIndent) {
    skipBlank()
    if (i >= n) return null
    const d = indentOf(lines[i])
    if (d < minIndent) return null
    const text = lines[i].slice(d)
    if (isSeqItem(text)) return parseSeq(d)
    if (keyColon(stripComment(text)) >= 0) return parseMap(d)
    // A lone scalar on its own line (unusual but valid).
    const value = inlineValue(stripComment(text), lineNo(i))
    i += 1
    return value
  }

  function blockScalar(indicator, parentIndent) {
    const folded = indicator[0] === '>'
    const chomp = indicator[1] ?? ''
    const collected = []
    let blockIndent = null
    while (i < n) {
      const line = lines[i]
      if (line.trim() === '') { collected.push(''); i += 1; continue }
      const d = indentOf(line)
      if (d <= parentIndent) break
      if (blockIndent === null) blockIndent = d
      if (d < blockIndent) break
      collected.push(line.slice(blockIndent))
      i += 1
    }
    while (collected.length && collected[collected.length - 1] === '' && chomp !== '+') collected.pop()
    let text
    if (folded) {
      text = ''
      for (let k = 0; k < collected.length; k += 1) {
        const l = collected[k]
        if (l === '') text += '\n'
        else text += (text && !text.endsWith('\n') ? ' ' : '') + l
      }
    } else {
      text = collected.join('\n')
    }
    return chomp === '-' ? text : `${text}\n`
  }

  function parseMap(indent) {
    const obj = {}
    for (;;) {
      skipBlank()
      if (i >= n) break
      const d = indentOf(lines[i])
      if (d < indent) break
      if (d > indent) throw new FrontMatterError('unexpected indentation', lineNo(i))
      const raw = lines[i].slice(d)
      if (isSeqItem(raw)) break
      const text = stripComment(raw)
      const colon = keyColon(text)
      if (colon < 0) throw new FrontMatterError(`expected "key: value", got: ${text.slice(0, 40)}`, lineNo(i))
      const keyText = text.slice(0, colon).trim()
      const key = String(keyText.startsWith('"') || keyText.startsWith("'") ? unquote(keyText, lineNo(i)) : keyText)
      if (Object.prototype.hasOwnProperty.call(obj, key)) throw new FrontMatterError(`duplicate key: ${key}`, lineNo(i))
      const rest = text.slice(colon + 1).trim()
      const at = i
      i += 1
      if (rest === '') {
        skipBlank()
        if (i < n && (indentOf(lines[i]) > indent || (indentOf(lines[i]) === indent && isSeqItem(lines[i].slice(indent))))) {
          obj[key] = indentOf(lines[i]) === indent ? parseSeq(indent) : parseNode(indent + 1)
        } else {
          obj[key] = null
        }
      } else if (/^[|>][+-]?$/.test(rest)) {
        obj[key] = blockScalar(rest, indent)
      } else {
        let value = inlineValue(rest, lineNo(at))
        // Plain scalars may continue on more-indented lines.
        if (typeof value === 'string' && !/^["'[{]/.test(rest)) {
          while (i < n && !isBlank(lines[i]) && indentOf(lines[i]) > indent) {
            if (keyColon(stripComment(lines[i].trim())) >= 0) throw new FrontMatterError('unexpected indentation (a key nested under a scalar value?)', lineNo(i))
            value += ` ${stripComment(lines[i].trim())}`
            i += 1
          }
        }
        obj[key] = value
      }
    }
    return obj
  }

  function parseSeq(indent) {
    const arr = []
    for (;;) {
      skipBlank()
      if (i >= n) break
      const d = indentOf(lines[i])
      if (d < indent) break
      if (d > indent) throw new FrontMatterError('unexpected indentation in sequence', lineNo(i))
      const raw = lines[i].slice(d)
      if (!isSeqItem(raw)) break
      const after = raw === '-' ? '' : raw.slice(1)
      const rest = stripComment(after).trim()
      if (rest === '') {
        i += 1
        arr.push(parseNode(indent + 1))
      } else if (/^[|>][+-]?$/.test(rest)) {
        i += 1
        arr.push(blockScalar(rest, indent))
      } else if (keyColon(rest) >= 0) {
        // "- key: value" starts a mapping whose keys align with "key".
        const contentIndent = d + 1 + (after.length - after.trimStart().length)
        lines[i] = ' '.repeat(contentIndent) + after.trimStart()
        arr.push(parseMap(contentIndent))
      } else {
        const at = i
        i += 1
        let value = inlineValue(rest, lineNo(at))
        if (typeof value === 'string' && !/^["'[{]/.test(rest)) {
          while (i < n && !isBlank(lines[i]) && indentOf(lines[i]) > indent && !isSeqItem(lines[i].trim())) {
            if (keyColon(stripComment(lines[i].trim())) >= 0) throw new FrontMatterError('unexpected indentation (a key nested under a scalar value?)', lineNo(i))
            value += ` ${stripComment(lines[i].trim())}`
            i += 1
          }
        }
        arr.push(value)
      }
    }
    return arr
  }

  skipBlank()
  if (i >= n) return {}
  const d = indentOf(lines[i])
  const first = lines[i].slice(d)
  if (isSeqItem(first)) throw new FrontMatterError('front matter must be a mapping, not a sequence', lineNo(i))
  const result = parseMap(d)
  skipBlank()
  if (i < n) throw new FrontMatterError('could not parse this line', lineNo(i))
  return result
}

/** Split and parse. Returns { data, body }. Throws FrontMatterError with file line numbers. */
export function readFrontMatter(text) {
  const { yaml, body, yamlStartLine } = splitFrontMatter(text)
  if (yaml == null) return { data: {}, body, hasFrontMatter: false }
  return { data: parseYaml(yaml, yamlStartLine), body, hasFrontMatter: true }
}
