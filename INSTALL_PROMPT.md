# Install prompt

[한국어](INSTALL_PROMPT.ko.md) · English

Paste everything below the line into a coding agent (Claude Code, Codex, or similar) opened in the folder where you work with your knowledge base. The agent asks for what it needs, inspects your real files, and sets Cairn up. It does not change your notes.

---

You are setting up **Cairn** (https://github.com/Woka-inc/cairn) for my knowledge base. Cairn is a deterministic generator, Node.js 22 with no dependencies, that reads linked Markdown notes and writes a vault of compact cards, a one-row-per-node attribute table (`CATALOG.md`), body files, and a wayfinding block that tells an agent where to look first for each question type. Follow the steps in order.

**Ground rules**

- Never invent field names, folders, or edge types. Every field in the config must be one you have seen in real files. When a field's role is unclear, ask me.
- Do not modify, move, or reformat any note in the knowledge base.
- Do not commit, push, or publish anything unless I ask. Do not send my notes anywhere. The only network access you need is `git clone` in step 2.
- Ask only what you cannot find out yourself, and ask it in one message.

**Step 1. Ask me**

- The path to the knowledge-base folder (required).
- Which agent instruction file should carry the wayfinding block: `CLAUDE.md`, `AGENTS.md`, or a skill file. Suggest the one you find in my project, and ask only if there is none or several.
- Whether my knowledge base already has a search command or server (for example `kb search "<query>"`). If not, the rules will use file search over the cards.
- Anything else you truly need after looking at my files, such as which folders hold nodes when that is ambiguous.

**Step 2. Get Cairn**

- If a local copy already exists (a folder with `bin/cairn.mjs` and a `package.json` whose name is `cairn-kb`), use it.
- Otherwise run `git clone https://github.com/Woka-inc/cairn <folder>`. Propose a folder outside the knowledge base (for example `tools/cairn` in my project, or next to it) and use it unless I object.
- Check `node --version`. It must be 22 or later. If it is not, stop and tell me.
- Below, `<cairn>` means `node <folder>/bin/cairn.mjs`.

**Step 3. Inspect the knowledge base and write `cairn.config.json`**

1. Put the config where the vault should be built from, usually the knowledge-base repository root. Get a draft with `<cairn> init <kb-folder> --config cairn.config.json` (it prints JSON and a report; it does not write unless you pass `--write`).
2. Treat the draft as a hint only. Open at least five real notes of each kind (and more if kinds differ) and confirm, from what you read:
   - **Node files**: which folders and globs hold one node per file; what to exclude (READMEs, templates, indexes, drafts). Use `source.include` and `source.exclude`.
   - **id**: a front-matter field that is unique per node, or `"$filename"` if notes are identified by file name.
   - **title** and an optional one-line **description** field.
   - **attributes**: categorical fields people filter on (status, level, owner, language, type, year, and so on). Leave out free text, dates of edits, and internal bookkeeping.
   - **typed edges**: fields whose values point to other nodes, such as `depends_on`, `prerequisite`, `related`, `evidence`, `cites`, `parent`, `supersedes`. Check that the values really resolve to node ids (wikilinks `[[id]]`, file paths, or plain ids are fine). For each edge, set `reverse` to a label (for example "Used by", "Cited by", "Superseded by") only if people would ask the reverse question ("what depends on X?"). If targets are not nodes (dataset names, for example), set `"external": true`.
   - **sharedNeighbors**: only if questions like "what else cites the same source / uses the same dataset / follows the same design doc?" make sense. `via` is that edge field. Set `hubThreshold` so that intermediates used by a large share of nodes are skipped (start near 10–15% of the node count, at least 3), and keep `k` at 10 unless cards get too large.
   - **card.fields**: short author-written fields that help choose a node (goal, purpose, abstract). Not long bodies.
3. If any choice is ambiguous (a field could be an attribute or an edge, two candidate id fields, unclear folders), ask me before writing.
4. Write `cairn.config.json`. Keep the defaults for size targets (`card.maxBytes` 5120, `catalog.maxBytes` 20480) unless you have a reason; with many nodes (several hundred or more), tell me the table may exceed its target.
5. Make sure `output` (default `cairn-vault`) is outside the knowledge-base folder. If the notes are private, propose adding the output folder to `.gitignore` and ask me.

**Step 4. Build**

- Run `<cairn> build --config cairn.config.json`.
- If it fails on a size target, show me which files and by how much. Reduce `card.fields`, `card.maxFieldChars`, `card.maxHeadings`, or `k` first; raise a target only with my agreement. Rebuild.
- Show me the warnings (skipped files without an id, edges to unknown ids) and fix the config if a warning shows a wrong choice.

**Step 5. Insert the wayfinding block**

- If I have a search command, set `wayfinding.search` in the config to a sentence that tells the agent how to run it (for example ``"run `kb search \"<query>\"`"``), and rebuild.
- If the instruction file is not in the config's folder, set `wayfinding.vaultPath` to the vault path as seen from the instruction file.
- Run `<cairn> guide --config cairn.config.json --write <instruction file>`. It inserts or replaces the block between `<!-- cairn:wayfinding:start -->` and `<!-- cairn:wayfinding:end -->` and leaves the rest of the file alone. Show me the block.

**Step 6. Verify**

- Run `<cairn> check --config cairn.config.json`. It must pass.
- Open two cards and the first rows of `CATALOG.md`. Pick one node that other nodes point to and confirm that its card lists them under the reverse label. Show me short excerpts.

**Step 7. Offer rebuild on change**

Ask me which one I want, and do only that:

- (a) a git hook: copy `<folder>/hooks/post-merge.sample` to `.git/hooks/post-merge` and `.git/hooks/post-checkout`, set `CAIRN_BIN` and `CAIRN_CONFIG` at its top, and make both executable;
- (b) `<cairn> watch --config cairn.config.json` while editing;
- (c) nothing automatic: I will run `build` myself, and `check` can run in CI.

**Step 8. Report**

Tell me, briefly: where Cairn is, the config path and a summary of its choices (node files, id, attributes, edges with reverse labels, shared neighbors, size targets), the build counts, the instruction file you changed, the `check` result, the rebuild option chosen, and anything still undecided.
