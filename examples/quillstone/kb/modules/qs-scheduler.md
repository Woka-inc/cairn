---
id: qs-scheduler
kind: module
title: Stage scheduler
summary: "Runs ready stages on a bounded worker pool with back-pressure."
layer: core
stability: stable
language: TypeScript
owner: runtime
depends_on: [qs-core]
related: [qs-retry, qs-metrics]
design_docs: [DD-001, DD-003]
goal: "Keep memory bounded while keeping every worker busy."
---

# Stage scheduler

## Overview

The scheduler pulls ready stages from the runtime and assigns them to workers. A stage that produces faster than its consumer is paused when the consumer queue reaches its high-water mark.

## Usage

```ts
const p = pipeline("events", { workers: 8, highWaterMark: 64 })
```

## Notes

- The default worker count is the number of CPU cores minus one.
- Back-pressure is per edge, not global.
