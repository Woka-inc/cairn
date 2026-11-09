# qs-io-sql — SQL source

# SQL source

## Overview

The SQL source runs a query with keyset pagination on a declared key column and maps column types to registry schemas.

## Usage

```ts
pipeline("p").from(sql(conn, "SELECT * FROM orders", { key: "id" }))
```

## Notes

- Only read queries are allowed.
- Driver support is limited to two databases in this release.
