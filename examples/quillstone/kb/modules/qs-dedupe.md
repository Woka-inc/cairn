---
id: qs-dedupe
kind: module
title: Deduplication
summary: "Removes duplicate rows by key within a time window."
layer: transform
stability: experimental
language: Rust
owner: transforms
depends_on: [qs-core, qs-tx-window]
related: [qs-tx-join]
design_docs: [DD-002, DD-007]
goal: "Make at-least-once sources safe to aggregate."
---

# Deduplication

## Overview

Deduplication keeps the first row per key inside a window and drops later copies. It uses a native probabilistic filter backed by an exact set for recent keys.

## Usage

```ts
p.dedupe({ key: "event_id", within: "10m" })
```

## Notes

- False positives are possible only in approximate mode, which is off by default.
