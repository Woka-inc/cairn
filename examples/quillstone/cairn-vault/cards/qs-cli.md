---
id: "qs-cli"
title: "Command-line runner"
kind: "module"
layer: "tooling"
stability: "stable"
language: "TypeScript"
owner: "tooling"
---
# qs-cli — Command-line runner

> The `qs` command: run, validate, and explain pipelines.

Full text: `bodies/qs-cli.md`

## Goal

Run any pipeline file the same way on a laptop and in production.

## Sections

1. Overview
2. Usage
3. Notes

## Relations

- Depends on: qs-core (Core runtime); qs-config (Configuration loader); qs-scheduler (Stage scheduler)
- Related: qs-config (Configuration loader); qs-devserver (Development server)
- Design docs: DD-005 (Configuration and command surface)
- Used by (reverse of Depends on): qs-devserver (Development server); qs-examples (Example pipelines)
- Related from (reverse of Related): qs-config (Configuration loader); qs-devserver (Development server)
- Shares design docs with (two hops via Design docs): qs-config (Configuration loader) ×1; qs-devserver (Development server) ×1; qs-plugin-sdk (Plugin SDK) ×1; qs-testkit (Test kit) ×1
