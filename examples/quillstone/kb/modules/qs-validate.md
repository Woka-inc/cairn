---
id: qs-validate
kind: module
title: Validation rules
summary: "Declarative row checks with per-rule error counts."
layer: transform
stability: stable
language: TypeScript
owner: transforms
depends_on: [qs-schema]
related: [qs-tx-filter]
design_docs: [DD-001, DD-004]
goal: "Catch bad data at the edge with readable rules."
---

# Validation rules

## Overview

Rules such as `notNull`, `range`, `oneOf`, and `matches` are declared per field. Failing rows can be dropped, quarantined to a sink, or fail the stage.

## Usage

```ts
p.validate({ email: matches(/@/), qty: range(1, 999) }, { onFail: "quarantine" })
```

## Notes

- Rule results are exported as metrics.
