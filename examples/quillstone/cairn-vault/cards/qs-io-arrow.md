---
id: "qs-io-arrow"
title: "Arrow bridge"
kind: "module"
layer: "io"
stability: "beta"
language: "Rust"
owner: "data-io"
---
# qs-io-arrow — Arrow bridge

> Converts batches to and from Arrow record batches without copying.

Full text: `bodies/qs-io-arrow.md`

## Goal

Exchange data with Arrow-based tools at memory speed.

## Sections

1. Overview
2. Usage
3. Notes

## Relations

- Depends on: qs-io-base (I/O adapter base)
- Related: qs-io-parquet (Parquet adapter)
- Design docs: DD-006 (Adapter contract); DD-007 (Columnar interop)
- Used by (reverse of Depends on): none
- Related from (reverse of Related): qs-io-parquet (Parquet adapter); qs-io-sql (SQL source)
- Shares design docs with (two hops via Design docs): qs-dedupe (Deduplication) ×1; qs-tx-join (Joins) ×1; qs-tx-window (Windowed aggregation) ×1 (3 of 10 shown — 1 hub skipped: design_docs targets used by ≥7 nodes)
