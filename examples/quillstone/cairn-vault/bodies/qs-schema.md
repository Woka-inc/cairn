# qs-schema — Schema registry

# Schema registry

## Overview

A schema is a named, versioned list of typed fields. The registry answers whether version B can read data written with version A, following the rules in the schema evolution design doc.

## Usage

```ts
registry.register("order", 3, fields)
registry.canRead("order", 2, 3) // true
```

## Notes

- Field removal is backward compatible only when the field had a default.
- Schemas are immutable once registered.
