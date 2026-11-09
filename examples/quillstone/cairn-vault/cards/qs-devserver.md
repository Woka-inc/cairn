---
id: "qs-devserver"
title: "Development server"
kind: "module"
layer: "tooling"
stability: "beta"
language: "TypeScript"
owner: "tooling"
---
# qs-devserver — Development server

> Reruns a pipeline on file changes and shows live stage metrics in the browser.

Full text: `bodies/qs-devserver.md`

## Goal

Shorten the edit-run loop while building a pipeline.

## Sections

1. Overview
2. Usage
3. Notes

## Relations

- Depends on: qs-cli (Command-line runner); qs-metrics (Metrics exporter)
- Related: qs-cli (Command-line runner)
- Design docs: DD-005 (Configuration and command surface); DD-008 (Telemetry conventions)
- Used by (reverse of Depends on): none
- Related from (reverse of Related): qs-cli (Command-line runner)
- Shares design docs with (two hops via Design docs): qs-cli (Command-line runner) ×1; qs-config (Configuration loader) ×1; qs-io-s3 (Object storage adapter) ×1; qs-logging (Structured logging) ×1; qs-metrics (Metrics exporter) ×1; qs-plugin-sdk (Plugin SDK) ×1 (6 of 8 shown — capped at k=6)
