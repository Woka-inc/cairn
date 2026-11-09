# qs-tx-window — Windowed aggregation

# Windowed aggregation

## Overview

Windows are defined over an event-time column. A watermark decides when a window is complete; late rows within the allowed lateness update the result, later rows go to a side output.

## Usage

```ts
p.window({ time: "ts", size: "5m", slide: "1m" }).agg({ n: count() })
```

## Notes

- State is kept per key and window and is checkpointed with the pipeline.
