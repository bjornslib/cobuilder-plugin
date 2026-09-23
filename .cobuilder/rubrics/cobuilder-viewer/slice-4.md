# Rubric: Slice 4 — one typed model reads the bundle

Feature: cobuilder-viewer
Epic: cobuilder-viewer/E3
Slice goal: A level renders from `index.json` with no join derived in a component, and a field renamed on `PullRequest` and not on `OpenPullRequest` fails the type check
Test command: `uv run --with pytest pytest tests/ -v`

The evidence is the rendered level, the type check's own failure, and a grep of the source.

## Criteria

### C1 — One module resolves every join [CRITICAL]
**Must be true:** The shell reads the joins the record index carries. No component derives a join of its own, so one fact has one source.
**Evidence to check:**
- Search the viewer source for the join names the index carries, outside the data module. The search returns no derivation.
- Read the data module. It exposes the entities and the joins the shell consumes.
**Scoring:**
- 1.0 — the joins resolve in one module, and no other file derives one.
- 0.5 — one component derives a join for a convenience the module does not expose.
- 0.0 — two or more files derive joins, so the bundle and the shell can disagree.

### C2 — The drift guard fires on a rename [CRITICAL]
**Must be true:** `OpenPullRequest` extends `PullRequest` and is declared once. A field renamed on one type and not the other fails the type check, so the drift cannot reach a release.
**Evidence to check:**
- Read the data module. The source declares `OpenPullRequest` once, and it extends `PullRequest`.
- Rename one field on `PullRequest` alone, then run `npm run typecheck` in `plugins/artifact/viewer/`. It fails, and the failure names the field.
- Restore the name. The check passes.
**Scoring:**
- 1.0 — one declaration, it extends `PullRequest`, and a lone rename fails the check with the field named.
- 0.5 — the check fails on a lone rename and the failure names no field.
- 0.0 — the source declares the two types apart, and a lone rename compiles clean.

### C3 — A level renders from the typed model
**Must be true:** The shell's content comes from the typed model rather than from a global read at the point of use. A level a reader opens renders the bundle's own records.
**Evidence to check:**
- With the ChromeDevTools MCP tools, open one design's level. Its panels show the records that design carries in `data/designs.js`.
- Read the console messages. None reports a missing global or an undefined field.
**Scoring:**
- 1.0 — the level renders its design's records, and the console is clean.
- 0.5 — it renders and one console error appears.
- 0.0 — a panel renders empty where the design carries a record.

### C4 — The model reads every global the bundle defines
**Must be true:** The six script-tag globals the bundle defines are read in one place. A reader finds no second reader of a global.
**Evidence to check:**
- Read the data module for the six global names: `STORY`, `ODYSSEY`, `DIFFS`, `ADRS`, `DESIGNS`, and `DIAGRAMS`.
- Search the rest of the source for those names. The search returns no direct read outside the module.
**Scoring:**
- 1.0 — one module reads the globals, and nothing else reads one.
- 0.5 — one file reads a global the module already exposes.
- 0.0 — several files read the globals directly.

## Regression check
- All tests that passed before this slice must still pass, including `tests/test_viewer_modes.py`.
- Files outside the slice scope must remain unchanged: `shared/build_index.py`, `plugins/pr/`, and the bundle's own data files.
- The record index still parses: this slice leaves `data/index.json` unchanged.

## Out of scope — do not penalise
- Any surface change. This slice moves where data is read and renders nothing new.
- The multi-pull-request mode that consumes `OpenPullRequest`. It defers with E11.
- A schema change to the index or a new join.
