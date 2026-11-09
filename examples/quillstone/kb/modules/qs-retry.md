---
id: qs-retry
kind: module
title: Retry and backoff
summary: "Retries failed operations with exponential backoff and jitter."
layer: core
stability: stable
language: TypeScript
owner: runtime
depends_on: [qs-core]
related: [qs-scheduler]
design_docs: [DD-001]
goal: "Recover from transient failures without hiding permanent ones."
---

# Retry and backoff

## Overview

Wrap any async operation with `withRetry`. Errors are classified as transient or permanent by their `QsError` code; only transient errors are retried.

## Usage

```ts
await withRetry(() => fetchPage(url), { attempts: 5, baseMs: 200 })
```

## Notes

- Jitter is full jitter by default.
- A retry budget per pipeline stops retry storms.
