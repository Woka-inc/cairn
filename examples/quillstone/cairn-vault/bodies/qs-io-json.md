# qs-io-json — JSON Lines reader

# JSON Lines reader

## Overview

Each line is parsed as one JSON object. A projection list keeps only the named paths, which cuts memory use on wide records.

## Usage

```ts
pipeline("p").from(jsonl("events.jsonl", { project: ["user.id", "ts"] }))
```

## Notes

- Malformed lines can be skipped and counted instead of failing the stage.
