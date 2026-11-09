# qs-cli — Command-line runner

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
