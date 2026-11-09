# Catalog (35 nodes)

One row per node. Filter by attribute or edge column here; open `cards/<id>.md` to judge one node.

| id | title | kind | layer | stability | language | owner | status | depends_on | related | design_docs |
|---|---|---|---|---|---|---|---|---|---|---|
| DD-001 | Error model | design-doc |  |  |  | architecture | accepted |  |  |  |
| DD-002 | Row representation | design-doc |  |  |  | architecture | accepted |  | DD-007 |  |
| DD-003 | Retry policy and idempotence | design-doc |  |  |  | architecture | accepted |  | DD-001 |  |
| DD-004 | Schema evolution | design-doc |  |  |  | architecture | accepted |  |  |  |
| DD-005 | Configuration and command surface | design-doc |  |  |  | architecture | accepted |  |  |  |
| DD-006 | Adapter contract | design-doc |  |  |  | architecture | accepted |  | DD-001 |  |
| DD-007 | Columnar interop | design-doc |  |  |  | architecture | draft |  | DD-002 |  |
| DD-008 | Telemetry conventions | design-doc |  |  |  | architecture | accepted |  |  |  |
| qs-cli | Command-line runner | module | tooling | stable | TypeScript | tooling |  | qs-core, qs-config, qs-scheduler | qs-config, qs-devserver | DD-005 |
| qs-config | Configuration loader | module | core | stable | TypeScript | runtime |  | qs-core | qs-cli | DD-001, DD-005 |
| qs-core | Core runtime | module | core | stable | TypeScript | runtime |  |  | qs-config, qs-scheduler | DD-001, DD-002 |
| qs-dedupe | Deduplication | module | transform | experimental | Rust | transforms |  | qs-core, qs-tx-window | qs-tx-join | DD-002, DD-007 |
| qs-devserver | Development server | module | tooling | beta | TypeScript | tooling |  | qs-cli, qs-metrics | qs-cli | DD-005, DD-008 |
| qs-examples | Example pipelines | module | tooling | stable | TypeScript | tooling |  | qs-cli, qs-io-csv |  |  |
| qs-io-arrow | Arrow bridge | module | io | beta | Rust | data-io |  | qs-io-base | qs-io-parquet | DD-006, DD-007 |
| qs-io-base | I/O adapter base | module | io | stable | TypeScript | data-io |  | qs-core, qs-schema | qs-io-csv | DD-001, DD-006 |
| qs-io-csv | CSV reader and writer | module | io | stable | TypeScript | data-io |  | qs-io-base | qs-io-parquet, qs-io-json | DD-006 |
| qs-io-http | HTTP source | module | io | beta | TypeScript | data-io |  | qs-io-base, qs-retry | qs-io-s3 | DD-006, DD-003 |
| qs-io-json | JSON Lines reader | module | io | beta | TypeScript | data-io |  | qs-io-base | qs-io-csv | DD-006 |
| qs-io-parquet | Parquet adapter | module | io | stable | Rust | data-io |  | qs-io-base, qs-schema | qs-io-csv, qs-io-arrow | DD-006, DD-004 |
| qs-io-s3 | Object storage adapter | module | io | stable | TypeScript | data-io |  | qs-io-base, qs-retry, qs-config | qs-io-http | DD-006, DD-003, DD-008 |
| qs-io-sql | SQL source | module | io | experimental | TypeScript | data-io |  | qs-io-base, qs-schema | qs-io-arrow | DD-006, DD-004 |
| qs-logging | Structured logging | module | observability | stable | TypeScript | observability |  | qs-core, qs-config | qs-tracing | DD-001, DD-008 |
| qs-metrics | Metrics exporter | module | observability | stable | TypeScript | observability |  | qs-core | qs-tracing | DD-001, DD-008 |
| qs-plugin-sdk | Plugin SDK | module | tooling | beta | TypeScript | tooling |  | qs-core, qs-schema, qs-io-base | qs-io-base | DD-001, DD-005 |
| qs-retry | Retry and backoff | module | core | stable | TypeScript | runtime |  | qs-core | qs-scheduler | DD-001 |
| qs-scheduler | Stage scheduler | module | core | stable | TypeScript | runtime |  | qs-core | qs-retry, qs-metrics | DD-001, DD-003 |
| qs-schema | Schema registry | module | core | stable | TypeScript | runtime |  | qs-core | qs-validate | DD-001, DD-004 |
| qs-testkit | Test kit | module | tooling | stable | TypeScript | tooling |  | qs-core, qs-io-base | qs-plugin-sdk | DD-005 |
| qs-tracing | Tracing | module | observability | beta | TypeScript | observability |  | qs-core | qs-metrics, qs-logging | DD-008 |
| qs-tx-filter | Filtering | module | transform | stable | TypeScript | transforms |  | qs-core | qs-tx-map | DD-002 |
| qs-tx-join | Joins | module | transform | beta | TypeScript | transforms |  | qs-core, qs-schema | qs-tx-window | DD-001, DD-002, DD-007 |
| qs-tx-map | Row mapping | module | transform | stable | TypeScript | transforms |  | qs-core, qs-schema | qs-tx-filter | DD-001, DD-002 |
| qs-tx-window | Windowed aggregation | module | transform | beta | TypeScript | transforms |  | qs-core, qs-scheduler | qs-tx-join | DD-002, DD-007 |
| qs-validate | Validation rules | module | transform | stable | TypeScript | transforms |  | qs-schema | qs-tx-filter | DD-001, DD-004 |
