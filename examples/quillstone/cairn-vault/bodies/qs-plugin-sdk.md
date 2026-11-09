# qs-plugin-sdk — Plugin SDK

# Plugin SDK

## Overview

A plugin declares its adapters and transforms in a manifest. The SDK checks the manifest, version range, and adapter contract when the plugin is loaded.

## Usage

```ts
export default definePlugin({ name: "qs-io-ftp", adapters: [FtpSource] })
```

## Notes

- Plugins run in the same process; there is no sandbox.
