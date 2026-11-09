---
id: qs-devserver
kind: module
title: Development server
summary: "Reruns a pipeline on file changes and shows live stage metrics in the browser."
layer: tooling
stability: beta
language: TypeScript
owner: tooling
depends_on: [qs-cli, qs-metrics]
related: [qs-cli]
design_docs: [DD-005, DD-008]
goal: "Shorten the edit-run loop while building a pipeline."
---

# Development server

## Overview

The development server watches pipeline files, reruns on change with a sample of the input, and serves a local page with the stage graph and live counters.

## Usage

```ts
qs dev pipelines/orders.ts --sample 1000
```

## Notes

- Never use the development server against production data.
