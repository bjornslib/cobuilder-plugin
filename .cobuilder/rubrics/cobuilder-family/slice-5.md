# Rubric: Slice 5 — the 33 cross-pillar references are fixed

Feature: cobuilder-family
Epic: plugin-split/E1
Slice goal: The grep regression test passes on a repo that is still one plugin.
Test command: `uv run --with pytest pytest tests/ -v`

## Criteria

### C1 — No reference crosses a pillar [CRITICAL]
**Must be true:** No file under one pillar's skill directory resolves a path into another pillar's skill directory.
**Evidence to check:** The regression test that scans for cross-pillar paths, run against the whole repo.
**Scoring:** 1.0 — zero found and the test guards it. 0.5 — zero found, no test. 0.0 — any remain.

### C2 — The test tells a vendored reference apart from a cross-pillar one [CRITICAL]
**Must be true:** A reference to a vendored shared skill passes. A reference to the other pillar fails. `02-architecture.md` records five of the first kind.
**Evidence to check:** Feed the test one of each and check the verdicts.
**Scoring:** 1.0 — both verdicts correct. 0.5 — it flags the safe five as well, which makes it noise. 0.0 — it passes a real cross-pillar reference.

### C3 — A runtime reference is replaced, not deleted
**Must be true:** The two references that resolve at runtime still reach their content after the fix, by vendoring, by inlining, or by a documented drop.
**Evidence to check:** Read both call sites and follow what they now point at.
**Scoring:** 1.0 — both reach real content. 0.5 — one is dropped with no note. 0.0 — a procedure now cites nothing.

### C4 — A prose citation that only goes stale is fixed too
**Must be true:** The prose references are corrected, not left because they do not break at runtime.
**Evidence to check:** Count what the scan reports before and after.
**Scoring:** 1.0 — all fixed. 0.5 — the runtime ones only. 0.0 — the count is unchanged.

## Regression check
- The repo is still one plugin and every command still works.
- No procedure loses a step to make a reference disappear.

## Out of scope — do not penalise
- The directory split. This slice fixes references while everything still lives together.
