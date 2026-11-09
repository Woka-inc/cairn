---
id: qs-tx-window
kind: module
title: Windowed aggregation
summary: "Tumbling and sliding windows over event time with watermarks."
layer: transform
stability: beta
language: TypeScript
owner: transforms
depends_on: [qs-core, qs-scheduler]
related: [qs-tx-join]
design_docs: [DD-002, DD-007]
goal: "Aggregate unbounded streams by time without unbounded state."
---

# Windowed aggregation

## Overview

Windows are defined over an event-time column. A watermark decides when a window is complete; late rows within the allowed lateness update the result, later rows go to a side output.

## Usage

```ts
p.window({ time: "ts", size: "5m", slide: "1m" }).agg({ n: count() })
```

## Notes

- State is kept per key and window and is checkpointed with the pipeline.
