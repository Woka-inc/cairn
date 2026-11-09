---
id: qs-logging
kind: module
title: Structured logging
summary: "JSON logs with stage, batch, and trace identifiers on every line."
layer: observability
stability: stable
language: TypeScript
owner: observability
depends_on: [qs-core, qs-config]
related: [qs-tracing]
design_docs: [DD-001, DD-008]
goal: "Make logs searchable and joinable with traces."
---

# Structured logging

## Overview

The logger writes one JSON object per line with level, message, stage, batch id, and trace id. Levels are set per module through the configuration loader.

## Usage

```ts
log.info("batch done", { rows: n })
```

## Notes

- Error logs include the `QsError` code and cause chain.
