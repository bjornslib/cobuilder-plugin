# Rubric: Slice 8 — the index holds the entities

Feature: cobuilder-family
Epic: plugin-split/E4
Slice goal: The index builder emits every entity, and the two scripts it replaces are gone.
Test command: `uv run --with pytest pytest tests/ -v`

## Criteria

### C1 — Every entity type appears with a stable id [CRITICAL]
**Must be true:** Decisions, designs, epics, contexts, districts, boundary rules, pull requests, slices, and publications all appear, each with the id the program design specifies.
**Evidence to check:** Build the index against this repo. Count each type against the source directories.
**Scoring:** 1.0 — every type present and every count matches. 0.5 — one type missing or one count off. 0.0 — several missing.

### C2 — An epic id is scoped to its design [CRITICAL]
**Must be true:** Two designs that both name an epic `E1` produce two distinct ids.
**Evidence to check:** The test with two such designs.
**Scoring:** 1.0 — distinct. 0.0 — collide. No half credit; a collision silently merges records.

### C3 — The build is a full rebuild
**Must be true:** Deleting a source document and rebuilding removes it from the index.
**Evidence to check:** The matching test.
**Scoring:** 1.0 — removed. 0.5 — removed only after deleting the index first. 0.0 — it lingers.

### C4 — The two replaced scripts are gone, not left beside it
**Must be true:** The decision and design projection scripts are deleted, and nothing calls them.
**Evidence to check:** The files are absent. Grep for callers.
**Scoring:** 1.0 — deleted, no callers. 0.5 — deleted, a stale caller remains. 0.0 — still present.

### C5 — The viewer reads the index and still renders
**Must be true:** The existing viewer modes work from the new projection.
**Evidence to check:** Serve a bundle and open the existing modes.
**Scoring:** 1.0 — unchanged behaviour. 0.5 — one mode degraded. 0.0 — the viewer breaks.

### C6 — Nothing is written into the authored tree
**Must be true:** The builder reads the authored documents and writes only into the bundle.
**Evidence to check:** The test that builds and then checks the authored tree is untouched.
**Scoring:** 1.0 — untouched. 0.0 — anything written.

## Regression check
- Every existing viewer mode behaves as it did.
- Every bundle still verifies.

## Out of scope — do not penalise
- The joins, the freshness block, and the three new modes. Those are slices 9 and 10.
