// Configuration: load cairn.config.json, apply defaults, and validate with clear errors.
// Every relative path in the config is resolved against the folder that holds the config file.
import fs from 'node:fs'
import path from 'node:path'
import { CairnError, isInside } from './util.mjs'

export const FILENAME_ID = '$filename'

export const DEFAULT_GENERAL_RULES = Object.freeze([
  'Open full bodies (`{body}`) only when a card does not contain what you need.',
  'If one route is insufficient, verify through a second route.',
  'Read vault files with file-reading and search tools, not shell commands.',
  'Use node identifiers exactly as they appear in the files or tool output.',
])

export const DEFAULT_RULES = Object.freeze({
  topical: 'Topical lookup (nodes whose content matches a topic): {search}. Open the best-matching cards; if there are no hits, search the full texts in `{bodiesDir}/`.',
  attribute: 'Attribute filter (select nodes by {attributes}): read `{vault}/CATALOG.md`, one row per node, instead of opening cards one by one.',
  relation: 'Relation lookup ({edges}): open `{card}` and read its Relations section{expanded}. "none" means no such neighbor exists.{omitted} A list is truncated only when it ends with "(K of N shown — reason)"; only then find the rest in the edge columns of `{vault}/CATALOG.md`, otherwise do not search further.',
  composition: 'Multi-node composition (several nodes that together cover several topics): run one search per topic, then combine and order the candidates with the columns of `{vault}/CATALOG.md`.',
})

export const DEFAULT_SEARCH = 'search the cards in `{cardsDir}/` for the topic\'s keywords with a file-search tool'

export const DEFAULT_MARKERS = Object.freeze({ start: '<!-- cairn:wayfinding:start -->', end: '<!-- cairn:wayfinding:end -->' })
export const DEFAULT_LAYOUT = Object.freeze({ cards: 'cards/{stem}.md', bodies: 'bodies/{stem}.md', wayfinding: 'WAYFINDING.md' })
export const TEMPLATE_KEYS = ['card', 'body', 'catalog', 'index', 'note', 'attributeNote', 'wayfinding']
/** Characters replaced by "-" in attribute-note file names: unsafe in file names or in [[wikilinks]]. */
export const ATTRIBUTE_NAME_UNSAFE = /[\\/:*?"<>|#^[\]\s\u0000-\u001f]+/g

const RULE_KEYS = ['topical', 'attribute', 'relation', 'composition']

/** Share of the nodes that use the sharedNeighbors.via edge at which an intermediate counts as a hub (when hubThreshold is not set). */
export const HUB_SHARE = 0.25
export const HUB_MIN = 3
/** The automatic hub threshold for `users` nodes that use the via edge: max(3, ceil(25% of users)). */
export const autoHubThreshold = (users) => Math.max(HUB_MIN, Math.ceil(users * HUB_SHARE))

/** Allowed keys per object, used to reject typos. */
const SHAPE = {
  root: ['$schema', '$comment', 'source', 'idField', 'titleField', 'descriptionField', 'kindField', 'attributes', 'edges', 'sharedNeighbors', 'k', 'card', 'catalog', 'index', 'bodies', 'output', 'wayfinding', 'layout', 'templates', 'attributeNotes'],
  source: ['dir', 'include', 'exclude'],
  edge: ['field', 'label', 'reverse', 'external'],
  sharedNeighbors: ['via', 'label', 'hubThreshold', 'notes'],
  notes: ['include', 'idField', 'titleField', 'path'],
  layout: ['cards', 'bodies', 'wayfinding'],
  templates: TEMPLATE_KEYS,
  attributeNotes: ['attributes', 'path'],
  attributeNoteField: ['field', 'label'],
  markers: ['start', 'end'],
  card: ['fields', 'headings', 'headingLevels', 'maxHeadings', 'maxFieldChars', 'maxBytes', 'titlesInRelations'],
  cardField: ['field', 'label'],
  catalog: ['maxBytes', 'edgeColumns'],
  index: ['maxBytes'],
  wayfinding: ['instructionFile', 'vaultPath', 'search', 'rules', 'general', 'extraRules', 'markers'],
  rules: RULE_KEYS,
}

function levenshtein(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)])
  for (let j = 1; j <= b.length; j += 1) d[0][j] = j
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    }
  }
  return d[a.length][b.length]
}

