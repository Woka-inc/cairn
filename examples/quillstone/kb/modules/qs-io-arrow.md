---
id: qs-io-arrow
kind: module
title: Arrow bridge
summary: "Converts batches to and from Arrow record batches without copying."
layer: io
stability: beta
language: Rust
owner: data-io
depends_on: [qs-io-base]
related: [qs-io-parquet]
design_docs: [DD-006, DD-007]
goal: "Exchange data with Arrow-based tools at memory speed."
---

# Arrow bridge

## Overview

The bridge exposes `toArrow` and `fromArrow`. When the batch layout already matches, buffers are shared rather than copied.

## Usage

```ts
const rb = toArrow(batch)
const back = fromArrow(rb)
```

## Notes

- Dictionary-encoded strings are kept encoded.
- Zero-copy requires aligned buffers.
