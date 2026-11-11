# Rubric: Slice 9 — The replay evaluation

Feature: structure-coaching
Epic: E5
Slice goal: see row 9 of docs/plans/structure-coaching/04-slices.md
Test command: uv run pytest tests -q

## Criteria

### C1 — The record holds the measures [CRITICAL]
**Must be true:** docs/plans/structure-coaching/evaluation.md holds, for each condition, three runs or more of five slices, the follow-on success rate, the growth of the largest folder, and the precision of each signal from a hand label.
**Evidence to check:**
- Read evaluation.md and count the runs and slices.
**Scoring:**
- 1.0 — all measures, enough runs
- 0.5 — a measure missing
- 0.0 — no record

### C2 — A decision follows the abort rule [CRITICAL]
**Must be true:** evaluation.md states the result against the abort rule of goal.json, and the decision on scored criteria.
**Evidence to check:**
- Compare the stated result with goal.json abort_if.
**Scoring:**
- 1.0 — decision consistent with the rule
- 0.5 — decision without the rule
- 0.0 — no decision

## Regression check
- All tests that passed before this slice must still pass.
- Files outside the slice scope in the epic design must remain unchanged.

## Out of scope — do not penalise
- E6 and E7 work
