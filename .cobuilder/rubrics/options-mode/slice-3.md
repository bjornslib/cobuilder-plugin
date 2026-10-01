# Rubric: Slice 3 — Manifests, glossary, and mode counts

Feature: options-mode
Epic: options-mode/E1
Slice goal: `DDD-VOCABULARY.md` has an `Inquiry` entry. `plugin.json` reads `0.7.0`. Both manifests and the docs name seven modes and list `/architect:options`. `uv run --with pytest pytest tests/ -q` passes with no new failure.
Test command: `uv run --with pytest pytest tests/ -q`

Sources: `04-slices.md` row 3, `epic-E1-design.md`, `03-program-design.md`.

## Criteria

### C1 — The glossary holds one Inquiry entry [CRITICAL]
**Must be true:** `DDD-VOCABULARY.md` has one entry with anchor `inquiry` under `## architect`, in the glossary's own format: an anchor line, the bold term with its context id, at most two sentences, and an `_Avoid_` line that names "finding" and "question". The entry says an inquiry is not a "finding" of `assessment.json` and not a "question" of the PR assessment.
**Evidence to check:**
- `grep -c '<a id="inquiry">' DDD-VOCABULARY.md` prints `1`.
- Read the entry. Count the sentences. Check the `_Avoid_` line.
- `uv run --with pytest pytest tests/test_ddd_vocabulary.py -q` passes.
**Scoring:**
- 1.0 — all hold.
- 0.5 — the entry exists but the `_Avoid_` line or the two non-collision statements are missing.
- 0.0 — no entry or the vocabulary test fails.

### C2 — The manifests carry the new version and description [CRITICAL]
**Must be true:** `plugins/architect/.claude-plugin/plugin.json` has `"version": "0.7.0"` and a description that names the options mode. `.claude-plugin/marketplace.json` has an architect description that matches and a version that `tests/test_plugin_manifests.py` accepts.
**Evidence to check:**
- `grep -n '"version"\|"description"' plugins/architect/.claude-plugin/plugin.json`.
- Read the architect entry in `.claude-plugin/marketplace.json`.
- `uv run --with pytest pytest tests/test_plugin_manifests.py -q` passes.
**Scoring:**
- 1.0 — all hold.
- 0.5 — the version is right but a description does not name the mode, or the marketplace version differs and the test still passes with a noted reason.
- 0.0 — the version is wrong or the manifest test fails.

### C3 — Every mode count and list is right [CRITICAL]
**Must be true:** No file counts the architect modes as six. Each mode list in `README.md`, `CLAUDE.md`, and `plugins/cobuilder-full-lifecycle/skills/cobuilder-full/SKILL.md` includes `/architect:options`. A "six" that counts something else stays. The viewer files `model.ts` and `sections.tsx` are checked, and a hit that counts architect modes is recorded as a follow-up and not edited.
**Evidence to check:**
- `grep -rniw "six" README.md CLAUDE.md plugins/cobuilder-full-lifecycle plugins/architect --include=*.md --include=*.json`. Read each hit and decide what it counts.
- `grep -n "architect:options\|options mode\|seven" README.md CLAUDE.md plugins/cobuilder-full-lifecycle/skills/cobuilder-full/SKILL.md`.
- Read the notes of the GREEN agent for the viewer files.
**Scoring:**
- 1.0 — no architect-mode "six" remains, every list names the mode, and the viewer files are reported.
- 0.5 — one list or one count is missed, or the viewer files are not reported.
- 0.0 — two or more are missed.

### C4 — The full suite passes with no new failure [CRITICAL]
**Must be true:** `uv run --with pytest pytest tests/ -q` exits 0. The count of tests is not lower than before the slice.
**Evidence to check:** Run the command. Compare the passed count with the count that the GREEN agent recorded before it started.
**Scoring:**
- 1.0 — exit 0 and no test removed.
- 0.5 — exit 0 but a test was removed or skipped to get it.
- 0.0 — a failure.

### C5 — Other modes are not changed
**Must be true:** The slice changes no instruction text of `design`, `review`, `maintenance`, `decisions`, `describe`, or `debug`, except a mode count or a mode list.
**Evidence to check:** `git diff -- plugins/architect/skills/architecture/SKILL.md plugins/architect/skills/architecture/references` and read each hunk outside the Options Mode text.
**Scoring:**
- 1.0 — every hunk outside the options text is a count or list change.
- 0.0 — any other instruction changed.

## Weights

C1 25%, C2 20%, C3 25%, C4 25%, C5 5%.
