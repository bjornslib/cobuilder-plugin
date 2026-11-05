# Rubric: Slice 27 — Optimiser run C3

Feature: priority-dev-spike
Epic: E7
Slice goal: `priority optimise` prints the trainset, valset, and minibatch sizes in the glossary terms. Arm C3 is seeded from a copy of C2 with its cut sentence repaired, with a larger valset and minibatch. A report compares arm A, run again after slice 24, with C3 on the test set.
Test command: `uv run --project priority-dev pytest priority-dev/tests -q`

## Criteria

### C1 — Sizes printed in glossary terms
**Must be true:** The run prints `trainset: N stops (S sessions); valset: N stops (S sessions); minibatch: M`.
**Evidence to check:**
- Run the optimise CLI test on made-up fixtures.
**Scoring:**
- 1.0 — printed
- 0.5 — printed in other words
- 0.0 — not printed

### C2 — The seed is repaired [CRITICAL]
**Must be true:** The C3 seed is a copy of the C2 program whose cut sentence is finished or removed and whose example `agent_recommendation` is not null. The original C2 file is unchanged.
**Evidence to check:**
- Diff the seed copy against the C2 file.
**Scoring:**
- 1.0 — both repairs, C2 unchanged
- 0.5 — one repair
- 0.0 — no repair

### C3 — Arm A and C3 compared on the test set [CRITICAL]
**Must be true:** A report gives arm A (run after slice 24) and C3 on the 56 test-set stops, per test set and per repository, with paired intervals and no interval for groups under 5 sessions.
**Evidence to check:**
- Read the report and recompute from the per-stop rows.
**Scoring:**
- 1.0 — complete
- 0.5 — an interval or a group missing
- 0.0 — no comparison

## Regression check
- All tests that passed before this slice still pass, apart from tests that this slice's RED role rewrote for the new contract.
- `uv run shared/habit_smells.py --repo priority-dev --branch HEAD` reports no new finding in a file this slice touched.
- Files outside the slice scope stay unchanged: the judge, the references

## Out of scope — do not penalise
- A noise rerun of earlier arms.
