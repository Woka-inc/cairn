# qs-tracing — Tracing

# Tracing

## Overview

A span is opened per batch per stage and per adapter call. Context is propagated into HTTP and storage requests so that remote systems can join the trace.

## Usage

```ts
pipeline("p", { tracing: { sampleRate: 0.1 } })
```

## Notes

- Sampling is decided once per batch.
