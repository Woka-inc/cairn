---
id: "qs-scheduler"
title: "Stage scheduler"
kind: "module"
layer: "core"
stability: "stable"
language: "TypeScript"
owner: "runtime"
---
# qs-scheduler — Stage scheduler

> Runs ready stages on a bounded worker pool with back-pressure.

Full text: `bodies/qs-scheduler.md`

## Goal

Keep memory bounded while keeping every worker busy.

## Sections

1. Overview
2. Usage
3. Notes

## Relations

- Depends on: qs-core (Core runtime)
- Related: qs-retry (Retry and backoff); qs-metrics (Metrics exporter)
- Design docs: DD-001 (Error model); DD-003 (Retry policy and idempotence)
- Used by (reverse of Depends on): qs-cli (Command-line runner); qs-tx-window (Windowed aggregation)
- Related from (reverse of Related): qs-core (Core runtime); qs-retry (Retry and backoff)
- Shares design docs with (two hops via Design docs): qs-io-http (HTTP source) ×1; qs-io-s3 (Object storage adapter) ×1 (2 of 13 shown — 1 hub skipped: design_docs targets used by ≥7 nodes)
