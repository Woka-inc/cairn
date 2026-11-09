// Wayfinding: render the per-question-type rules block and insert it between markers
// in an agent instruction file (CLAUDE.md, AGENTS.md, or a skill file).
import path from 'node:path'
import { CairnError } from './util.mjs'

export const START_MARKER = '<!-- cairn:wayfinding:start -->'
export const END_MARKER = '<!-- cairn:wayfinding:end -->'

const RULE_TITLES = [
  ['topical', 'Topical lookup'],
  ['attribute', 'Attribute filter'],
  ['relation', 'Relation lookup'],
  ['composition', 'Multi-node composition'],
]

function fill(template, values) {
  return template.replace(/\{(\w+)\}/g, (m, key) => (Object.prototype.hasOwnProperty.call(values, key) ? values[key] : m))
}

/** The placeholder values that rule templates may use. */
export function templateValues(config) {
  const vault = config.wayfinding.vaultPath
  const reverseLabels = config.edges.filter((e) => e.reverse).map((e) => e.reverse)
  const parts = []
  if (reverseLabels.length) parts.push(`reverse edges (${reverseLabels.join('; ')})`)
  if (config.sharedNeighbors) parts.push(`two-hop neighbors (${config.sharedNeighbors.label})`)
  const base = { vault }
  const values = {
    vault,
    source: config.sourceDir && config.baseDir ? path.relative(config.baseDir, config.sourceDir).split(path.sep).join('/') : config.source.dir,
    attributes: config.attributes.length ? config.attributes.join(', ') : 'attribute values',
    edges: config.edges.length ? config.edges.map((e) => e.label.toLowerCase()).join(', ') : 'links between nodes',
    expanded: parts.length ? `, which also lists ${parts.join(' and ')}` : '',
    search: fill(config.wayfinding.search, base),
  }
  values.Search = values.search ? values.search[0].toUpperCase() + values.search.slice(1) : ''
  return values
}

/** The wayfinding block, markers included. Deterministic; no timestamps. */
export function renderWayfinding(config) {
  const v = templateValues(config)
  const lines = [
    START_MARKER,
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
  lines.push(END_MARKER)
  return `${lines.join('\n')}\n`
}

/**
 * Insert or replace the block in an instruction file's text.
 * Returns { text, action: 'replaced' | 'appended' | 'unchanged' }.
 */
export function insertBlock(original, block) {
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
