---
id: qs-io-sql
kind: module
title: SQL source
summary: "Reads query results from SQL databases in keyset-paginated batches."
layer: io
stability: experimental
language: TypeScript
owner: data-io
depends_on: [qs-io-base, qs-schema]
related: [qs-io-arrow]
design_docs: [DD-006, DD-004]
goal: "Read large tables without long-running transactions."
---

# SQL source

## Overview

The SQL source runs a query with keyset pagination on a declared key column and maps column types to registry schemas.

## Usage

```ts
pipeline("p").from(sql(conn, "SELECT * FROM orders", { key: "id" }))
```

## Notes

- Only read queries are allowed.
- Driver support is limited to two databases in this release.
