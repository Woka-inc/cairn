---
id: qs-tx-join
kind: module
title: Joins
summary: "Hash and sort-merge joins between two streams."
layer: transform
stability: beta
language: TypeScript
owner: transforms
depends_on: [qs-core, qs-schema]
related: [qs-tx-window]
design_docs: [DD-001, DD-002, DD-007]
goal: "Combine two sources by key without loading both fully."
---

# Joins

## Overview

The join picks a hash join when the smaller side fits the memory budget and a sort-merge join otherwise. Inner, left, and anti joins are supported.

## Usage

```ts
orders.join(customers, { on: "customer_id", how: "left" })
```

## Notes

- Full outer joins are not supported yet.
- Spill files are written to the configured temp folder.
