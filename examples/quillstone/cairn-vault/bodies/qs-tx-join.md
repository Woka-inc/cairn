# qs-tx-join — Joins

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
