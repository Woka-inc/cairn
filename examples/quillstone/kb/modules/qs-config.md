---
id: qs-config
kind: module
title: Configuration loader
summary: "Loads pipeline settings from files, environment variables, and flags in a fixed order."
layer: core
stability: stable
language: TypeScript
owner: runtime
depends_on: [qs-core]
related: [qs-cli]
design_docs: [DD-001, DD-005]
goal: "Make every setting traceable to exactly one source."
---

# Configuration loader

## Overview

Settings are merged from defaults, a `quillstone.toml` file, environment variables prefixed `QS_`, and command-line flags, in that order. Each resolved value remembers where it came from, which `qs explain-config` prints.

## Usage

```ts
const cfg = await loadConfig({ file: "quillstone.toml" })
cfg.get("io.s3.region") // value and origin
```

## Notes

- Unknown keys are rejected with the closest valid key as a hint.
- Secrets are never printed by `explain-config`; they show as `<set>`.
