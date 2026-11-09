# qs-io-csv — CSV reader and writer

# CSV reader and writer

## Overview

The CSV adapter reads files of any size in batches. It detects the delimiter from the first 64 KB, infers column types from a sample, and can be given an explicit schema instead.

## Usage

```ts
pipeline("p").from(csv("in.csv", { delimiter: ";" }))
```

## Notes

- Type inference never narrows a column after the sample; mismatches become errors.
- Writing uses RFC 4180 quoting.
