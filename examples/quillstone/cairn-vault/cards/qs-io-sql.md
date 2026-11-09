---
id: "qs-io-sql"
title: "SQL source"
kind: "module"
layer: "io"
stability: "experimental"
language: "TypeScript"
owner: "data-io"
---
# qs-io-sql — SQL source

> Reads query results from SQL databases in keyset-paginated batches.

Full text: `bodies/qs-io-sql.md`

## Goal

Read large tables without long-running transactions.

## Sections

1. Overview
2. Usage
3. Notes

## Relations

- Depends on: qs-io-base (I/O adapter base); qs-schema (Schema registry)
- Related: qs-io-arrow (Arrow bridge)
- Design docs: DD-006 (Adapter contract); DD-004 (Schema evolution)
- Used by (reverse of Depends on): none
- Related from (reverse of Related): none
- Cited by (reverse of Design docs): none
- Shares design docs with (two hops via Design docs): qs-io-parquet (Parquet adapter) ×2; qs-io-arrow (Arrow bridge) ×1; qs-io-base (I/O adapter base) ×1; qs-io-csv (CSV reader and writer) ×1; qs-io-http (HTTP source) ×1; qs-io-json (JSON Lines reader) ×1 (6 of 9 shown — capped at k=6)
