# Configuration

English · [한국어](configuration.ko.md)

Back to the [README](../README.md).

## Commands

```
cairn build [--config cairn.config.json] [--if-stale] [--quiet]
cairn check [--config cairn.config.json]
cairn guide [--config cairn.config.json] [--write FILE]
cairn init  <kb-folder> [--config cairn.config.json] [--write] [--force]
cairn watch [--config cairn.config.json]
```

Run them as `node path/to/cairn/bin/cairn.mjs <command>`.

| Command | What it does |
|---|---|
| `build` | Reads the notes, expands the graph, renders all files, checks size targets, writes to a temporary sibling folder, verifies it, and only then swaps it into place. Prints the counts and the actual sizes (largest card, `CATALOG.md`, `INDEX.md`) against their targets. If any card, the table, or the index exceeds its target, the build fails, lists each file with the bytes over, and leaves the previous vault untouched. `--if-stale` skips the build when the fingerprint is unchanged. |
| `check` | Read-only. Confirms the config is valid, the fingerprint matches the current inputs, every file equals a fresh build byte for byte, size targets are met (with the actual sizes), there is one card and one table row per node, and, when `wayfinding.instructionFile` is set, that file carries the current block. Exits 1 on any problem. |
| `guide` | Prints the wayfinding block, or with `--write FILE` inserts it between `<!-- cairn:wayfinding:start -->` and `<!-- cairn:wayfinding:end -->` (replacing an existing block, or appending one). Paths in the block are relative to `FILE`. It warns when the vault is stale and refuses to write into a note (a file inside `source.dir` with an id). |
| `init` | Scans a folder and proposes a config: id, title, and description fields, `source.exclude` (agent instruction files, READMEs, and files without the id field), a kind field, edge fields (values that resolve to node ids), attributes (low-cardinality fields), card fields, and a shared-intermediate edge. Fields that are complete within one kind (for example `status` on every design document) are proposed even when their overall share is low, and the report shows the per-kind coverage. `--config` names the config file the proposal is for (`source.dir` is relative to its folder). Prints JSON unless `--write`. |
| `watch` | Rebuilds when files under `source.dir` or the config change. |

Exit codes: 0 ok, 1 failure, 2 usage or config error, 4 another build holds the lock.

## Where the config and the vault go

All paths in the config are relative to its folder. `source.dir` is the folder that holds the notes; `output` is the vault folder (default `cairn-vault`, next to the config).

