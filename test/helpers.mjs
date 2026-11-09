// Test helpers: temporary knowledge bases and directory snapshots.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { resolveConfig } from '../src/config.mjs'
import { walkFiles } from '../src/util.mjs'

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
export const EXAMPLE_DIR = path.join(ROOT, 'examples', 'quillstone')

export function tempDir(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cairn-test-'))
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }))
  return dir
}

const yamlList = (xs) => `[${xs.join(', ')}]`

/**
 * Write a small KB. nodes: [{ id, title?, attrs?: {k: v}, edges?: {field: [ids]}, body? }]
 * Returns the KB folder.
 */
export function writeKb(dir, nodes) {
  const kb = path.join(dir, 'kb')
  fs.mkdirSync(kb, { recursive: true })
  for (const n of nodes) {
    const fm = ['---', `id: ${n.id}`, `title: ${n.title ?? `Title of ${n.id}`}`]
    for (const [k, v] of Object.entries(n.attrs ?? {})) fm.push(`${k}: ${Array.isArray(v) ? yamlList(v) : v}`)
    for (const [k, v] of Object.entries(n.edges ?? {})) fm.push(`${k}: ${yamlList(v)}`)
    fm.push('---', '')
    fs.writeFileSync(path.join(kb, `${n.id}.md`), `${fm.join('\n')}${n.body ?? `## Overview\n\nBody of ${n.id}.\n`}`)
  }
  return kb
}

/** A resolved config for a KB in dir, with overrides merged at the top level. */
export function makeConfig(dir, overrides = {}) {
  const raw = {
    source: { dir: 'kb' },
    attributes: ['tier'],
    edges: [
      { field: 'depends_on', label: 'Depends on', reverse: 'Used by' },
      { field: 'related', label: 'Related', reverse: 'Related from' },
      { field: 'evidence', label: 'Evidence', reverse: 'Evidence for' },
    ],
    sharedNeighbors: { via: 'evidence', label: 'Shares evidence with', hubThreshold: 3 },
    k: 10,
    output: 'vault',
    ...overrides,
  }
  return resolveConfig(raw, dir)
}

/** Map of relative path -> Buffer for every file under dir (including dotfiles at top level). */
export function snapshot(dir) {
  const out = new Map()
  for (const rel of walkFiles(dir)) out.set(rel, fs.readFileSync(path.join(dir, rel)))
  for (const name of fs.readdirSync(dir)) {
    if (name.startsWith('.') && fs.statSync(path.join(dir, name)).isFile()) out.set(name, fs.readFileSync(path.join(dir, name)))
  }
  return out
}

export const readCard = (config, id) => fs.readFileSync(path.join(config.outDir, 'cards', `${id}.md`), 'utf8')

/** The value after "- <label>" in a card's Relations section. */
export function relationLine(card, labelPrefix) {
  const line = card.split('\n').find((l) => l.startsWith(`- ${labelPrefix}`))
  if (!line) throw new Error(`no relation line starting with "${labelPrefix}"`)
  return line.slice(line.indexOf(': ') + 2)
}
