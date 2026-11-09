# Install prompt

[한국어](INSTALL_PROMPT.ko.md) · English

Paste everything below the line into a coding agent (Claude Code, Codex, or similar) opened in the folder where you work with your knowledge base. The agent asks for what it needs, inspects your real files, and sets Cairn up. It does not change your notes; the only existing file it edits is the agent instruction file that receives the wayfinding block.

---

You are setting up **Cairn** (https://github.com/Woka-inc/cairn) for my knowledge base. Cairn is a deterministic generator, Node.js 22 with no dependencies, that reads linked Markdown notes and writes a vault of compact cards, a one-row-per-node attribute table (`CATALOG.md`), body files, and a wayfinding block that tells an agent where to look first for each question type. Follow the steps in order.

**Ground rules**

- Never invent field names, folders, or edge types. Every field in the config must be one you have seen in real files. When a field's role is unclear, ask me.
- Do not modify, move, or reformat any note in the knowledge base. The one exception is the agent instruction file chosen in step 1 (`CLAUDE.md`, `AGENTS.md`, or a skill file): `cairn guide --write` changes it, and only between the Cairn markers. New files (the config and the vault) are fine.
- Do not commit, push, or publish anything unless I ask. Do not send my notes anywhere. The only network access you need is `git clone` in step 2.
- Ask only what you cannot find out yourself, and ask it in one message.
- Every config change, whatever the key, changes the vault. After any edit to the config, run `build` again before `guide` and `check`.

**Step 1. Ask me**

- The path to the knowledge-base folder (required).
- Which agent instruction file should carry the wayfinding block: `CLAUDE.md`, `AGENTS.md`, or a skill file. Suggest the one you find in my project, and ask only if there is none or several.
- Whether my knowledge base already has a search command or server (for example `kb search "<query>"`). If not, the rules will use file search over the cards.
- Anything else you truly need after looking at my files, such as which folders hold nodes when that is ambiguous.

**Step 2. Get Cairn**

- If a local copy already exists (a folder with `bin/cairn.mjs` and a `package.json` whose name is `cairn-kb`), use it.
- Otherwise run `git clone https://github.com/Woka-inc/cairn <folder>`. Propose a folder outside the knowledge base (for example `tools/cairn` in my project, or next to it) and use it unless I object.
- Check `node --version`. It must be 22 or later. If it is not, stop and tell me.
- Below, `<cairn>` means `node <folder>/bin/cairn.mjs`, and `<config>` means the path of `cairn.config.json`.

**Step 3. Inspect the knowledge base and write `cairn.config.json`**

1. Decide where the config goes. All paths in it are relative to its folder; `source.dir` is the folder that holds the notes, and `output` (default `cairn-vault`) is the vault folder.
   - Usual case: the notes are a subfolder of the project (for example `notes/`). Put the config at the project root with `source.dir` `"notes"`; the vault goes next to the notes.
   - The notes are the whole repository (they sit at its root): either put the config one level up, next to the repository, so that `source.dir` is the repository folder and the vault sits outside it; or keep the config at the root with `source.dir` `"."`, so that the vault is a subfolder of the notes. Cairn leaves its own output out of the inputs, but the vault then shows up in the repository and in tools that read the notes (Obsidian, for example), so tell me and handle it in item 5.
   - `output` must not be the notes folder itself or a folder that contains it; the build replaces the whole output folder, and the error message says so.
2. Get a draft with `<cairn> init <kb-folder> --config <config>`. For `init`, `--config` names the config file the draft is for: `source.dir` is written relative to that file's folder. It prints JSON and a report and writes nothing; add `--write` to save the draft at `<config>`.
3. Treat the draft as a hint only. Open at least five real notes of each kind (and more if kinds differ) and confirm, from what you read:
   - **Node files**: which folders and globs hold one node per file; what to exclude (templates, indexes, drafts). Use `source.include` and `source.exclude`. The draft already excludes agent instruction files, READMEs, and files without the id field. Files without an id are never nodes and do not affect the fingerprint, but excluding them silences the build warning.
   - **Instruction file**: set `wayfinding.instructionFile` to the file from step 1, relative to the config. Cairn then never reads it as a note (even when it sits inside the notes folder), writes the paths in the block relative to it, and `check` verifies that it carries the current block.
   - **id**: a front-matter field that is unique per node, or `"$filename"` if notes are identified by file name.
   - **title** and an optional one-line **description** field.
   - **kinds**: if notes come in kinds marked by a field such as `kind` or `type`, the draft sets `kindField`. Cards then leave out relation rows that no node of that kind has (a design document gets no "Depends on" row when no design document has that field), while a used but empty relation still reads "none". The report also lists fields that are complete within one kind (for example `status` on every design document but on no module); judge those as if they were present everywhere.
   - **attributes**: categorical fields people filter on (status, level, owner, language, type, year, and so on). Leave out free text, dates of edits, and internal bookkeeping.
   - **typed edges**: fields whose values point to other nodes, such as `depends_on`, `prerequisite`, `related`, `evidence`, `cites`, `parent`, `supersedes`. Check that the values really resolve to node ids (wikilinks `[[id]]`, file paths, or plain ids are fine). For each edge, set `reverse` to a label (for example "Used by", "Cited by", "Superseded by") only if people would ask the reverse question ("what depends on X?"). If targets are not nodes (dataset names, for example), set `"external": true`.
   - **sharedNeighbors**: only if questions like "what else cites the same source / uses the same dataset / follows the same design doc?" make sense. `via` is that edge field. Leave `hubThreshold` out: it is then automatic, 25% of the nodes that use the `via` edge and at least 3, and `INDEX.md` shows the value used. Set a number only after looking at real cards: lower it if lists are crowded by neighbors that share only a very common intermediate, raise it if meaningful neighbors are skipped. Keep `k` at 10 unless cards get too large.
   - **card.fields**: short author-written fields that help choose a node (goal, purpose, abstract, decision). Not long bodies.
4. If any choice is ambiguous (a field could be an attribute or an edge, two candidate id fields, unclear folders), ask me before writing.
5. Write `<config>`. Keep the defaults for size targets (`card.maxBytes` 5120, `catalog.maxBytes` 20480) unless you have a reason; with many nodes (several hundred or more), tell me the table may exceed its target. Then decide about `.gitignore`:
   - Find the git repository that contains the vault folder: `git -C <folder that holds the vault> rev-parse --show-toplevel`. If there is none, skip this item.
   - Otherwise that repository's root `.gitignore` decides. Recommend ignoring the vault: it is generated, can be rebuilt at any time, and holds the same text as the notes. Committing it makes sense only when that repository already holds the notes with the same visibility and I want `check` in CI or readers without Node. Never let the vault into a repository that is more public than the notes.
   - Ask me before you edit `.gitignore`.

**Step 4. Build**

- Run `<cairn> build --config <config>`. On success it prints the counts and the actual sizes: the largest card, `CATALOG.md`, and `INDEX.md`, each against its target.
- If it fails on a size target, it lists each file over its target with the bytes over. Show me that list. Reduce `card.fields`, `card.maxFieldChars`, `card.maxHeadings`, or `k` first; raise a target only with my agreement. Rebuild.
- Show me the warnings (skipped files without an id, edges to unknown ids) and fix the config if a warning shows a wrong choice.

**Step 5. Insert the wayfinding block**

- If I have a search command, set `wayfinding.search` in the config to a sentence that tells the agent how to run it (for example ``"run `kb search \"<query>\"`"``).
- If you changed the config in any way since the last build, run `<cairn> build --config <config>` now. `guide` warns when the vault is stale.
- Run `<cairn> guide --config <config> --write <instruction file>`. It inserts or replaces the block between `<!-- cairn:wayfinding:start -->` and `<!-- cairn:wayfinding:end -->` and leaves the rest of the file alone. Every path in the block is relative to the instruction file, so it works wherever that file sits; `wayfinding.vaultPath` is needed only to force a different vault path. It refuses to write into a note. Show me the block.

**Step 6. Verify**

- Run `<cairn> check --config <config>`. It must pass. It also confirms that the instruction file carries the current block. If it reports the vault as stale, rebuild and run `check` again; if it reports an outdated block, run `guide --write` again.
- Open two cards and the first rows of `CATALOG.md`. Pick one node that other nodes point to and confirm that its card lists them under the reverse label. Show me short excerpts and the size line from `check`.

**Step 7. Offer rebuild on change**

Ask me which one I want, and do only that:

- (a) a git hook, only if the notes are in a git repository: copy `<folder>/hooks/post-merge.sample` to `.git/hooks/post-merge` and `.git/hooks/post-checkout` of the repository that holds the notes, set `CAIRN_BIN` and `CAIRN_CONFIG` at its top, and make both executable. The hook changes to the repository root first, so relative paths are read from there; when the config or Cairn lives outside that repository (for example the config one level up), use `../cairn.config.json` or an absolute path. The hook never blocks git, and prints one line when it skips (node, Cairn, or the config not found) or fails.
- (b) `<cairn> watch --config <config>` while editing;
- (c) nothing automatic: I will run `build` myself, and `check` can run in CI.

If the notes are not in a git repository, offer only (b) and (c).

**Step 8. Report**

Tell me, briefly: where Cairn is, the config path and a summary of its choices (node files and exclusions, id, kind field, attributes, edges with reverse labels, shared neighbors and the hub threshold used, size targets), the build counts and actual sizes, the instruction file you changed, the `check` result, what you decided about `.gitignore`, the rebuild option chosen, and anything still undecided.
