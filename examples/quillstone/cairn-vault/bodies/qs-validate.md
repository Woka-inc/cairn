# qs-validate — Validation rules

# Validation rules

## Overview

Rules such as `notNull`, `range`, `oneOf`, and `matches` are declared per field. Failing rows can be dropped, quarantined to a sink, or fail the stage.

## Usage

```ts
p.validate({ email: matches(/@/), qty: range(1, 999) }, { onFail: "quarantine" })
```

## Notes

- Rule results are exported as metrics.
