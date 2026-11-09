---
id: "qs-tx-filter"
title: "Filtering"
kind: "module"
layer: "transform"
stability: "stable"
language: "TypeScript"
owner: "transforms"
---
# qs-tx-filter — Filtering

> Keeps rows that match a predicate and counts the rest.

Full text: `bodies/qs-tx-filter.md`

## Goal

Drop rows early and still know how many were dropped.

## Sections

1. Overview
2. Usage
3. Notes

## Relations

- Depends on: qs-core (Core runtime)
- Related: qs-tx-map (Row mapping)
- Design docs: DD-002 (Row representation)
- Used by (reverse of Depends on): none
- Related from (reverse of Related): qs-tx-map (Row mapping); qs-validate (Validation rules)
- Shares design docs with (two hops via Design docs): qs-core (Core runtime) ×1; qs-dedupe (Deduplication) ×1; qs-tx-join (Joins) ×1; qs-tx-map (Row mapping) ×1; qs-tx-window (Windowed aggregation) ×1
