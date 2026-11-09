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
- Shares design docs with (two hops via Design docs): qs-io-parquet (Parquet adapter) ×1; qs-schema (Schema registry) ×1; qs-validate (Validation rules) ×1 (3 of 9 shown — 1 hub skipped: design_docs targets used by ≥7 nodes)
