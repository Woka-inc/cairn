# qs-core — Core runtime

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
