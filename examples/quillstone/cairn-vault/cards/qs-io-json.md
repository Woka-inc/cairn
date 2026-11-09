---
id: "qs-io-json"
title: "JSON Lines reader"
kind: "module"
layer: "io"
stability: "beta"
language: "TypeScript"
owner: "data-io"
---
# qs-io-json — JSON Lines reader

> Reads newline-delimited JSON with optional schema projection.

Full text: `bodies/qs-io-json.md`

## Goal

Ingest event logs without a separate parsing step.

## Sections

1. Overview
2. Usage
3. Notes

## Relations

- Depends on: qs-io-base (I/O adapter base)
- Related: qs-io-csv (CSV reader and writer)
- Design docs: DD-006 (Adapter contract)
- Used by (reverse of Depends on): none
- Related from (reverse of Related): qs-io-csv (CSV reader and writer)
- Cited by (reverse of Design docs): none
- Shares design docs with (two hops via Design docs): qs-io-arrow (Arrow bridge) ×1; qs-io-base (I/O adapter base) ×1; qs-io-csv (CSV reader and writer) ×1; qs-io-http (HTTP source) ×1; qs-io-parquet (Parquet adapter) ×1; qs-io-s3 (Object storage adapter) ×1 (6 of 7 shown — capped at k=6)
