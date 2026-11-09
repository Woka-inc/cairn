---
id: qs-io-http
kind: module
title: HTTP source
summary: "Pulls paginated JSON or CSV from HTTP endpoints."
layer: io
stability: beta
language: TypeScript
owner: data-io
depends_on: [qs-io-base, qs-retry]
related: [qs-io-s3]
design_docs: [DD-006, DD-003]
goal: "Turn a paginated API into a stream of batches."
---

# HTTP source

## Overview

The HTTP source follows `next` links or page numbers, retries transient failures through the retry module, and records the last page as a checkpoint.

## Usage

```ts
pipeline("p").from(http("https://api.example.test/items", { paginate: "link" }))
```

## Notes

- Rate limits are honoured from `Retry-After` headers.
