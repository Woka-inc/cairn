// Small shared helpers: errors, hashing, file walking, natural sort, glob matching.
// Built-ins only.
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

/** An error that the CLI prints as one line and maps to an exit code. */
export class CairnError extends Error {
  constructor(message, exitCode = 1, details = []) {
    super(message)
    this.name = 'CairnError'
    this.exitCode = exitCode
    this.details = details
  }
}

export const sha256 = (data) => crypto.createHash('sha256').update(data).digest('hex')

/** Collapse whitespace and trim. Non-strings become ''. */
export const oneLine = (value) => (value == null ? '' : String(value)).normalize('NFC').replace(/\s+/g, ' ').trim()

/** Natural, locale-independent comparison: "mod-2" < "mod-10". Deterministic across machines. */
export function naturalCompare(a, b) {
  const re = /(\d+)|(\D+)/g
  const pa = String(a).match(re) ?? []
  const pb = String(b).match(re) ?? []
  const n = Math.min(pa.length, pb.length)
  for (let i = 0; i < n; i += 1) {
    const x = pa[i]
    const y = pb[i]
    if (x === y) continue
    const dx = /^\d/.test(x)
    const dy = /^\d/.test(y)
    if (dx && dy) {
      const bx = BigInt(x)
      const by = BigInt(y)
      if (bx !== by) return bx < by ? -1 : 1
      if (x.length !== y.length) return x.length < y.length ? -1 : 1
      continue
    }
    const lx = x.toLowerCase()
    const ly = y.toLowerCase()
    if (lx !== ly) return lx < ly ? -1 : 1
    return x < y ? -1 : 1
  }
  if (pa.length !== pb.length) return pa.length < pb.length ? -1 : 1
  return 0
}

/** All files under dir as sorted '/'-separated relative paths. Skips dot-folders such as .git. */
export function walkFiles(dir, base = dir, out = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walkFiles(full, base, out)
    else if (entry.isFile()) out.push(path.relative(base, full).split(path.sep).join('/').normalize('NFC'))
  }
  if (dir === base) out.sort()
  return out
}

/** Convert a glob with *, **, ? into a RegExp over '/'-separated paths. */
export function globToRegExp(glob) {
  let re = ''
  for (let i = 0; i < glob.length; i += 1) {
    const c = glob[i]
    if (c === '*') {
      if (glob[i + 1] === '*') {
        const slash = glob[i + 2] === '/'
        re += slash ? '(?:.*/)?' : '.*'
        i += slash ? 2 : 1
      } else {
        re += '[^/]*'
      }
    } else if (c === '?') {
      re += '[^/]'
    } else {
      re += c.replace(/[.+^${}()|[\]\\]/g, '\\$&')
    }
  }
  return new RegExp(`^${re}$`)
}

export const isInside = (child, parent) => {
  const rel = path.relative(parent, child)
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel))
}

export const bytes = (s) => Buffer.byteLength(s, 'utf8')
export const kb = (n) => `${(n / 1024).toFixed(1)}KB`

/** Truncate to n characters (code points) with an ellipsis. */
export function clip(text, n) {
  const chars = [...text]
  return chars.length > n ? `${chars.slice(0, Math.max(0, n - 1)).join('')}…` : text
}

/** Markdown table cell: one line, pipes escaped. */
export const cell = (value) => oneLine(value).replace(/\|/g, '\\|')
