---
id: qs-io-base
kind: module
title: I/O adapter base
summary: "Base classes and the contract that every source and sink adapter implements."
layer: io
stability: stable
language: TypeScript
owner: data-io
depends_on: [qs-core, qs-schema]
related: [qs-io-csv]
design_docs: [DD-001, DD-006]
goal: "Make adapters interchangeable behind one small interface."
---

# I/O adapter base

## Overview

An adapter implements `open`, `read` or `write`, and `close`. The base class handles batching, schema checks, and error wrapping so that concrete adapters stay small.

## Usage

```ts
class MySource extends SourceAdapter {
  async *read() { yield batch }
}
```

## Notes

- Adapters must declare whether they support resuming from a checkpoint.
- The default batch size is 1,000 rows.
