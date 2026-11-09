---
id: "qs-io-csv"
title: "CSV reader and writer"
kind: "module"
layer: "io"
stability: "stable"
language: "TypeScript"
owner: "data-io"
---
# qs-io-csv — CSV reader and writer

> Streams CSV files with header detection, quoting rules, and type inference.

Full text: `bodies/qs-io-csv.md`

## Goal

Read messy CSV files without loading them into memory.

## Sections

1. Overview
2. Usage
3. Notes

## Relations

- Depends on: qs-io-base (I/O adapter base)
- Related: qs-io-parquet (Parquet adapter); qs-io-json (JSON Lines reader)
- Design docs: DD-006 (Adapter contract)
- Used by (reverse of Depends on): qs-examples (Example pipelines)
- Related from (reverse of Related): qs-io-base (I/O adapter base); qs-io-json (JSON Lines reader); qs-io-parquet (Parquet adapter)
- Cited by (reverse of Design docs): none
- Shares design docs with (two hops via Design docs): qs-io-arrow (Arrow bridge) ×1; qs-io-base (I/O adapter base) ×1; qs-io-http (HTTP source) ×1; qs-io-json (JSON Lines reader) ×1; qs-io-parquet (Parquet adapter) ×1; qs-io-s3 (Object storage adapter) ×1 (6 of 7 shown — capped at k=6)
