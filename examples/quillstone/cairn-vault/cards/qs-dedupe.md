---
id: "qs-dedupe"
title: "Deduplication"
kind: "module"
layer: "transform"
stability: "experimental"
language: "Rust"
owner: "transforms"
---
# qs-dedupe — Deduplication

> Removes duplicate rows by key within a time window.

Full text: `bodies/qs-dedupe.md`

## Goal

Make at-least-once sources safe to aggregate.

## Sections

1. Overview
2. Usage
3. Notes

## Relations

- Depends on: qs-core (Core runtime); qs-tx-window (Windowed aggregation)
- Related: qs-tx-join (Joins)
- Design docs: DD-002 (Row representation); DD-007 (Columnar interop)
- Used by (reverse of Depends on): none
- Related from (reverse of Related): none
- Shares design docs with (two hops via Design docs): qs-tx-join (Joins) ×2; qs-tx-window (Windowed aggregation) ×2; qs-core (Core runtime) ×1; qs-io-arrow (Arrow bridge) ×1; qs-tx-filter (Filtering) ×1; qs-tx-map (Row mapping) ×1
