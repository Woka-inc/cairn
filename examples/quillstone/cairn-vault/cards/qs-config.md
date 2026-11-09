---
id: "qs-config"
title: "Configuration loader"
kind: "module"
layer: "core"
stability: "stable"
language: "TypeScript"
owner: "runtime"
---
# qs-config — Configuration loader

> Loads pipeline settings from files, environment variables, and flags in a fixed order.

Full text: `bodies/qs-config.md`

## Goal

Make every setting traceable to exactly one source.

## Sections

1. Overview
2. Usage
3. Notes

## Relations

- Depends on: qs-core (Core runtime)
- Related: qs-cli (Command-line runner)
- Design docs: DD-001 (Error model); DD-005 (Configuration and command surface)
- Used by (reverse of Depends on): qs-cli (Command-line runner); qs-io-s3 (Object storage adapter); qs-logging (Structured logging)
- Related from (reverse of Related): qs-cli (Command-line runner); qs-core (Core runtime)
- Cited by (reverse of Design docs): none
- Shares design docs with (two hops via Design docs): qs-cli (Command-line runner) ×1; qs-devserver (Development server) ×1; qs-plugin-sdk (Plugin SDK) ×1; qs-testkit (Test kit) ×1 (4 of 14 shown — 1 hub skipped: design_docs targets used by ≥10 nodes)
