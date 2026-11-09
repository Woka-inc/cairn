# qs-logging — Structured logging

# Structured logging

## Overview

The logger writes one JSON object per line with level, message, stage, batch id, and trace id. Levels are set per module through the configuration loader.

## Usage

```ts
log.info("batch done", { rows: n })
```

## Notes

- Error logs include the `QsError` code and cause chain.
