# Rubric: Slice 10 — The import reader, the folder groups, and the boundary edge

Feature: structure-coaching
Epic: E1
Slice goal: see row 10 of docs/plans/structure-coaching/04-slices.md
Test command: uv run pytest tests -q

## Criteria

### C1 — The import groups of a crowded folder [CRITICAL]
**Must be true:** A crowded-folder finding holds `components`: each set of two or more siblings that import each other, and `nearest_group`: the family or group that the written file joins, or null.
**Evidence to check:**
- Run the script on a synthetic crowded folder where three Python files import each other and the new file imports one of them.
**Scoring:**
- 1.0 — the group of three or four and the right nearest group
- 0.5 — the group present, nearest group wrong
- 0.0 — no groups

### C2 — Each resolver works [CRITICAL]
**Must be true:** A Python relative import, a TypeScript relative import, a TypeScript `@/` alias from `tsconfig.json`, and a path string each resolve to a repo file. An import of an external package gives no reference.
**Evidence to check:**
- Run the unit tests for `references`, or call it on synthetic files.
**Scoring:**
- 1.0 — all five hold
- 0.5 — three or four hold
- 0.0 — two or fewer

### C3 — The boundary edge [CRITICAL]
**Must be true:** With synthetic boundary records, a new file in context A that names a path of context B, where B is not in the allowed dependencies of A, gives a `boundary-edge` finding with `line`, `text`, `from_context`, `to_context`, `kind` `outside-allowed`, `rule`, and `in_comment`. A path that matches a path-glob forbidden target gives `kind` `forbidden-glob`.
**Evidence to check:**
- Run the script on a synthetic repo with two or three `boundary.yaml` records.
**Scoring:**
- 1.0 — both kinds with all facts
- 0.5 — one kind, or a fact missing
- 0.0 — no finding

### C4 — No false edge [CRITICAL]
**Must be true:** A reference to an allowed context, a `plugins/cache/` string, and an edit to an old file each give no boundary finding.
**Evidence to check:**
- Run the script on the three cases.
**Scoring:**
- 1.0 — none of the three
- 0.5 — one false finding
- 0.0 — more

### C5 — Not analysed
**Must be true:** A file with no context, a record that the reader cannot read, a parse error, and a folder over `sibling_parse_max` each give a `not_analysed` line that names the reason.
**Evidence to check:**
- Run the script on each case.
**Scoring:**
- 1.0 — all four
- 0.5 — two or three
- 0.0 — fewer

### C6 — The coach stays stdlib
**Must be true:** `shared/structure_boundary.py` imports only the standard library, and the coach tests that forbid `uv` still pass.
**Evidence to check:**
- Read the imports of the file.
- Run `uv run pytest tests/test_habit_coach.py -q`.
**Scoring:**
- 1.0 — both hold
- 0.5 — —
- 0.0 — a third-party import

## Regression check
- All tests that passed before this slice must still pass.
- Files outside the slice scope in the epic design must remain unchanged.

## Out of scope — do not penalise
- The coach wording for the boundary edge (slice 3)
- The boundary edge on the slice diff (slice 8)
- The dependency diagram (E7)
