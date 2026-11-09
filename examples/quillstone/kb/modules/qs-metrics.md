---
id: qs-metrics
kind: module
title: Metrics exporter
summary: "Counters, gauges, and histograms for every stage, exported in a standard text format."
layer: observability
stability: stable
language: TypeScript
owner: observability
depends_on: [qs-core]
related: [qs-tracing]
design_docs: [DD-001, DD-008]
goal: "See throughput and lag per stage without extra code."
---

# Metrics exporter

## Overview

Every stage reports rows in, rows out, errors, and queue depth. The exporter serves them on a local endpoint or pushes them to a collector.

## Usage

```ts
pipeline("p", { metrics: { port: 9464 } })
```

## Notes

- Metric names follow the telemetry conventions design doc.
