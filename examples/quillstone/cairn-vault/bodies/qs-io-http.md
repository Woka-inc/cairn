# qs-io-http — HTTP source

# HTTP source

## Overview

The HTTP source follows `next` links or page numbers, retries transient failures through the retry module, and records the last page as a checkpoint.

## Usage

```ts
pipeline("p").from(http("https://api.example.test/items", { paginate: "link" }))
```

## Notes

- Rate limits are honoured from `Retry-After` headers.
