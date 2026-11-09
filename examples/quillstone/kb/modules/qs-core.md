---
id: qs-core
kind: module
title: Core runtime
summary: "Owns the pipeline object, stage lifecycle, and the shared error type."
layer: core
stability: stable
language: TypeScript
owner: runtime
depends_on: []
related: [qs-config, qs-scheduler]
design_docs: [DD-001, DD-002]
goal: "Give every other module one pipeline object and one error model to build on."
---

# Core runtime

## Overview

The core runtime defines `Pipeline`, `Stage`, and `QsError`. A pipeline is an ordered graph of stages; each stage receives batches of rows and returns batches. The runtime does not schedule work itself; it hands ready stages to the scheduler.

## Usage

```ts
const p = pipeline("orders")
  .from(csv("orders.csv"))
  .map(normalize)
  .to(parquet("orders.parquet"))
await p.run()
```

## Lifecycle

A stage moves through `created`, `opened`, `running`, `drained`, and `closed`. Hooks exist for each transition.

## Notes

- Stages must be pure with respect to their input batch; side effects belong in sinks.
- All thrown errors are wrapped in `QsError` with a stable `code` field.
