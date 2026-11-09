---
id: qs-io-csv
kind: module
title: CSV reader and writer
summary: "Streams CSV files with header detection, quoting rules, and type inference."
layer: io
stability: stable
language: TypeScript
owner: data-io
depends_on: [qs-io-base]
related: [qs-io-parquet, qs-io-json]
design_docs: [DD-006]
goal: "Read messy CSV files without loading them into memory."
---

# CSV reader and writer

## Overview

The CSV adapter reads files of any size in batches. It detects the delimiter from the first 64 KB, infers column types from a sample, and can be given an explicit schema instead.

## Usage

```ts
pipeline("p").from(csv("in.csv", { delimiter: ";" }))
```

## Notes

- Type inference never narrows a column after the sample; mismatches become errors.
- Writing uses RFC 4180 quoting.
