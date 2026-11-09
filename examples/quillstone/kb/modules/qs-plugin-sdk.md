---
id: qs-plugin-sdk
kind: module
title: Plugin SDK
summary: "Packages third-party adapters and transforms as installable plugins."
layer: tooling
stability: beta
language: TypeScript
owner: tooling
depends_on: [qs-core, qs-schema, qs-io-base]
related: [qs-io-base]
design_docs: [DD-001, DD-005]
goal: "Let others extend Quillstone without forking it."
---

# Plugin SDK

## Overview

A plugin declares its adapters and transforms in a manifest. The SDK checks the manifest, version range, and adapter contract when the plugin is loaded.

## Usage

```ts
export default definePlugin({ name: "qs-io-ftp", adapters: [FtpSource] })
```

## Notes

- Plugins run in the same process; there is no sandbox.
