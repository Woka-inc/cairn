---
id: "qs-logging"
title: "Structured logging"
kind: "module"
layer: "observability"
stability: "stable"
language: "TypeScript"
owner: "observability"
---
# qs-logging — Structured logging

> JSON logs with stage, batch, and trace identifiers on every line.

Full text: `bodies/qs-logging.md`

## Goal

Make logs searchable and joinable with traces.

## Sections

1. Overview
2. Usage
3. Notes

## Relations

- Depends on: qs-core (Core runtime); qs-config (Configuration loader)
- Related: qs-tracing (Tracing)
- Design docs: DD-001 (Error model); DD-008 (Telemetry conventions)
- Used by (reverse of Depends on): none
- Related from (reverse of Related): qs-tracing (Tracing)
- Shares design docs with (two hops via Design docs): qs-devserver (Development server) ×1; qs-io-s3 (Object storage adapter) ×1; qs-metrics (Metrics exporter) ×1; qs-tracing (Tracing) ×1 (4 of 14 shown — 1 hub skipped: design_docs targets used by ≥7 nodes)
