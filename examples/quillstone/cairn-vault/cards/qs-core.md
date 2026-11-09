---
id: "qs-core"
title: "Core runtime"
kind: "module"
layer: "core"
stability: "stable"
language: "TypeScript"
owner: "runtime"
---
# qs-core — Core runtime

> Owns the pipeline object, stage lifecycle, and the shared error type.

Full text: `bodies/qs-core.md`

## Goal

Give every other module one pipeline object and one error model to build on.

## Sections

1. Overview
2. Usage
3. Lifecycle
4. Notes

## Relations

- Depends on: none
- Related: qs-config (Configuration loader); qs-scheduler (Stage scheduler)
- Design docs: DD-001 (Error model); DD-002 (Row representation)
- Used by (reverse of Depends on): qs-cli (Command-line runner); qs-config (Configuration loader); qs-dedupe (Deduplication); qs-io-base (I/O adapter base); qs-logging (Structured logging); qs-metrics (Metrics exporter) (6 of 16 shown — capped at k=6)
- Related from (reverse of Related): none
- Shares design docs with (two hops via Design docs): qs-dedupe (Deduplication) ×1; qs-tx-filter (Filtering) ×1; qs-tx-join (Joins) ×1; qs-tx-map (Row mapping) ×1; qs-tx-window (Windowed aggregation) ×1 (5 of 14 shown — 1 hub skipped: design_docs targets used by ≥7 nodes)
