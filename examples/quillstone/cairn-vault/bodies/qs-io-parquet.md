# qs-io-parquet — Parquet adapter

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
