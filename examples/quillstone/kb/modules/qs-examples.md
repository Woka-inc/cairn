---
id: qs-examples
kind: module
title: Example pipelines
summary: "Small runnable pipelines that show common patterns end to end."
layer: tooling
stability: stable
language: TypeScript
owner: tooling
depends_on: [qs-cli, qs-io-csv]
related: []
design_docs: []
goal: "Give new users something that runs in one command."
---

# Example pipelines

## Overview

The examples package contains a CSV-to-Parquet conversion, an HTTP ingest with retries, and a windowed count over a JSON Lines file. Each example has a README and sample data.

## Usage

```ts
qs run examples/csv-to-parquet.ts
```

## Notes

- Examples are tested in CI against the latest release.
