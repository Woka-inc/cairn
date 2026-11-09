---
id: qs-tx-map
kind: module
title: Row mapping
summary: "Applies a function to every row and checks the output schema."
layer: transform
stability: stable
language: TypeScript
owner: transforms
depends_on: [qs-core, qs-schema]
related: [qs-tx-filter]
design_docs: [DD-001, DD-002]
goal: "Make the most common transform safe and fast."
---

# Row mapping

## Overview

`map` applies a row function. When an output schema is given, each produced row is checked and mismatches are reported with the row index.

## Usage

```ts
p.map((r) => ({ ...r, total: r.qty * r.price }), { schema: "order@3" })
```

## Notes

- Async row functions are run with bounded concurrency.
