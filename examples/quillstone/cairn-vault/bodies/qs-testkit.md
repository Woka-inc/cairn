# qs-testkit — Test kit

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
