# Rubric: Slice 2 — E1 real parsing: project Gate 3/4b docs

Feature: gate-doc-surfacing
Epic: E1
Slice goal: A repo with a `03-program-design.md` and an `epic-*-design.md` produces populated `program_design`/`epic_design` entities, and `joins.feature_gates[slug][3].doc` points at the projected id
Test command: python3 -m pytest tests/test_build_index_gate_docs.py -v

## Criteria

### C1 — program_design entity is correctly projected [CRITICAL]
**Must be true:** For a feature slug with a `03-program-design.md` file,
`entities.program_design` contains one record with `id == feature_slug`,
`feature_slug`, `gate == 3`, a non-empty `title` (from the file's first `#`
heading), and `body_md` containing the file's content.
**Evidence to check:**
- Run against this repo's own `docs/plans/gate-doc-surfacing/03-program-design.md`;
  confirm a `program_design` record with `id == "gate-doc-surfacing"` exists
  in the rebuilt `data/index.json` and its `title` reads "Program Design:
  Gate doc surfacing".
- Read `test_project_program_design_reads_title_and_body` and run it.
**Scoring:**
- 1.0 — record present with correct id/title/body for a real fixture and for this repo's own doc.
- 0.5 — record present but title or body_md is empty/wrong.
- 0.0 — no record produced.

### C2 — epic_design entity id is scoped `<feature_slug>/<epic_id>` [CRITICAL]
**Must be true:** For `docs/plans/gate-doc-surfacing/epic-E1-design.md`, the
projected `epic_design` record's `id` is exactly `"gate-doc-surfacing/E1"`
— matching `entities.epic`'s own scoping convention, per epic-E1-design.md's
resolved decision.
**Evidence to check:**
- Rebuild the index; find the `epic_design` record for this repo's own
  `epic-E1-design.md` and `epic-E2-design.md`; assert their ids are
  `gate-doc-surfacing/E1` and `gate-doc-surfacing/E2`.
- Read and run `test_project_epic_design_id_is_scoped_feature_slug_and_epic_id`.
**Scoring:**
- 1.0 — ids exactly match the scoped convention for both this repo's real epic design files.
- 0.5 — ids present but using the bare unscoped epic id instead (collision risk across features).
- 0.0 — no epic_design records produced at all.

### C3 — joins.feature_gates gains a doc reference on Gate 3
**Must be true:** `joins.feature_gates["gate-doc-surfacing"]`'s entry for
gate `n == 3` carries a `doc` field equal to the `program_design` entity's
id.
**Evidence to check:**
- Inspect the rebuilt index's `joins.feature_gates["gate-doc-surfacing"]`
  list; find the entry with `n: 3`; confirm it has `doc: "gate-doc-surfacing"`.
- Run `test_resolve_feature_gates_attaches_doc_when_program_design_exists`.
**Scoring:**
- 1.0 — `doc` field present and correct on the Gate 3 entry only (not on other gates).
- 0.5 — `doc` present but on the wrong gate entry, or present on every gate regardless of doc existence.
- 0.0 — no `doc` field added anywhere.

## Regression check
- `python3 -m pytest tests/ -q` — all prior-passing tests still pass.
- Slice 1's empty-list behavior for a feature slug with no gate docs still holds.

## Out of scope — do not penalise
- The `entities.epic[].design_doc` join (belongs conceptually to E1 but is
  covered by slice 2's C2/C3 scope only for feature_gates — if the epic-side
  join is deferred to a later slice by the implementer, note it, don't fail C3 for it).
- Missing-file/malformed-filename handling (slice 3).
- Any viewer change (epic E2).
