---
id: "qs-io-http"
title: "HTTP source"
kind: "module"
layer: "io"
stability: "beta"
language: "TypeScript"
owner: "data-io"
---
# qs-io-http — HTTP source

> Pulls paginated JSON or CSV from HTTP endpoints.

Full text: `bodies/qs-io-http.md`

## Goal

Turn a paginated API into a stream of batches.

## Sections

1. Overview
2. Usage
3. Notes

## Relations

- Depends on: qs-io-base (I/O adapter base); qs-retry (Retry and backoff)
- Related: qs-io-s3 (Object storage adapter)
- Design docs: DD-006 (Adapter contract); DD-003 (Retry policy and idempotence)
- Used by (reverse of Depends on): none
- Related from (reverse of Related): qs-io-s3 (Object storage adapter)
- Shares design docs with (two hops via Design docs): qs-io-s3 (Object storage adapter) ×1; qs-scheduler (Stage scheduler) ×1 (2 of 8 shown — 1 hub skipped: design_docs targets used by ≥7 nodes)
