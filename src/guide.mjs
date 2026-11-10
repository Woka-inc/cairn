// Wayfinding: render the per-question-type rules block and insert it between markers
// in an agent instruction file (CLAUDE.md, AGENTS.md, or a skill file).
import fs from 'node:fs'
import path from 'node:path'
import { DEFAULT_MARKERS } from './config.mjs'
import { render } from './template.mjs'
import { CairnError } from './util.mjs'

export const START_MARKER = DEFAULT_MARKERS.start
export const END_MARKER = DEFAULT_MARKERS.end

const RULE_TITLES = [
  ['topical', 'Topical lookup'],
  ['attribute', 'Attribute filter'],
  ['relation', 'Relation lookup'],
  ['composition', 'Multi-node composition'],
]

function fill(template, values) {
  return template.replace(/\{(\w+)\}/g, (m, key) => (Object.prototype.hasOwnProperty.call(values, key) ? values[key] : m))
}

/**
 * The folder that paths in the block are written relative to: the folder of the instruction file the block
 * is written into (`file`), else of wayfinding.instructionFile, else the folder that holds the config.
 */
export function blockBase(config, file = null) {
  if (file) return path.dirname(path.resolve(file))
  if (config.instructionPath) return path.dirname(config.instructionPath)
  return config.baseDir ?? null
}

const relPath = (from, to) => path.relative(from, to).split(path.sep).join('/') || '.'

/** The placeholder values that rule templates may use. Paths are relative to the instruction file (see blockBase). */
export function templateValues(config, { file = null } = {}) {
  const from = blockBase(config, file)
  const vault = config.wayfinding.vaultPath ?? (from && config.outDir ? relPath(from, config.outDir) : config.output)
  const reverseLabels = config.edges.filter((e) => e.reverse).map((e) => e.reverse)
  const parts = []
  if (reverseLabels.length) parts.push(`reverse edges (${reverseLabels.join('; ')})`)
  if (config.sharedNeighbors) parts.push(`two-hop neighbors (${config.sharedNeighbors.label})`)
  const layoutPath = (pattern) => `${vault}/${pattern.replace(/\{(stem|id)\}/g, '<id>')}`
  const dirOf = (pattern) => { const dir = path.posix.dirname(pattern); return dir === '.' ? vault : `${vault}/${dir}` }
  const layout = config.layout ?? { cards: 'cards/{stem}.md', bodies: 'bodies/{stem}.md' }
  const base = { vault, card: layoutPath(layout.cards), cardsDir: dirOf(layout.cards), body: layoutPath(layout.bodies), bodiesDir: dirOf(layout.bodies) }
  const values = {
    ...base,
    source: from && config.sourceDir ? relPath(from, config.sourceDir) : config.source.dir,
    attributes: config.attributes.length ? config.attributes.join(', ') : 'attribute values',
    edges: config.edges.length ? config.edges.map((e) => e.label.toLowerCase()).join(', ') : 'links between nodes',
    expanded: parts.length ? `, which also lists ${parts.join(' and ')}` : '',
    omitted: config.kindField ? ` Rows for relations that no node of the same ${config.kindField} has are left out.` : '',
    search: fill(config.wayfinding.search, base),
  }
  values.Search = values.search ? values.search[0].toUpperCase() + values.search.slice(1) : ''
  return values
}

/**
 * The wayfinding block, markers included. Deterministic; no timestamps.
 * `file` is the instruction file the block is meant for; paths in the block are relative to its folder.
 */
export function renderWayfinding(config, { file = null } = {}) {
  const v = templateValues(config, { file })
  const { start, end } = config.wayfinding.markers ?? DEFAULT_MARKERS
  if (config.templatePaths?.wayfinding) {
    // A wayfinding template replaces everything between the markers; its context is the placeholder values.
    const inner = render(fs.readFileSync(config.templatePaths.wayfinding, 'utf8'), v, path.basename(config.templatePaths.wayfinding)).replace(/\n+$/, '')
    return `${start}\n${inner}\n${end}\n`
  }
  const lines = [
    start,
    '## Knowledge-base lookup (Cairn)',
    '',
    `The Cairn vault in \`${v.vault}/\` is generated from \`${v.source}/\`; do not edit it. Decide the question type first, then start where its rule says.`,
    '',
  ]
  for (const [key] of RULE_TITLES) lines.push(`- ${fill(config.wayfinding.rules[key], v)}`)
  for (const extra of config.wayfinding.extraRules) lines.push(`- ${fill(extra, v)}`)
  if (config.wayfinding.general.length) {
    lines.push('', 'General rules:')
    for (const rule of config.wayfinding.general) lines.push(`- ${fill(rule, v)}`)
  }
  lines.push(end)
  return `${lines.join('\n')}\n`
}

/**
 * Insert or replace the block in an instruction file's text.
 * Returns { text, action: 'replaced' | 'appended' | 'unchanged' }.
 */
export function insertBlock(original, block, markers = DEFAULT_MARKERS) {
  const START_MARKER = markers.start
  const END_MARKER = markers.end
  const text = String(original ?? '')
  const starts = text.split(START_MARKER).length - 1
  const ends = text.split(END_MARKER).length - 1
  const clean = block.replace(/\n+$/, '')
  if (starts === 0 && ends === 0) {
    const sep = text === '' ? '' : text.endsWith('\n\n') ? '' : text.endsWith('\n') ? '\n' : '\n\n'
    return { text: `${text}${sep}${clean}\n`, action: 'appended' }
  }
  if (starts !== 1 || ends !== 1) {
    throw new CairnError(`the file has ${starts} start and ${ends} end Cairn markers; expected exactly one of each (fix it by hand)`, 1)
  }
  const a = text.indexOf(START_MARKER)
  const b = text.indexOf(END_MARKER)
  if (b < a) throw new CairnError('the Cairn end marker comes before the start marker (fix it by hand)', 1)
  const next = text.slice(0, a) + clean + text.slice(b + END_MARKER.length)
  return { text: next, action: next === text ? 'unchanged' : 'replaced' }
}
