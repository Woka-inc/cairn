---
id: "qs-tracing"
title: "Tracing"
kind: "module"
layer: "observability"
stability: "beta"
language: "TypeScript"
owner: "observability"
---
# qs-tracing — Tracing

> Creates spans for stages and adapter calls and propagates context.

Full text: `bodies/qs-tracing.md`

## Goal

Follow one batch through the whole pipeline.

## Sections

1. Overview
2. Usage
3. Notes

## Relations

- Depends on: qs-core (Core runtime)
- Related: qs-metrics (Metrics exporter); qs-logging (Structured logging)
- Design docs: DD-008 (Telemetry conventions)
- Used by (reverse of Depends on): none
- Related from (reverse of Related): qs-logging (Structured logging); qs-metrics (Metrics exporter)
- Cited by (reverse of Design docs): none
- Shares design docs with (two hops via Design docs): qs-devserver (Development server) ×1; qs-io-s3 (Object storage adapter) ×1; qs-logging (Structured logging) ×1; qs-metrics (Metrics exporter) ×1
