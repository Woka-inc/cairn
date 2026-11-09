# qs-metrics — Metrics exporter

# Metrics exporter

## Overview

Every stage reports rows in, rows out, errors, and queue depth. The exporter serves them on a local endpoint or pushes them to a collector.

## Usage

```ts
pipeline("p", { metrics: { port: 9464 } })
```

## Notes

- Metric names follow the telemetry conventions design doc.
