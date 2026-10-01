# Rubric: Slice 2 — build_index compiles the named slot and the contracts file

Feature: nexus-borrowings
Epic: nexus-borrowings/E1
Slice goal: `compile_design_diagrams` reads `runtime-architecture.svg` → `record["diagrams"]["runtime"]` and `attach_authored_file` stamps `contracts`; a fixture design without either file omits both keys with no error. `tests/test_build_index.py` passes.
Test command: `uv run --with pytest pytest tests/test_build_index.py -q`

Sources: `04-slices.md` row 2, `epic-E1-design.md`, `epic-E3-design.md`, ADR-0036.

## Criteria

### C1 — The named key compiles from the SVG file [CRITICAL]
**Must be true:** A design fixture whose `diagrams/` holds a non-empty `runtime-architecture.svg` compiles with `record["diagrams"]["runtime"]` set to the file's text; numeric keys `1..3` still compile the same way. A design without the file omits the key — no error, no placeholder.
**Evidence to check:** `tests/test_build_index.py::test_design_runtime_diagram_compiles` (or equivalent) asserts both directions with real fixtures.
**Scoring:** 1.0 both directions asserted; 0.5 key appears but absence is not asserted; 0.0 wrong or missing.

### C2 — contracts rides the generalized authored-file stamp [CRITICAL]
**Must be true:** `attach_authored_file` (or an equivalent helper) stamps `record["contracts"]` from `contracts.md` exactly like the existing `pr_draft` block; the `pr_draft` behavior is unchanged after the refactor.
**Evidence to check:** The test asserting contracts projection; a second assertion (or existing test) that `pr_draft` still compiles.
**Scoring:** 1.0 both; 0.5 contracts works but the pr_draft refactor regressed or is untested; 0.0 otherwise.

### C3 — No readiness or level semantics shift [CRITICAL]
**Must be true:** The readiness check and the numeric-key consumers behave exactly as before: the new keys never enter their level lists, absent files raise nothing.
**Evidence to check:** Existing readiness/levels assertions in `tests/test_build_index.py` stay green; `uv run --with pytest pytest tests/ -q` reports no new failure.
**Scoring:** 1.0 green suite; 0.0 any regression.