---
id: qs-tracing
kind: module
title: Tracing
summary: "Creates spans for stages and adapter calls and propagates context."
layer: observability
stability: beta
language: TypeScript
owner: observability
depends_on: [qs-core]
related: [qs-metrics, qs-logging]
design_docs: [DD-008]
goal: "Follow one batch through the whole pipeline."
---

# Tracing

## Overview

A span is opened per batch per stage and per adapter call. Context is propagated into HTTP and storage requests so that remote systems can join the trace.

## Usage

```ts
pipeline("p", { tracing: { sampleRate: 0.1 } })
```

## Notes

- Sampling is decided once per batch.
