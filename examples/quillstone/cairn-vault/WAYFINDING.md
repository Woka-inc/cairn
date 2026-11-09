<!-- cairn:wayfinding:start -->
## Knowledge-base lookup (Cairn)

The Cairn vault in `cairn-vault/` is generated from `kb/`; do not edit it. Decide the question type first, then start where its rule says.

- Topical lookup (nodes whose content matches a topic): search the cards in `cairn-vault/cards/` for the topic's keywords with a file-search tool. Open the best-matching cards; if there are no hits, search the full texts in `cairn-vault/bodies/`.
- Attribute filter (select nodes by kind, layer, stability, language, owner, status): read `cairn-vault/CATALOG.md`, one row per node, instead of opening cards one by one.
- Relation lookup (depends on, related, design docs): open `cairn-vault/cards/<id>.md` and read its Relations section, which also lists reverse edges (Used by; Related from; Cited by) and two-hop neighbors (Shares design docs with). "none" means no such neighbor exists. Rows for relations that no node of the same kind has are left out. A list is truncated only when it ends with "(K of N shown — reason)"; only then find the rest in the edge columns of `cairn-vault/CATALOG.md`, otherwise do not search further.
- Multi-node composition (several nodes that together cover several topics): run one search per topic, then combine and order the candidates with the columns of `cairn-vault/CATALOG.md`.

General rules:
- Open full bodies (`cairn-vault/bodies/<id>.md`) only when a card does not contain what you need.
- If one route is insufficient, verify through a second route.
- Read vault files with file-reading and search tools, not shell commands.
- Use node identifiers exactly as they appear in the files or tool output.
<!-- cairn:wayfinding:end -->
