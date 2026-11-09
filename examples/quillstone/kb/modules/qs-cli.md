---
id: qs-cli
kind: module
title: Command-line runner
summary: "The `qs` command: run, validate, and explain pipelines."
layer: tooling
stability: stable
language: TypeScript
owner: tooling
depends_on: [qs-core, qs-config, qs-scheduler]
related: [qs-config, qs-devserver]
design_docs: [DD-005]
goal: "Run any pipeline file the same way on a laptop and in production."
---

# Command-line runner

## Overview

The CLI loads a pipeline module, resolves configuration, and runs it. Subcommands include `run`, `validate`, `explain-config`, and `graph`, which prints the stage graph.

## Usage

```ts
qs run pipelines/orders.ts --workers 4
qs graph pipelines/orders.ts
```

## Notes

- Exit codes are stable and documented.
- Flags override every other configuration source.