const suggest = (key, allowed) => {
  const best = allowed.map((k) => [k, levenshtein(key.toLowerCase(), k.toLowerCase())]).sort((x, y) => x[1] - y[1])[0]
  return best && best[1] <= 3 ? ` (did you mean "${best[0]}"?)` : ''
}

const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)
const isPosInt = (v) => Number.isInteger(v) && v > 0
const humanize = (field) => {
  const s = String(field).replace(/[_-]+/g, ' ').trim()
  return s ? s[0].toUpperCase() + s.slice(1) : s
}

/**
 * Validate a raw config object. Returns { config, errors }. `config` is normalized with defaults;
 * paths are left relative here (resolveConfig makes them absolute).
 */
export function validateConfig(raw, { sourceOptional = false } = {}) {
  const errors = []
  const err = (where, message) => errors.push(`${where}: ${message}`)
  const checkKeys = (obj, shape, where) => {
    for (const key of Object.keys(obj)) {
      if (!SHAPE[shape].includes(key)) err(where, `unknown key "${key}"${suggest(key, SHAPE[shape])}`)
    }
  }
  const stringList = (value, where, { allowEmpty = true } = {}) => {
    if (value === undefined) return undefined
    if (!Array.isArray(value) || value.some((v) => typeof v !== 'string' || !v.trim())) {
      err(where, 'must be an array of non-empty strings')
      return undefined
    }
    if (!allowEmpty && value.length === 0) err(where, 'must not be empty')
    return value
  }
  const posInt = (value, where, fallback, min = 1) => {
    if (value === undefined) return fallback
    if (!Number.isInteger(value) || value < min) {
      err(where, `must be an integer >= ${min}`)
      return fallback
    }
    return value
  }

  /** A relative output path pattern with {stem} (or {id}) that ends in .md. */
  const pathPattern = (value, where, fallback, needs = ['{stem}', '{id}']) => {
    if (value === undefined) return fallback
    if (typeof value !== 'string' || !value.trim()) { err(where, 'must be a non-empty path pattern'); return fallback }
    const bad = path.isAbsolute(value) || value.split(/[\\/]/).includes('..') || value.startsWith('.') || !value.endsWith('.md') || !needs.some((n) => value.includes(n))
    if (bad) { err(where, `must be a relative path inside the vault that ends in .md and contains ${needs.join(' or ')} (got "${value}")`); return fallback }
    return value.replace(/\\/g, '/')
  }

  if (!isObject(raw)) return { config: null, errors: ['config: must be a JSON object'] }
  checkKeys(raw, 'root', 'config')
  if (raw.$comment !== undefined && typeof raw.$comment !== 'string' && !(Array.isArray(raw.$comment) && raw.$comment.every((c) => typeof c === 'string'))) {
    err('$comment', 'must be a string or an array of strings (it is ignored by Cairn)')
  }

  // source
  const source = { dir: null, include: ['**/*.md'], exclude: [] }
  if (sourceOptional && raw.source === undefined) {
    // Library use with nodes given in memory (planNodes): no source folder.
  } else if (!isObject(raw.source)) {
    err('source', 'is required and must be an object such as { "dir": "notes" }')
  } else {
    checkKeys(raw.source, 'source', 'source')
    if (typeof raw.source.dir !== 'string' || !raw.source.dir.trim()) err('source.dir', 'is required (the knowledge-base folder, relative to the config file)')
    else source.dir = raw.source.dir
    source.include = stringList(raw.source.include, 'source.include', { allowEmpty: false }) ?? source.include
    source.exclude = stringList(raw.source.exclude, 'source.exclude') ?? source.exclude
  }

  const strField = (key, fallback, { optional = false } = {}) => {
    const v = raw[key]
    if (v === undefined || (optional && v === null)) return fallback
    if (typeof v !== 'string' || !v.trim()) {
      err(key, 'must be a non-empty string (a front-matter field name)')
      return fallback
    }
    return v
  }
  const idField = strField('idField', 'id')
  const titleField = strField('titleField', 'title')
  const descriptionField = strField('descriptionField', null, { optional: true })
  const kindField = strField('kindField', null, { optional: true })

  const attributes = stringList(raw.attributes, 'attributes') ?? []
  if (new Set(attributes).size !== attributes.length) err('attributes', 'must not repeat a field')

  // edges
  const edges = []
  if (raw.edges !== undefined && !Array.isArray(raw.edges)) err('edges', 'must be an array of edge definitions')
  for (const [i, e] of (Array.isArray(raw.edges) ? raw.edges : []).entries()) {
    const where = `edges[${i}]`
    if (typeof e === 'string') {
      edges.push({ field: e, label: humanize(e), reverse: null, external: false })
      continue
    }
    if (!isObject(e)) { err(where, 'must be a field name or an object { "field", "label", "reverse" }'); continue }
    checkKeys(e, 'edge', where)
    if (typeof e.field !== 'string' || !e.field.trim()) { err(`${where}.field`, 'is required'); continue }
    if (e.label !== undefined && (typeof e.label !== 'string' || !e.label.trim())) err(`${where}.label`, 'must be a non-empty string')
    if (e.reverse !== undefined && e.reverse !== false && e.reverse !== null && (typeof e.reverse !== 'string' || !e.reverse.trim())) {
      err(`${where}.reverse`, 'must be a label for the reverse direction (e.g. "Used by") or false')
    }
    if (e.external !== undefined && typeof e.external !== 'boolean') err(`${where}.external`, 'must be true or false')
    edges.push({
      field: e.field,
      label: typeof e.label === 'string' && e.label.trim() ? e.label : humanize(e.field),
      reverse: typeof e.reverse === 'string' && e.reverse.trim() ? e.reverse : null,
      external: e.external === true,
    })
  }
  const edgeFields = edges.map((e) => e.field)
  const dup = edgeFields.find((f, i) => edgeFields.indexOf(f) !== i)
  if (dup) err('edges', `field "${dup}" is defined twice`)
  for (const f of edgeFields) if (attributes.includes(f)) err('edges', `field "${f}" is also listed in attributes; use it as one or the other`)
  for (const f of edgeFields) if (f === idField) err('edges', `field "${f}" is the id field`)
  if (kindField && edgeFields.includes(kindField)) err('kindField', `"${kindField}" is an edge field; name the field that holds the node's kind (for example "kind" or "type")`)

  // shared neighbors
  let sharedNeighbors = null
  if (raw.sharedNeighbors !== undefined && raw.sharedNeighbors !== null) {
    const s = raw.sharedNeighbors
    if (!isObject(s)) {
      err('sharedNeighbors', 'must be an object { "via": "<edge field>" } (optionally with "label" and "hubThreshold")')
    } else {
      checkKeys(s, 'sharedNeighbors', 'sharedNeighbors')
      if (typeof s.via !== 'string' || !s.via.trim()) err('sharedNeighbors.via', 'is required: the edge field whose targets are shared intermediates (e.g. "evidence", "cites", "dataset")')
      else if (!edgeFields.includes(s.via)) err('sharedNeighbors.via', `"${s.via}" is not one of the edge fields (${edgeFields.join(', ') || 'none defined'})`)
      if (s.label !== undefined && (typeof s.label !== 'string' || !s.label.trim())) err('sharedNeighbors.label', 'must be a non-empty string')
      const viaEdge = edges.find((e) => e.field === s.via)
      let notes = null
      if (s.notes !== undefined && s.notes !== null) {
        const n = s.notes
        if (!isObject(n)) err('sharedNeighbors.notes', 'must be an object { "include": ["<glob>"], "path": "<folder>/{stem}.md" }')
        else {
          checkKeys(n, 'notes', 'sharedNeighbors.notes')
          notes = {
            include: stringList(n.include, 'sharedNeighbors.notes.include') ?? [],
            idField: n.idField === undefined ? FILENAME_ID : n.idField,
            titleField: n.titleField === undefined ? 'title' : n.titleField,
            path: pathPattern(n.path, 'sharedNeighbors.notes.path', `${typeof s.via === 'string' ? s.via.replace(/[^\w-]+/g, '-') : 'notes'}/{stem}.md`),
          }
          for (const key of ['idField', 'titleField']) if (typeof notes[key] !== 'string' || !notes[key].trim()) err(`sharedNeighbors.notes.${key}`, 'must be a non-empty string (a front-matter field name, or "$filename")')
        }
      }
      sharedNeighbors = {
        via: s.via,
        label: typeof s.label === 'string' && s.label.trim() ? s.label : `Shares ${viaEdge ? viaEdge.label.toLowerCase() : s.via} with`,
        // null: automatic, max(3, ceil(25% of the nodes that use the via edge)); computed at build time.
        hubThreshold: s.hubThreshold === null ? null : posInt(s.hubThreshold, 'sharedNeighbors.hubThreshold', null, 2),
        notes,
      }
    }
  }

  const k = posInt(raw.k, 'k', 10)

  // card
  const card = { fields: [], headings: true, headingLevels: [2], maxHeadings: 20, maxFieldChars: 400, maxBytes: 5120, titlesInRelations: true }
  if (raw.card !== undefined) {
    if (!isObject(raw.card)) {
      err('card', 'must be an object')
    } else {
      checkKeys(raw.card, 'card', 'card')
      if (raw.card.fields !== undefined) {
        if (!Array.isArray(raw.card.fields)) err('card.fields', 'must be an array of field names or { "field", "label" } objects')
        else {
          for (const [i, f] of raw.card.fields.entries()) {
            if (typeof f === 'string' && f.trim()) card.fields.push({ field: f, label: humanize(f) })
            else if (isObject(f) && typeof f.field === 'string' && f.field.trim()) {
              checkKeys(f, 'cardField', `card.fields[${i}]`)
              card.fields.push({ field: f.field, label: typeof f.label === 'string' && f.label.trim() ? f.label : humanize(f.field) })
            } else err(`card.fields[${i}]`, 'must be a field name or { "field": "...", "label": "..." }')
          }
        }
      }
      if (raw.card.headings !== undefined && typeof raw.card.headings !== 'boolean') err('card.headings', 'must be true or false')
      else if (raw.card.headings !== undefined) card.headings = raw.card.headings
      if (raw.card.headingLevels !== undefined) {
        const ok = Array.isArray(raw.card.headingLevels) && raw.card.headingLevels.length > 0 && raw.card.headingLevels.every((n) => Number.isInteger(n) && n >= 1 && n <= 6)
        if (!ok) err('card.headingLevels', 'must be a non-empty array of integers 1–6')
        else card.headingLevels = [...new Set(raw.card.headingLevels)].sort()
      }
      card.maxHeadings = posInt(raw.card.maxHeadings, 'card.maxHeadings', card.maxHeadings)
      card.maxFieldChars = posInt(raw.card.maxFieldChars, 'card.maxFieldChars', card.maxFieldChars, 20)
      card.maxBytes = posInt(raw.card.maxBytes, 'card.maxBytes', card.maxBytes, 256)
      if (raw.card.titlesInRelations !== undefined && typeof raw.card.titlesInRelations !== 'boolean') err('card.titlesInRelations', 'must be true or false')
      else if (raw.card.titlesInRelations !== undefined) card.titlesInRelations = raw.card.titlesInRelations
    }
  }

  // catalog
  const catalog = { maxBytes: 20480, edgeColumns: edges.filter((e) => !e.external).map((e) => e.field) }
  if (raw.catalog !== undefined) {
    if (!isObject(raw.catalog)) err('catalog', 'must be an object')
    else {
      checkKeys(raw.catalog, 'catalog', 'catalog')
      catalog.maxBytes = posInt(raw.catalog.maxBytes, 'catalog.maxBytes', catalog.maxBytes, 256)
      const cols = stringList(raw.catalog.edgeColumns, 'catalog.edgeColumns')
      if (cols) {
        for (const c of cols) if (!edgeFields.includes(c)) err('catalog.edgeColumns', `"${c}" is not one of the edge fields (${edgeFields.join(', ') || 'none defined'})`)
        catalog.edgeColumns = cols
      }
    }
  }

  const index = { maxBytes: 4096 }
  if (raw.index !== undefined) {
    if (!isObject(raw.index)) err('index', 'must be an object')
    else {
      checkKeys(raw.index, 'index', 'index')
      index.maxBytes = posInt(raw.index.maxBytes, 'index.maxBytes', index.maxBytes, 256)
    }
  }

  let bodies = true
  if (raw.bodies !== undefined) {
    if (typeof raw.bodies !== 'boolean') err('bodies', 'must be true or false')
    else bodies = raw.bodies
  }

  let output = 'cairn-vault'
  if (raw.output !== undefined) {
    if (typeof raw.output !== 'string' || !raw.output.trim()) err('output', 'must be a non-empty folder path')
    else output = raw.output
  }

  // wayfinding
  const wayfinding = { instructionFile: null, vaultPath: null, search: DEFAULT_SEARCH, rules: { ...DEFAULT_RULES }, general: [...DEFAULT_GENERAL_RULES], extraRules: [], markers: { ...DEFAULT_MARKERS } }
  if (raw.wayfinding !== undefined) {
    const w = raw.wayfinding
    if (!isObject(w)) err('wayfinding', 'must be an object')
    else {
      checkKeys(w, 'wayfinding', 'wayfinding')
      if (w.instructionFile !== undefined && w.instructionFile !== null) {
        if (typeof w.instructionFile !== 'string' || !w.instructionFile.trim()) err('wayfinding.instructionFile', 'must be a non-empty path to CLAUDE.md, AGENTS.md, or a skill file (relative to the config file)')
        else wayfinding.instructionFile = w.instructionFile
      }
      if (w.vaultPath !== undefined) {
        if (typeof w.vaultPath !== 'string' || !w.vaultPath.trim()) err('wayfinding.vaultPath', 'must be a non-empty string')
        else wayfinding.vaultPath = w.vaultPath.replace(/\/+$/, '')
      }
      if (w.search !== undefined) {
        if (typeof w.search !== 'string' || !w.search.trim()) err('wayfinding.search', 'must be a non-empty string')
        else wayfinding.search = w.search
      }
      if (w.rules !== undefined) {
        if (!isObject(w.rules)) err('wayfinding.rules', `must be an object with any of ${RULE_KEYS.join(', ')}`)
        else {
          checkKeys(w.rules, 'rules', 'wayfinding.rules')
          for (const key of RULE_KEYS) {
            if (w.rules[key] === undefined) continue
            if (typeof w.rules[key] !== 'string' || !w.rules[key].trim()) err(`wayfinding.rules.${key}`, 'must be a non-empty string')
            else wayfinding.rules[key] = w.rules[key]
          }
        }
      }
      wayfinding.general = stringList(w.general, 'wayfinding.general') ?? wayfinding.general
      wayfinding.extraRules = stringList(w.extraRules, 'wayfinding.extraRules') ?? wayfinding.extraRules
      if (w.markers !== undefined) {
        if (!isObject(w.markers)) err('wayfinding.markers', 'must be an object { "start": "<!-- … -->", "end": "<!-- … -->" }')
        else {
          checkKeys(w.markers, 'markers', 'wayfinding.markers')
          for (const key of ['start', 'end']) {
            const v = w.markers[key]
            if (v === undefined) continue
            if (typeof v !== 'string' || !v.trim() || /\n/.test(v)) err(`wayfinding.markers.${key}`, 'must be a non-empty single-line string')
            else wayfinding.markers[key] = v
          }
          if (wayfinding.markers.start === wayfinding.markers.end) err('wayfinding.markers', 'start and end must differ')
        }
      }
    }
  }

  // layout: where cards, bodies, and WAYFINDING.md go inside the vault
  const layout = { ...DEFAULT_LAYOUT }
  if (raw.layout !== undefined) {
    if (!isObject(raw.layout)) err('layout', 'must be an object { "cards": "cards/{stem}.md", "bodies": "bodies/{stem}.md", "wayfinding": "WAYFINDING.md" }')
    else {
      checkKeys(raw.layout, 'layout', 'layout')
      layout.cards = pathPattern(raw.layout.cards, 'layout.cards', layout.cards)
      layout.bodies = pathPattern(raw.layout.bodies, 'layout.bodies', layout.bodies)
      if (raw.layout.wayfinding === null || raw.layout.wayfinding === false) layout.wayfinding = null
      else if (raw.layout.wayfinding !== undefined) layout.wayfinding = pathPattern(raw.layout.wayfinding, 'layout.wayfinding', layout.wayfinding, ['.md'])
    }
  }

  // templates: files that replace the built-in layout of each kind of generated file
  const templates = {}
  if (raw.templates !== undefined) {
    if (!isObject(raw.templates)) err('templates', `must be an object with any of ${TEMPLATE_KEYS.join(', ')} (paths to template files, relative to the config file)`)
    else {
      checkKeys(raw.templates, 'templates', 'templates')
      for (const key of TEMPLATE_KEYS) {
        const v = raw.templates[key]
        if (v === undefined || v === null) continue
        if (typeof v !== 'string' || !v.trim()) err(`templates.${key}`, 'must be a path to a template file')
        else templates[key] = v
      }
    }
  }

  // attribute notes: one note per value of the listed attributes
  let attributeNotes = null
  if (raw.attributeNotes !== undefined && raw.attributeNotes !== null) {
    const a = raw.attributeNotes
    if (!isObject(a)) err('attributeNotes', 'must be an object { "attributes": ["<field>" or { "field", "label" }], "path": "attributes/{attribute}-{value}.md" }')
    else {
      checkKeys(a, 'attributeNotes', 'attributeNotes')
      const list = []
      if (!Array.isArray(a.attributes) || a.attributes.length === 0) err('attributeNotes.attributes', 'must be a non-empty array of field names or { "field", "label" } objects')
      else {
        for (const [i, f] of a.attributes.entries()) {
          if (typeof f === 'string' && f.trim()) list.push({ field: f, label: humanize(f) })
          else if (isObject(f) && typeof f.field === 'string' && f.field.trim()) {
            checkKeys(f, 'attributeNoteField', `attributeNotes.attributes[${i}]`)
            list.push({ field: f.field, label: typeof f.label === 'string' && f.label.trim() ? f.label : humanize(f.field) })
          } else err(`attributeNotes.attributes[${i}]`, 'must be a field name or { "field": "...", "label": "..." }')
        }
        if (new Set(list.map((f) => f.field)).size !== list.length) err('attributeNotes.attributes', 'must not repeat a field')
      }
      attributeNotes = { attributes: list, path: pathPattern(a.path, 'attributeNotes.path', 'attributes/{attribute}-{value}.md', ['{value}']) }
    }
  }

  const config = { source, idField, titleField, descriptionField, kindField, attributes, edges, sharedNeighbors, k, card, catalog, index, bodies, output, wayfinding, layout, templates, attributeNotes }
  return { config, errors }
}

