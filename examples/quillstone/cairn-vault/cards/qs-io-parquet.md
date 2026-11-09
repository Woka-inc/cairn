---
id: "qs-io-parquet"
title: "Parquet adapter"
kind: "module"
layer: "io"
stability: "stable"
language: "Rust"
owner: "data-io"
---
# qs-io-parquet — Parquet adapter

> Reads and writes Parquet files through a native extension.

Full text: `bodies/qs-io-parquet.md`

## Goal

Give columnar storage without leaving the pipeline API.

## Sections

1. Overview
2. Usage
3. Notes

## Relations

- Depends on: qs-io-base (I/O adapter base); qs-schema (Schema registry)
- Related: qs-io-csv (CSV reader and writer); qs-io-arrow (Arrow bridge)
- Design docs: DD-006 (Adapter contract); DD-004 (Schema evolution)
- Used by (reverse of Depends on): none
- Related from (reverse of Related): qs-io-arrow (Arrow bridge); qs-io-csv (CSV reader and writer)
- Cited by (reverse of Design docs): none
- Shares design docs with (two hops via Design docs): qs-io-sql (SQL source) ×2; qs-io-arrow (Arrow bridge) ×1; qs-io-base (I/O adapter base) ×1; qs-io-csv (CSV reader and writer) ×1; qs-io-http (HTTP source) ×1; qs-io-json (JSON Lines reader) ×1 (6 of 9 shown — capped at k=6)
