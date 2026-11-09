# qs-tx-filter — Filtering

# Filtering

## Overview

`filter` keeps rows for which the predicate returns true. Dropped rows are counted per reason when the predicate returns a reason string instead of false.

## Usage

```ts
p.filter((r) => r.total > 0 || "non-positive total")
```

## Notes

- Simple predicates on Parquet sources are pushed down to the reader.
