---
id: "qs-io-base"
title: "I/O adapter base"
kind: "module"
layer: "io"
stability: "stable"
language: "TypeScript"
owner: "data-io"
---
# qs-io-base — I/O adapter base

> Base classes and the contract that every source and sink adapter implements.

Full text: `bodies/qs-io-base.md`

## Goal

Make adapters interchangeable behind one small interface.

## Sections

1. Overview
2. Usage
3. Notes

## Relations

- Depends on: qs-core (Core runtime); qs-schema (Schema registry)
- Related: qs-io-csv (CSV reader and writer)
- Design docs: DD-001 (Error model); DD-006 (Adapter contract)
- Used by (reverse of Depends on): qs-io-arrow (Arrow bridge); qs-io-csv (CSV reader and writer); qs-io-http (HTTP source); qs-io-json (JSON Lines reader); qs-io-parquet (Parquet adapter); qs-io-s3 (Object storage adapter) (6 of 9 shown — capped at k=6)
- Related from (reverse of Related): qs-plugin-sdk (Plugin SDK)
- Shares design docs with (two hops via Design docs): none shown (0 of 18 shown — 2 hubs skipped: design_docs targets used by ≥7 nodes)
