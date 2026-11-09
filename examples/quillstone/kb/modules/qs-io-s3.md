---
id: qs-io-s3
kind: module
title: Object storage adapter
summary: "Reads and writes objects in S3-compatible storage with multipart uploads."
layer: io
stability: stable
language: TypeScript
owner: data-io
depends_on: [qs-io-base, qs-retry, qs-config]
related: [qs-io-http]
design_docs: [DD-006, DD-003, DD-008]
goal: "Move large files to and from object storage reliably."
---

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
