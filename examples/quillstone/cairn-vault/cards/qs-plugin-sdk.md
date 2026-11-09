---
id: "qs-plugin-sdk"
title: "Plugin SDK"
kind: "module"
layer: "tooling"
stability: "beta"
language: "TypeScript"
owner: "tooling"
---
# qs-plugin-sdk — Plugin SDK

> Packages third-party adapters and transforms as installable plugins.

Full text: `bodies/qs-plugin-sdk.md`

## Goal

Let others extend Quillstone without forking it.

## Sections

1. Overview
2. Usage
3. Notes

## Relations

- Depends on: qs-core (Core runtime); qs-schema (Schema registry); qs-io-base (I/O adapter base)
- Related: qs-io-base (I/O adapter base)
- Design docs: DD-001 (Error model); DD-005 (Configuration and command surface)
- Used by (reverse of Depends on): none
- Related from (reverse of Related): qs-testkit (Test kit)
- Cited by (reverse of Design docs): none
- Shares design docs with (two hops via Design docs): qs-cli (Command-line runner) ×1; qs-config (Configuration loader) ×1; qs-devserver (Development server) ×1; qs-testkit (Test kit) ×1 (4 of 14 shown — 1 hub skipped: design_docs targets used by ≥10 nodes)
