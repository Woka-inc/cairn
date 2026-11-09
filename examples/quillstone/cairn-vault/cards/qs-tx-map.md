---
id: "qs-tx-map"
title: "Row mapping"
kind: "module"
layer: "transform"
stability: "stable"
language: "TypeScript"
owner: "transforms"
---
# qs-tx-map — Row mapping

> Applies a function to every row and checks the output schema.

Full text: `bodies/qs-tx-map.md`

## Goal

Make the most common transform safe and fast.

## Sections

1. Overview
2. Usage
3. Notes

## Relations

- Depends on: qs-core (Core runtime); qs-schema (Schema registry)
- Related: qs-tx-filter (Filtering)
- Design docs: DD-001 (Error model); DD-002 (Row representation)
- Used by (reverse of Depends on): none
- Related from (reverse of Related): qs-tx-filter (Filtering)
- Shares design docs with (two hops via Design docs): qs-core (Core runtime) ×1; qs-dedupe (Deduplication) ×1; qs-tx-filter (Filtering) ×1; qs-tx-join (Joins) ×1; qs-tx-window (Windowed aggregation) ×1 (5 of 14 shown — 1 hub skipped: design_docs targets used by ≥7 nodes)
