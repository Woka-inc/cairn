---
id: qs-schema
kind: module
title: Schema registry
summary: "Stores typed row schemas and checks compatibility between versions."
layer: core
stability: stable
language: TypeScript
owner: runtime
depends_on: [qs-core]
related: [qs-validate]
design_docs: [DD-001, DD-004]
goal: "Let readers and writers agree on row shapes across schema versions."
---

# Schema registry

## Overview

A schema is a named, versioned list of typed fields. The registry answers whether version B can read data written with version A, following the rules in the schema evolution design doc.

## Usage

```ts
registry.register("order", 3, fields)
registry.canRead("order", 2, 3) // true
```

## Notes

- Field removal is backward compatible only when the field had a default.
- Schemas are immutable once registered.
