---
id: qs-testkit
kind: module
title: Test kit
summary: "In-memory sources and sinks and assertions for pipeline tests."
layer: tooling
stability: stable
language: TypeScript
owner: tooling
depends_on: [qs-core, qs-io-base]
related: [qs-plugin-sdk]
design_docs: [DD-005]
goal: "Test pipelines without files, networks, or clocks."
---

# Test kit

## Overview

The test kit provides `memorySource`, `memorySink`, a fake clock for windows, and assertions on emitted batches and error counts.

## Usage

```ts
const sink = memorySink()
await pipeline("t").from(memorySource(rows)).to(sink).run()
expect(sink.rows).toHaveLength(3)
```

## Notes

- The fake clock also drives watermarks.
