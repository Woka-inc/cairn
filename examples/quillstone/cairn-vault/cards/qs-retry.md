---
id: "qs-retry"
title: "Retry and backoff"
kind: "module"
layer: "core"
stability: "stable"
language: "TypeScript"
owner: "runtime"
---
# qs-retry — Retry and backoff

> Retries failed operations with exponential backoff and jitter.

Full text: `bodies/qs-retry.md`

## Goal

Recover from transient failures without hiding permanent ones.

## Sections

1. Overview
2. Usage
3. Notes

## Relations

- Depends on: qs-core (Core runtime)
- Related: qs-scheduler (Stage scheduler)
- Design docs: DD-001 (Error model)
- Used by (reverse of Depends on): qs-io-http (HTTP source); qs-io-s3 (Object storage adapter)
- Related from (reverse of Related): qs-scheduler (Stage scheduler)
- Shares design docs with (two hops via Design docs): none shown (0 of 11 shown — 1 hub skipped: design_docs targets used by ≥7 nodes)
