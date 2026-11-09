# qs-devserver — Development server

# Development server

## Overview

The development server watches pipeline files, reruns on change with a sample of the input, and serves a local page with the stage graph and live counters.

## Usage

```ts
qs dev pipelines/orders.ts --sample 1000
```

## Notes

- Never use the development server against production data.
