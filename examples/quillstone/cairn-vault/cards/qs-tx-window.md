---
id: "qs-tx-window"
title: "Windowed aggregation"
kind: "module"
layer: "transform"
stability: "beta"
language: "TypeScript"
owner: "transforms"
---
# qs-tx-window — Windowed aggregation

> Tumbling and sliding windows over event time with watermarks.

Full text: `bodies/qs-tx-window.md`

## Goal

Aggregate unbounded streams by time without unbounded state.

## Sections

1. Overview
2. Usage
3. Notes

## Relations

- Depends on: qs-core (Core runtime); qs-scheduler (Stage scheduler)
- Related: qs-tx-join (Joins)
- Design docs: DD-002 (Row representation); DD-007 (Columnar interop)
- Used by (reverse of Depends on): qs-dedupe (Deduplication)
- Related from (reverse of Related): qs-tx-join (Joins)
- Cited by (reverse of Design docs): none
- Shares design docs with (two hops via Design docs): qs-dedupe (Deduplication) ×2; qs-tx-join (Joins) ×2; qs-core (Core runtime) ×1; qs-io-arrow (Arrow bridge) ×1; qs-tx-filter (Filtering) ×1; qs-tx-map (Row mapping) ×1
