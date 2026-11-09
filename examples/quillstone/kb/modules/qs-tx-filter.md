---
id: qs-tx-filter
kind: module
title: Filtering
summary: "Keeps rows that match a predicate and counts the rest."
layer: transform
stability: stable
language: TypeScript
owner: transforms
depends_on: [qs-core]
related: [qs-tx-map]
design_docs: [DD-002]
goal: "Drop rows early and still know how many were dropped."
---

# Filtering

## Overview

`filter` keeps rows for which the predicate returns true. Dropped rows are counted per reason when the predicate returns a reason string instead of false.

## Usage

```ts
p.filter((r) => r.total > 0 || "non-positive total")
```

## Notes

- Simple predicates on Parquet sources are pushed down to the reader.
