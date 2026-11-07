# Rubric: Slice 31 — Arms D1 and D2

Feature: priority-dev-spike
Epic: E8
Slice goal: Two optimiser runs that differ only in the proposer: D1 with `--proposer v1`, D2 with `--proposer v2`. Same seed program, seed 7, the C3 valset of 12 sessions, minibatch 6, budget 3, Muse Wonder as the reflection model. Then D1, D2, and arm A on the 56 test-set stops. `probes/proposer-report.md` compares them.
Test command: `uv run --project priority-dev pytest priority-dev/tests -q`

## Criteria

### C1 — The two runs differ only in the proposer [CRITICAL]
**Must be true:** The commands of D1 and D2 are the same except `--proposer`. Both print the same trainset, valset, and minibatch lines and the same reflection model.
**Evidence to check:**
- Read the run script and both run outputs.
**Scoring:**
- 1.0 — only the proposer differs
- 0.0 — another setting differs

### C2 — D1, D2, and A compared on the test set [CRITICAL]
**Must be true:** The report gives D1, D2, and arm A on the 56 test-set stops, D2 − D1 and each arm − A, per test set and per repository, with paired session-bootstrap intervals and no interval for groups under 5 sessions. It states that a difference under about 0.08 is within the noise of one run per arm.
**Evidence to check:**
- Recompute from the score lines of the eval outputs.
**Scoring:**
- 1.0 — complete
- 0.5 — an interval or a group missing
- 0.0 — no comparison

### C3 — The runs are described
**Must be true:** For each run, the report gives the valset score of the seed and the best candidate, the number of proposals, accepted and rejected, the rejected by the trainset-detail check, and the length of the saved instruction.
**Evidence to check:**
- Read the run outputs, the reflection files, and `candidates.json`.
**Scoring:**
- 1.0 — all facts for both runs
- 0.5 — one fact missing
- 0.0 — none

## Regression check
- All tests that passed before this slice still pass.
- No code change in this slice except a run script and the report.

## Out of scope — do not penalise
- A noise rerun of any arm.
- The valset fixes (a later epic).
