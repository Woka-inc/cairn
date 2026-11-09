# qs-config — Configuration loader

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
