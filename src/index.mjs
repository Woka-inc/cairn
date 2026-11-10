// Library entry point. The CLI (bin/cairn.mjs) is built on the same functions.
//   loadConfig(file) / resolveConfig(raw, baseDir, { requireSource: false })  -> config
//   build(config) / check(config)                                             -> file-based build and verification
//   plan(config)                                                              -> files planned from source.dir, nothing written
//   planNodes(config, { nodes, notes })                                       -> files planned from documents you read yourself
//   renderWayfinding(config) / insertBlock(text, block, markers)              -> the wayfinding block
export { loadConfig, resolveConfig, validateConfig } from './config.mjs'
export { build, check, fingerprint, generatorId, plan, planNodes, staleness } from './build.mjs'
export { insertBlock, renderWayfinding } from './guide.mjs'
export { oversized, sizeReport, describeSizes, truncationMarker } from './render.mjs'
export { compile, render as renderTemplate, FILTERS } from './template.mjs'
