---
id: "qs-tx-join"
title: "Joins"
kind: "module"
layer: "transform"
stability: "beta"
language: "TypeScript"
owner: "transforms"
---
# qs-tx-join — Joins

> Hash and sort-merge joins between two streams.

Full text: `bodies/qs-tx-join.md`

## Goal

Combine two sources by key without loading both fully.

## Sections

1. Overview
2. Usage
3. Notes

## Relations

- Depends on: qs-core (Core runtime); qs-schema (Schema registry)
- Related: qs-tx-window (Windowed aggregation)
- Design docs: DD-001 (Error model); DD-002 (Row representation); DD-007 (Columnar interop)
- Used by (reverse of Depends on): none
- Related from (reverse of Related): qs-dedupe (Deduplication); qs-tx-window (Windowed aggregation)
- Cited by (reverse of Design docs): none
- Shares design docs with (two hops via Design docs): qs-dedupe (Deduplication) ×2; qs-tx-window (Windowed aggregation) ×2; qs-core (Core runtime) ×1; qs-io-arrow (Arrow bridge) ×1; qs-tx-filter (Filtering) ×1; qs-tx-map (Row mapping) ×1 (6 of 15 shown — 1 hub skipped: design_docs targets used by ≥10 nodes)
