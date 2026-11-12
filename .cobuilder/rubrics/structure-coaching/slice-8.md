# Rubric: Slice 8 — VALIDATE writes the Structure block

Feature: structure-coaching
Epic: E4
Slice goal: see row 8 of docs/plans/structure-coaching/04-slices.md
Test command: uv run pytest tests -q

## Criteria

### C1 — The block holds the three judgments [CRITICAL]
**Must be true:** A blind VALIDATE on a fixture slice wrote a ### Structure block that judges contract drift, cohesion, and each new dependency against the forbidden_dependencies of boundary.yaml, with a cited line for each finding.
**Evidence to check:**
- Read the fixture attempt file in the slice evidence.
**Scoring:**
- 1.0 — three judgments with citations
- 0.5 — two, or no citations
- 0.0 — no block

### C2 — The block stays outside the score [CRITICAL]
**Must be true:** overall_score in the attempt file is the plain average of the rubric criteria only.
**Evidence to check:**
- Recompute the average from the criterion scores in the fixture attempt file.
**Scoring:**
- 1.0 — equal
- 0.5 — —
- 0.0 — the block changed the score

### C3 — A FAIL passes the block to GREEN
**Must be true:** On a failed fixture attempt, slice-N-feedback.md holds the block.
**Evidence to check:**
- Read the fixture feedback file.
**Scoring:**
- 1.0 — present
- 0.5 — partial
- 0.0 — absent

### C4 — The block judges each script finding [CRITICAL]
**Must be true:** The fixture slice adds a file to a folder over the limit. VALIDATE ran structure_signals.py --file on the files that the slice added, and the block lists the crowded-folder finding as confirmed or dismissed, with one line of reason. VALIDATE did not run structure_runner.py.
**Evidence to check:**
- Read the blind-pass transcript for the script call and its arguments.
- Read the fixture attempt file for the finding and its judgment.
**Scoring:**
- 1.0 — script run on the added files, finding judged with a reason
- 0.5 — script run, finding listed with no judgment
- 0.0 — no script run, or the finding is absent

## Regression check
- All tests that passed before this slice must still pass.
- Files outside the slice scope in the epic design must remain unchanged.

## Out of scope — do not penalise
- An import parser (E7)
- Scored structure criteria (E5 decides)
