# Rubric: Slice 30 — Live smoke run of the v2 proposer

Feature: priority-dev-spike
Epic: E8
Slice goal: One live optimiser run with `--proposer v2` on the slice 26 setup (3 low-scoring trainset stops, a valset of 1 session, budget 3), seeded from `probes/programs/seed-armC3-from-C2.json`. The reflection files show the new base prompt, the reference material, and the `Structure:` and `Reference:` blocks. The run reports how many proposals the trainset-detail check rejected.
Test command: `uv run --project priority-dev pytest priority-dev/tests -q`

## Criteria

### C1 — The reflection model got the v2 input [CRITICAL]
**Must be true:** Each reflection file records `proposer: v2` and the reflection model id. Each of its stops has a feedback that starts with the score and holds `Structure:` and `Reference:`.
**Evidence to check:**
- Read the reflection files of the run.
**Scoring:**
- 1.0 — all present in every file
- 0.5 — one block missing in some stops
- 0.0 — no reflection call

### C2 — The proposals stay within the limit and are whole
**Must be true:** Each proposal is at most 6000 characters plus the schema guard, and equals the candidate instruction when accepted.
**Evidence to check:**
- Compare the reflection files with `candidates.json`.
**Scoring:**
- 1.0 — all within the limit and whole
- 0.5 — one over the limit
- 0.0 — a cut proposal

### C3 — The rejection count is reported
**Must be true:** A short note in `probes/proposer-report.md` gives the number of proposals and the number rejected by the trainset-detail check, and states whether the count is above 1 in 4, the point at which the engineer decides on the `Reference:` block.
**Evidence to check:**
- Count the `proposal rejected` lines in the run output and compare with the note.
**Scoring:**
- 1.0 — counts match and the threshold is stated
- 0.0 — no count

## Regression check
- All tests that passed before this slice still pass.
- No code change in this slice except a run script.

## Out of scope — do not penalise
- The score of the run.
- A judge retry caused by the provider.
