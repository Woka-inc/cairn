# qs-io-base — I/O adapter base

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
