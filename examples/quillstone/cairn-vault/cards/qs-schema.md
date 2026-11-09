---
id: "qs-schema"
title: "Schema registry"
kind: "module"
layer: "core"
stability: "stable"
language: "TypeScript"
owner: "runtime"
---
# qs-schema — Schema registry

> Stores typed row schemas and checks compatibility between versions.

Full text: `bodies/qs-schema.md`

## Goal

Let readers and writers agree on row shapes across schema versions.

## Sections

1. Overview
2. Usage
3. Notes

## Relations

- Depends on: qs-core (Core runtime)
- Related: qs-validate (Validation rules)
- Design docs: DD-001 (Error model); DD-004 (Schema evolution)
- Used by (reverse of Depends on): qs-io-base (I/O adapter base); qs-io-parquet (Parquet adapter); qs-io-sql (SQL source); qs-plugin-sdk (Plugin SDK); qs-tx-join (Joins); qs-tx-map (Row mapping) (6 of 7 shown — capped at k=6)
- Related from (reverse of Related): none
- Shares design docs with (two hops via Design docs): qs-io-parquet (Parquet adapter) ×1; qs-io-sql (SQL source) ×1; qs-validate (Validation rules) ×1 (3 of 13 shown — 1 hub skipped: design_docs targets used by ≥7 nodes)
