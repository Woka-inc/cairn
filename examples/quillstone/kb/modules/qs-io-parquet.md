---
id: qs-io-parquet
kind: module
title: Parquet adapter
summary: "Reads and writes Parquet files through a native extension."
layer: io
stability: stable
language: Rust
owner: data-io
depends_on: [qs-io-base, qs-schema]
related: [qs-io-csv, qs-io-arrow]
design_docs: [DD-006, DD-004]
goal: "Give columnar storage without leaving the pipeline API."
---

# Parquet adapter

## Overview

The adapter is a thin binding over a native Parquet library. It maps Quillstone schemas to Parquet logical types and supports predicate push-down for simple filters.

## Usage

```ts
pipeline("p").to(parquet("out.parquet", { compression: "zstd" }))
```

## Notes

- Nested lists deeper than three levels are not supported.
- Row-group size defaults to 128 MB.
