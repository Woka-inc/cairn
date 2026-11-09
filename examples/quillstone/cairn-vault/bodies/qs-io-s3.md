# qs-io-s3 — Object storage adapter

# Object storage adapter

## Overview

Objects are listed by prefix and read as streams. Writes larger than 16 MB use multipart uploads, and each part is retried on its own.

## Usage

```ts
pipeline("p").from(s3("s3://bucket/raw/2026/")).to(s3("s3://bucket/clean/"))
```

## Notes

- Credentials come from the configuration loader, never from code.
- Each upload emits a telemetry span.
