# qs-dedupe — Deduplication

# Deduplication

## Overview

Deduplication keeps the first row per key inside a window and drops later copies. It uses a native probabilistic filter backed by an exact set for recent keys.

## Usage

```ts
p.dedupe({ key: "event_id", within: "10m" })
```

## Notes

- False positives are possible only in approximate mode, which is off by default.
