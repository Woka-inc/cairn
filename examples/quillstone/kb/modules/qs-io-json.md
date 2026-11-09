---
id: qs-io-json
kind: module
title: JSON Lines reader
summary: "Reads newline-delimited JSON with optional schema projection."
layer: io
stability: beta
language: TypeScript
owner: data-io
depends_on: [qs-io-base]
related: [qs-io-csv]
design_docs: [DD-006]
goal: "Ingest event logs without a separate parsing step."
---

# JSON Lines reader

## Overview

Each line is parsed as one JSON object. A projection list keeps only the named paths, which cuts memory use on wide records.

## Usage

```ts
pipeline("p").from(jsonl("events.jsonl", { project: ["user.id", "ts"] }))
```

## Notes

- Malformed lines can be skipped and counted instead of failing the stage.
