# Rubric: Slice 3 — E1 edge cases

Feature: gate-doc-surfacing
Epic: E1
Slice goal: A plan directory with no gate docs, and a repo with no `docs/plans/` at all, both still produce a clean index build with empty (not missing) entity keys
Test command: python3 -m pytest tests/test_build_index_gate_docs.py -v

## Criteria

### C1 — no docs/plans/ directory at all does not crash the build [CRITICAL]
**Must be true:** `discover_plan_gate_docs()` and the full `build_index.py`
run cleanly against a repo tree with no `docs/plans/` directory, returning
an empty list / empty entity arrays rather than raising.
**Evidence to check:**
- Run `test_discover_plan_gate_docs_no_plans_dir_returns_empty_list`.
- Confirm the function doesn't call `Path.iterdir()` on a non-existent path
  without a existence check first (read the function).
**Scoring:**
- 1.0 — clean empty result, test passes.
- 0.0 — raises `FileNotFoundError` or similar.

### C2 — a plan directory with only some gate docs is handled
**Must be true:** A `docs/plans/<slug>/` directory with a `04-slices.md`
but no `03-program-design.md` produces no `program_design` record for that
slug, without affecting other slugs' entities.
**Evidence to check:** run the test for this case (any existing plan
directory in this repo missing a Gate 3 doc, if one exists, or a fixture).
**Scoring:**
- 1.0 — no spurious record, no crash, other slugs unaffected.
- 0.5 — no crash, but an incorrect empty-body record is created instead of no record.
- 0.0 — crash, or other slugs' entities corrupted.

### C3 — a malformed epic design filename is skipped, not fatal [CRITICAL]
**Must be true:** A file matching `epic-design.md` (no id segment) or
`epic-*-design.md` with an unparseable id is skipped by
`discover_plan_gate_docs()` without raising and without stopping discovery
of other, well-formed files in the same or other plan directories.
**Evidence to check:** `test_discover_plan_gate_docs_skips_malformed_epic_filename`.
**Scoring:**
- 1.0 — skipped cleanly, other files still discovered, test passes.
- 0.0 — crashes the whole index build, or silently drops well-formed sibling files too.

## Regression check
- `python3 -m pytest tests/ -q` — full suite still green.
- Slices 1 and 2's criteria still hold against this repo's own real gate docs.

## Out of scope — do not penalise
- Any viewer change (epic E2).
- Recovering or repairing a malformed filename — skipping is sufficient.
