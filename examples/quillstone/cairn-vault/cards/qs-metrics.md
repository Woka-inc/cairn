---
id: "qs-metrics"
title: "Metrics exporter"
kind: "module"
layer: "observability"
stability: "stable"
language: "TypeScript"
owner: "observability"
---
# qs-metrics — Metrics exporter

> Counters, gauges, and histograms for every stage, exported in a standard text format.

Full text: `bodies/qs-metrics.md`

## Goal

See throughput and lag per stage without extra code.

## Sections

1. Overview
2. Usage
3. Notes

## Relations

- Depends on: qs-core (Core runtime)
- Related: qs-tracing (Tracing)
- Design docs: DD-001 (Error model); DD-008 (Telemetry conventions)
- Used by (reverse of Depends on): qs-devserver (Development server)
- Related from (reverse of Related): qs-scheduler (Stage scheduler); qs-tracing (Tracing)
- Shares design docs with (two hops via Design docs): qs-devserver (Development server) ×1; qs-io-s3 (Object storage adapter) ×1; qs-logging (Structured logging) ×1; qs-tracing (Tracing) ×1 (4 of 14 shown — 1 hub skipped: design_docs targets used by ≥7 nodes)
