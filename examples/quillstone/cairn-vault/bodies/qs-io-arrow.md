# qs-io-arrow — Arrow bridge

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
