#!/usr/bin/env node
// Pre-publication check: scans every text file in the repository for content that must not be
// published, and prints counts per category (never the matched values). Exit 1 if anything is found.
//
// Categories: Hangul outside the Korean documents, absolute home-directory paths, private hosts and
// IP addresses, tokens and keys, e-mail addresses, and an optional deny-list of names or terms kept
// outside the repository (CAIRN_PRECHECK_DENYLIST=<file>, one term per line).
//
//   node scripts/precheck.mjs [--verbose]     (--verbose prints file:line for each hit, still no values)
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const KOREAN_ALLOWED = new Set(['README.ko.md', 'INSTALL_PROMPT.ko.md', 'docs/measure.ko.md'])
const SKIP_DIRS = new Set(['.git', 'node_modules'])
const TEXT_EXT = /\.(md|mjs|js|json|jsonl|cff|yml|yaml|sh|txt|sample)$|^(LICENSE[^/]*|\.gitignore|\.gitattributes|\.nvmrc)$/

const HOME = '/' + 'Users/'
const LANG_LINK = /\[\uD55C\uAD6D\uC5B4\]\([^)\s]*\.ko\.md\)/g
const CATEGORIES = [
  ['hangul outside Korean docs', /[\u1100-\u11ff\u3130-\u318f\uac00-\ud7a3]/g, (rel) => !KOREAN_ALLOWED.has(rel)],
  ['absolute home paths', new RegExp(`${HOME}[A-Za-z0-9._-]+|/home/[a-z][a-z0-9._-]+/|[A-Z]:\\\\Users\\\\`, 'g')],
  ['private hosts', /\b(?:[a-z0-9-]+\.)*woka\.kr\b|\bstaging\.[a-z0-9-]+\.[a-z]{2,}\b|\blocalhost:\d+\b|[.]internal\b|[.]local\b/gi],
  ['IP addresses', /(?<![\d.])(?:\d{1,3}\.){3}\d{1,3}(?![\d.])/g],
  ['tokens and keys', /\bwk_[A-Za-z0-9]{8,}|\bsk-[A-Za-z0-9_-]{16,}|\bghp_[A-Za-z0-9]{20,}|\bgithub_pat_[A-Za-z0-9_]{20,}|\bAKIA[0-9A-Z]{16}\b|\bxox[abprs]-[A-Za-z0-9-]{10,}|-----BEGIN [A-Z ]*PRIVATE KEY-----/g],
  ['e-mail addresses', /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g],
]

function walk(dir, base = dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
    if (SKIP_DIRS.has(entry.name)) continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, base, out)
    else if (entry.isFile()) out.push(path.relative(base, full).split(path.sep).join('/'))
  }
  return out
}

function denyList() {
  const file = process.env.CAIRN_PRECHECK_DENYLIST
  if (!file) return []
  return fs.readFileSync(file, 'utf8').split(/\r?\n/).map((s) => s.trim()).filter((s) => s && !s.startsWith('#'))
}

export function scan(root = ROOT, terms = denyList()) {
  const files = walk(root).filter((rel) => TEXT_EXT.test(path.posix.basename(rel)) || TEXT_EXT.test(rel))
  const counts = Object.fromEntries([...CATEGORIES.map(([name]) => name), 'deny-list terms'].map((n) => [n, 0]))
  const hits = []
  for (const rel of files) {
    const lines = fs.readFileSync(path.join(root, rel), 'utf8').split('\n')
    lines.forEach((line, i) => {
      for (const [name, re, applies] of CATEGORIES) {
        if (applies && !applies(rel)) continue
        // The language switcher "[<Korean>](README.ko.md)" is the one Korean word allowed in English files.
        const text = name.startsWith('hangul') ? line.replace(LANG_LINK, '') : line
        const n = (text.match(re) ?? []).length
        if (n) { counts[name] += n; hits.push(`${rel}:${i + 1}: ${name}`) }
      }
      for (const term of terms) {
        if (line.toLowerCase().includes(term.toLowerCase())) { counts['deny-list terms'] += 1; hits.push(`${rel}:${i + 1}: deny-list term`) }
      }
    })
  }
  return { files: files.length, counts, hits, denyTerms: terms.length }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === fs.realpathSync(process.argv[1])) {
  const res = scan()
  process.stdout.write(`precheck: scanned ${res.files} text files${res.denyTerms ? ` with ${res.denyTerms} deny-list terms` : ' (no deny-list given)'}\n`)
  for (const [name, n] of Object.entries(res.counts)) process.stdout.write(`  ${String(n).padStart(4)}  ${name}\n`)
  if (process.argv.includes('--verbose')) for (const h of res.hits) process.stdout.write(`  ${h}\n`)
  const total = Object.values(res.counts).reduce((a, b) => a + b, 0)
  process.stdout.write(total ? `precheck: FAILED (${total} hits)\n` : 'precheck: passed (0 hits)\n')
  process.exitCode = total ? 1 : 0
}
