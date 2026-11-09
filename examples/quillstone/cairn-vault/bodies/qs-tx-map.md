# qs-tx-map — Row mapping

# Row mapping

## Overview

`map` applies a row function. When an output schema is given, each produced row is checked and mismatches are reported with the row index.

## Usage

```ts
p.map((r) => ({ ...r, total: r.qty * r.price }), { schema: "order@3" })
```

## Notes

- Async row functions are run with bounded concurrency.
