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
- Cited by (reverse of Design docs): none
- Shares design docs with (two hops via Design docs): qs-dedupe (Deduplication) ×1; qs-io-base (I/O adapter base) ×1; qs-io-csv (CSV reader and writer) ×1; qs-io-http (HTTP source) ×1; qs-io-json (JSON Lines reader) ×1; qs-io-parquet (Parquet adapter) ×1 (6 of 10 shown — capped at k=6)