- **Notes in a subfolder** (for example `notes/` in a project): put the config at the project root with `"source": { "dir": "notes" }`. The vault goes next to the notes.
- **Notes are the whole repository**: either put the config one level up, next to the repository, so the vault sits outside it; or keep the config at the root with `"source": { "dir": "." }`, so the vault is a subfolder of the notes. Cairn leaves its own output out of the inputs, but other tools that read the notes (Obsidian, for example) will see it, so exclude it there and decide about `.gitignore` ([below](#keeping-the-vault-fresh)).
- `output` must not be the notes folder itself or contain it, because a build replaces the whole output folder; the error message suggests the fixes above.
- Set `wayfinding.instructionFile` to the agent instruction file (relative to the config). Paths in the block are written relative to that file, it is never read as a note even inside the notes folder, and `check` verifies that it carries the current block.

## Configuration reference

`cairn.config.json`. Relative paths are resolved against the folder that holds the config file. Unknown keys are rejected (with a suggestion), and every problem is listed at once.

```json
{
  "source": { "dir": "kb", "include": ["**/*.md"], "exclude": ["README.md"] },
  "idField": "id",
  "titleField": "title",
  "descriptionField": "summary",
  "kindField": "kind",
  "attributes": ["kind", "layer", "stability", "language", "owner", "status"],
  "edges": [
    { "field": "depends_on", "label": "Depends on", "reverse": "Used by" },
    { "field": "related", "label": "Related", "reverse": "Related from" },
    { "field": "design_docs", "label": "Design docs", "reverse": "Cited by" }
  ],
  "sharedNeighbors": { "via": "design_docs", "label": "Shares design docs with" },
  "k": 10,
  "card": { "fields": ["goal", "decision"], "headings": true, "maxBytes": 5120 },
  "catalog": { "maxBytes": 20480 },
  "output": "cairn-vault",
  "wayfinding": { "instructionFile": "AGENTS.md" }
}
```

| Key | Default | Meaning |
|---|---|---|
| `$comment` | none | A string or a list of strings for notes about the config. Ignored, and not part of the fingerprint. |
| `source.dir` | required | Knowledge-base folder. `output` may be a subfolder of it, but not the folder itself or a folder that contains it. |
| `source.include` | `["**/*.md"]` | Globs (`*`, `**`, `?`) of node files, relative to `source.dir`. Dot-folders, Cairn's own output, and `wayfinding.instructionFile` are always skipped. |
| `source.exclude` | `[]` | Globs to leave out (READMEs, templates, drafts). |
| `idField` | `"id"` | Front-matter field with the node id, or `"$filename"` to use the file name without extension. Files without an id are not nodes: they are skipped with a warning and do not affect the fingerprint, so editing a README or an instruction file inside `source.dir` never makes the vault stale. Duplicate ids fail the build. |
| `titleField` | `"title"` | Field shown as the node title (falls back to the id). |
| `descriptionField` | none | Optional one-line description shown under the card title. |
| `kindField` | none | Field that names a node's kind (for example `"kind"` or `"type"`). When set, a card leaves out relation rows that no node of its kind has: a forward or two-hop row when no node of the kind has the edge field at all, a reverse row when no node of the kind is a target of the edge. A used edge with no targets still reads `none`. Without it, every card lists every row. |
| `attributes` | `[]` | Fields people filter on. They become card front matter, `CATALOG.md` columns, and value counts in `INDEX.md`. |
| `edges[]` | `[]` | Typed edge fields. A string is shorthand for `{ "field": "<name>" }`. |
| `edges[].field` | required | Front-matter field holding target ids (a list or a single value). `[[id]]`, `[[id\|alias]]`, `[text](path/id.md)`, and `path/id.md` are normalized to `id`. |
| `edges[].label` | from the field name | Label on cards. |
| `edges[].reverse` | none | Label for the reverse direction (for example `"Used by"`). When set, each card lists the nodes that point to it through this edge. Set it where people ask "what depends on X". |
| `edges[].external` | `false` | Targets are not nodes (for example dataset names). They are listed as text and can still serve as shared intermediates. Otherwise edges to unknown ids are dropped with a warning. |
| `sharedNeighbors.via` | none | Edge field whose targets are shared intermediates (evidence, cites, dataset, design doc). Two nodes that point to the same intermediate are two-hop neighbors. Add it only where such questions occur. |
| `sharedNeighbors.label` | `"Shares <label> with"` | Label on cards. |
| `sharedNeighbors.hubThreshold` | automatic | Intermediates used by this many nodes or more are hubs and are skipped (the skip is stated in the marker). Left out, it is 25% of the nodes that use the `via` edge, rounded up, and at least 3; `INDEX.md` states the value used. An intermediate shared by a quarter or more of those nodes says little about how two of them are related, the way a very common word says little in search, and its users would push more specific neighbors out of the top `k`. The floor of 3 keeps a small knowledge base from treating every shared intermediate as a hub. Set a number only after looking at real cards: lower it if lists are crowded by neighbors that share only a common intermediate, raise it if meaningful neighbors are skipped. |
| `k` | `10` | Maximum neighbors listed per reverse or two-hop list. Shared neighbors are ranked by the number of shared intermediates, then by id. Forward edges are listed in full. |
| `card.fields` | `[]` | Short author-written fields to keep on the card, as names or `{ "field", "label" }`. |
| `card.headings` / `card.headingLevels` / `card.maxHeadings` | `true` / `[2]` / `20` | Section headings of the body listed on the card. |
| `card.maxFieldChars` | `400` | Each kept field is clipped to this many characters (the full text stays in the body). |
| `card.maxBytes` | `5120` | Card size target. Enforced before the vault is replaced. |
| `card.titlesInRelations` | `true` | Write `id (Title)` instead of `id` in relation lists. |
| `catalog.maxBytes` | `20480` | Attribute-table size target. The table grows linearly with the number of nodes, so this bounds the knowledge-base size one table can cover. |
| `catalog.edgeColumns` | all non-external edges | Edge fields shown as table columns. |
| `index.maxBytes` | `4096` | `INDEX.md` size target. |
| `bodies` | `true` | Write `bodies/<id>.md`. |
| `output` | `"cairn-vault"` | Output folder. Cairn refuses to replace a non-empty folder that it did not create. |
| `wayfinding.instructionFile` | none | The agent instruction file that carries the block, relative to the config. Never read as a note; paths in `WAYFINDING.md` are written relative to it; `check` verifies that it carries the current block. |
| `wayfinding.vaultPath` | computed | How the rules refer to the vault. By default every path in the block (vault and source) is relative to the instruction file: the `--write` target, else `wayfinding.instructionFile`, else the config folder. Set it only to force a different path; it is used verbatim. |
| `wayfinding.search` | file search over `cards/` | The topical-search instruction, for example ``"run `kb search \"<query>\"`"``. |
| `wayfinding.rules.topical` / `.attribute` / `.relation` / `.composition` | built in | Rule templates. Placeholders: `{vault}`, `{search}`, `{attributes}`, `{edges}`, `{expanded}`, `{omitted}` (the sentence about rows left out by `kindField`), `{source}`. |
| `wayfinding.general` | four general rules | Replaces the general rules. |
| `wayfinding.extraRules` | `[]` | Extra rule lines appended after the four types. |
| `wayfinding.markers` | `{ "start": "<!-- cairn:wayfinding:start -->", "end": "<!-- cairn:wayfinding:end -->" }` | Markers around the block in the instruction file. Change them when the file already uses its own markers; `guide --write` and `check` use the configured pair. |
| Layout placeholders in rules | — | Besides the placeholders above, rule templates and `wayfinding.search` may use `{card}` (`<vault>/<card path with <id>>`), `{cardsDir}`, `{body}`, and `{bodiesDir}`, which follow `layout`. The default rules use them, so they stay correct when `layout` moves cards or bodies. |
| `layout.cards` | `"cards/{stem}.md"` | Where each card goes inside the vault. A relative path that ends in `.md` and contains `{stem}` (the file-safe id; `{id}` is accepted as a synonym). Size targets and `check` find cards by this pattern. |
| `layout.bodies` | `"bodies/{stem}.md"` | Where each full body goes (for example `"text/{stem}-text.md"`). |
| `layout.wayfinding` | `"WAYFINDING.md"` | Path of the wayfinding file inside the vault, or `null` to leave it out (when the block lives only in the instruction file). |
| `sharedNeighbors.notes` | none | Write each `via` target as its own note, so the full list of nodes that share it is one file away. `include` lists globs (relative to `source.dir`) of the note files; those files are not nodes. Note files must also be selected by `source.include` and not removed by `source.exclude`; a warning says so when `include` matches nothing. With notes, the `via` edge points at notes: a target without a note is dropped with a warning. |
| `sharedNeighbors.notes.include` / `.idField` / `.titleField` / `.path` | `[]` / `"$filename"` / `"title"` / `"<via>/{stem}.md"` | Note files, how their id and title are read, and where each note goes. A note is the source file as written plus the list of nodes that use it. Note contents count toward the fingerprint. |
| `attributeNotes.attributes` | none | Fields (names or `{ "field", "label" }`) that get one note per value, listing the nodes with that value. Each card can link the notes it belongs to (template value `attributeNotes`). |
| `attributeNotes.path` | `"attributes/{attribute}-{value}.md"` | Where each attribute note goes. Characters that are unsafe in file names or `[[wikilinks]]` (`\ / : * ? " < > \| # ^ [ ]` and whitespace) become `-`. |
| `templates.card` / `.body` / `.catalog` / `.index` / `.note` / `.attributeNote` / `.wayfinding` | built in | Template files (relative to the config) that replace the built-in layout of that kind of file. Leave a key out to keep the built-in layout. Template contents count toward the fingerprint. See [Templates](#templates). |

Output is deterministic: stable natural sorting, no timestamps, `\n` line endings. The same inputs give byte-identical files on every machine.


## Templates

Templates change how generated files look without changing what Cairn computes: labels in another language, `[[wikilinks]]` for Obsidian, a different card order, extra front matter. The graph, the hub rule, the top-`k` cap, the size targets, and the fingerprint stay the same. Each key in `templates` replaces one kind of file:

| Key | Rendered for | Values the template sees |
|---|---|---|
| `card` | each node | the node view (below) |
| `body` | each node (when `bodies` is on) | the node view; `body` is the text after the front matter |
| `catalog` | `CATALOG.md` | `count`, `nodes` (node views), `attributes`, `edgeColumns` |
| `index` | `INDEX.md` | `count`, `counts.nodes` / `.bodies` / `.notes` / `.attributeNotes`, `source`, `attributeGroups[]` (`field`, `label`, `notes[]` with `value`, `path`, `target`), `edges[]` (`field`, `label`, `reverse`, `total`), `edgeTotal`, `hub`, `k` |
| `note` | each intermediate note | `note` (`id`, `title`, `name`, `raw`, `body`, `data`, `path`, `target`), `users` (node references), `via`, `label` |
| `attributeNote` | each attribute value | `field`, `label`, `value`, `path`, `target`, `count`, `members` (node views) |
| `wayfinding` | the block between the markers | the rule placeholders as values: `vault`, `card`, `cardsDir`, `body`, `bodiesDir`, `search`, `source`, `attributes`, `edges` |

A **node view** has `id`, `stem`, `title` (falls back to the id), `name` (the title field as written, or empty), `description`, `data` (all front matter), `body`, `headings`, `kind`, `path` / `target` (the card path with and without `.md`), `cardPath`, `cardTarget`, `bodyPath`, `bodyTarget`, and:

- `relations.<edge field>.items`: forward targets in author order (node references; intermediate notes when `sharedNeighbors.notes` is set).
- `relations.<edge field>.reverse`: `all` (every source, naturally sorted), `items` (the first `k`), `total`, `shown`, `truncated`.
- `shared`: `items` (references with `count`), `total` (all nodes that share any intermediate, hubs included), `shown`, `hubs` (skipped hub intermediates), `capped` (cut at `k`), `truncated` (`shown < total`), `threshold`, `k`. Write your own truncation marker from these; a list without a marker must be complete.
- `attributeNotes`: the attribute notes the node belongs to (`field`, `label`, `value`, `path`, `target`).

A node reference has `id`, `stem`, `title`, `name`, `description`, `path`, `target`, and the card and body paths.

The template language:

```
{{path}}                              value: a dotted path, "." for the current item, a "string", or @index / @number / @first / @last in a loop
{{path | filter:arg | filter}}        filters: json, oneLine, trim, trimEnd, upper, lower, list, compact, pluck:"field",
                                      join:", ", count, clip:n (n characters in total), truncate:n (n characters, then …),
                                      cell (Markdown table cell; cell:"／" replaces | with another character), default:"x"
{{#if path}} … {{else}} … {{/if}}     also {{#unless}}; falsy: missing, null, false, 0, "", []
{{#each path sep=" · "}} … {{else}} … {{/each}}
{{#with path}} … {{/with}}
{{#filter json}} … {{/filter}}        render the inside, then apply filters to the text
{{! comment }}
```

A line that holds only one block tag is removed together with its line break, so block tags can stand on their own lines. Inserted values are never parsed again. A tag ends at the first `}}`, so a quoted argument cannot contain `}}`. Syntax errors name the template file and line. For example, a card in Obsidian style:

```
# {{id}} {{name}}

- Depends on: {{#each relations.depends_on.items sep=" · "}}[[{{id}}]] {{name}}{{else}}none{{/each}}
- Shares evidence with: {{#if shared.total}}{{#each shared.items sep=" · "}}[[{{id}}]] ×{{count}}{{else}}none shown{{/each}}{{#if shared.truncated}} ({{shared.shown}} of {{shared.total}} shown){{/if}}{{else}}none{{/if}}
- Full text: [[{{bodyTarget}}]]
```

## Library use

`src/index.mjs` exports the functions the CLI is built on. `planNodes(config, { nodes, notes })` plans a vault from documents you have already read (`nodes`: `{ id?, rel?, data, body }`; `notes`: `{ id?, rel?, raw, data, body }`) and returns `{ files, counts, warnings, over, graph }` without writing anything, so a host system can keep its own reader, access checks, locking, and atomic replacement. Pass `{ requireSource: false }` to `resolveConfig(raw, baseDir, …)` when there is no `source` folder.

## Keeping the vault fresh

The fingerprint covers the node files (files with an id), the config, and the generator version. Rebuild whenever it changes, including after every config edit:

- **git hook** (only when the notes are in a git repository): copy [`hooks/post-merge.sample`](../hooks/post-merge.sample) to `.git/hooks/post-merge` (and `post-checkout`) of the repository that holds the notes, set `CAIRN_BIN` and `CAIRN_CONFIG` at its top, and make it executable. The hook changes to the repository root first, so relative paths are read from there; when the config or Cairn lives outside the repository (for example the config one level up), use `../cairn.config.json` or an absolute path. It runs `build --if-stale --quiet`, never blocks git, and prints one line when it skips (node, Cairn, or the config not found) or fails.
- **watch**: `node path/to/cairn/bin/cairn.mjs watch` while you edit. This also works when the notes are not in a git repository.
- **CI**: run `cairn check` to fail a pull request whose vault is stale (if you commit the vault).

The vault inherits the access rules of its sources. Whether it belongs in `.gitignore` is decided by the git repository that contains the vault folder (`git -C <folder that holds the vault> rev-parse --show-toplevel`); if it is in no repository, there is nothing to decide. Ignoring it is the safe default: it is generated, can be rebuilt at any time, and holds the same text as the notes. Commit it only when that repository already holds the notes with the same visibility and you want `check` in CI or readers without Node. Never let it into a repository that is more public than the notes, and keep it outside synced or published folders if the notes are private. A fingerprint sees only the copy it was computed from, so a lagging local copy goes stale without notice.
