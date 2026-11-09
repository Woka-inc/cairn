---
id: "qs-io-s3"
title: "Object storage adapter"
kind: "module"
layer: "io"
stability: "stable"
language: "TypeScript"
owner: "data-io"
---
# qs-io-s3 — Object storage adapter

> Reads and writes objects in S3-compatible storage with multipart uploads.

Full text: `bodies/qs-io-s3.md`

## Goal

Move large files to and from object storage reliably.

## Sections

1. Overview
2. Usage
3. Notes

## Relations

- Depends on: qs-io-base (I/O adapter base); qs-retry (Retry and backoff); qs-config (Configuration loader)
- Related: qs-io-http (HTTP source)
- Design docs: DD-006 (Adapter contract); DD-003 (Retry policy and idempotence); DD-008 (Telemetry conventions)
- Used by (reverse of Depends on): none
- Related from (reverse of Related): qs-io-http (HTTP source)
- Cited by (reverse of Design docs): none
- Shares design docs with (two hops via Design docs): qs-io-http (HTTP source) ×2; qs-devserver (Development server) ×1; qs-io-arrow (Arrow bridge) ×1; qs-io-base (I/O adapter base) ×1; qs-io-csv (CSV reader and writer) ×1; qs-io-json (JSON Lines reader) ×1 (6 of 12 shown — capped at k=6)
