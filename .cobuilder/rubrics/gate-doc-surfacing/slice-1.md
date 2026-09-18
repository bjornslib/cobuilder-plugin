# Rubric: Slice 1 — E1 tracer bullet: constants and empty entity lists

Feature: gate-doc-surfacing
Epic: E1
Slice goal: `data/index.json` carries `program_design` and `epic_design` keys (empty lists when no gate docs exist yet)
Test command: python3 -m pytest tests/test_build_index_gate_docs.py -v

## Criteria

### C1 — index.json always carries both new entity keys [CRITICAL]
**Must be true:** Running `shared/build_index.py` against any repo, including
one with no `docs/plans/` directory at all, produces `data/index.json` with
top-level `entities.program_design` and `entities.epic_design` keys present
as lists (possibly empty), never missing or `null`.
**Evidence to check:**
- Run `uv run shared/build_index.py` against this repo; `python3 -c "import json; d=json.load(open('.cobuilder-architect/self/data/index.json')); assert 'program_design' in d['entities'] and 'epic_design' in d['entities']"`.
- Run the test suite; find a test asserting the empty-repo case.
**Scoring:**
- 1.0 — both keys present as lists in every case, with a passing test for the no-`docs/plans/` case.
- 0.5 — keys present when gate docs exist, but missing or erroring when none do.
- 0.0 — keys absent, or build_index.py crashes.

### C2 — no regression to existing entity counts
**Must be true:** All previously-existing entity types (`adr`, `design`,
`epic`, `context`, `district`, `boundary_rule`, `pull_request`, `slice`,
`publication`) keep their pre-slice counts unchanged by this slice alone.
**Evidence to check:**
- Compare `entities.<type>.length` before and after this slice for each
  existing type; only `slice` may legitimately differ, and only because of
  this feature's own plan docs already on disk, not because of this slice's
  code.
**Scoring:**
- 1.0 — no unexplained count changes.
- 0.0 — an existing entity type's count changed with no explanation traceable to pre-existing plan/design files.

## Regression check
- All tests that passed before this slice must still pass:
  `python3 -m pytest tests/ -q`.
- Files outside `shared/build_index.py` and the new test file must remain unchanged.

## Out of scope — do not penalise
- Actually reading or parsing gate doc content (slice 2).
- Attaching `doc`/`design_doc` join references (slice 2).
- Any viewer change (epic E2).