/** Read, parse, validate, and resolve paths. Throws CairnError (exit 2) listing every problem. */
export function loadConfig(configPath) {
  const file = path.resolve(configPath)
  let text
  try {
    text = fs.readFileSync(file, 'utf8')
  } catch (error) {
    throw new CairnError(`cannot read config ${path.basename(file)}: ${error.code ?? error.message}`, 2)
  }
  let raw
  try {
    raw = JSON.parse(text)
  } catch (error) {
    throw new CairnError(`config ${path.basename(file)} is not valid JSON: ${error.message}`, 2)
  }
  return resolveConfig(raw, path.dirname(file), { file })
}

/** Validate a raw object and resolve its paths against baseDir. */
export function resolveConfig(raw, baseDir, { file = null, requireSource = true } = {}) {
  const { config, errors } = validateConfig(raw, { sourceOptional: !requireSource })
  if (config && !config.source.dir && !requireSource) {
    config.baseDir = baseDir
    config.file = file
    config.sourceDir = null
    config.outDir = path.resolve(baseDir, config.output)
    config.instructionPath = config.wayfinding.instructionFile ? path.resolve(baseDir, config.wayfinding.instructionFile) : null
  }
  if (config) {
    config.templatePaths = {}
    for (const [key, rel] of Object.entries(config.templates)) {
      const abs = path.resolve(baseDir, rel)
      if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) errors.push(`templates.${key}: file not found: ${rel} (relative to the config file)`)
      config.templatePaths[key] = abs
    }
  }
  if (config && config.source.dir) {
    const sourceDir = path.resolve(baseDir, config.source.dir)
    const outDir = path.resolve(baseDir, config.output)
    if (requireSource && (!fs.existsSync(sourceDir) || !fs.statSync(sourceDir).isDirectory())) {
      errors.push(`source.dir: folder not found: ${config.source.dir} (relative to the config file)`)
    }
    // The output may sit inside source.dir (Cairn leaves its own output out of the inputs), but it must not
    // be source.dir itself or contain it, because a rebuild replaces the whole output folder.
    if (isInside(sourceDir, outDir)) {
      const same = path.relative(sourceDir, outDir) === ''
      errors.push(`output: "${config.output}" ${same ? 'is the same folder as' : 'contains'} source.dir "${config.source.dir}", and a build replaces the whole output folder. `
        + 'Use a folder next to the notes (for example "../cairn-vault", or move the config one level up and use "cairn-vault"), '
        + 'or a subfolder of the notes such as "cairn-vault" (Cairn leaves its own output out of the inputs)')
    }
    config.baseDir = baseDir
    config.file = file
    config.sourceDir = sourceDir
    config.outDir = outDir
    config.instructionPath = config.wayfinding.instructionFile ? path.resolve(baseDir, config.wayfinding.instructionFile) : null
    if (config.instructionPath && isInside(config.instructionPath, outDir)) {
      errors.push(`wayfinding.instructionFile: "${config.wayfinding.instructionFile}" is inside the output folder, which every build replaces; choose a file outside "${config.output}"`)
    }
  }
  if (errors.length) {
    throw new CairnError(`invalid config${file ? ` ${path.basename(file)}` : ''} (${errors.length} problem${errors.length > 1 ? 's' : ''})`, 2, errors)
  }
  return config
}

/** Canonical JSON of the parts of a config that affect output (for the fingerprint). */
export function configDigestInput(config) {
  const { baseDir, file, sourceDir, outDir, instructionPath, templatePaths, ...rest } = config
  // Template contents count as configuration: editing a template file makes the vault stale.
  const templateText = Object.keys(templatePaths ?? {}).sort().map((key) => [key, fs.readFileSync(templatePaths[key], 'utf8').replace(/\r\n?/g, '\n')])
  return JSON.stringify(templateText.length ? { ...rest, templateText } : rest)
}
