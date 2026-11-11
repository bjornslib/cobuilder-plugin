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

## Regression check
- All tests that passed before this slice must still pass.
- Files outside the slice scope in the epic design must remain unchanged.

## Out of scope — do not penalise
- An import parser (E7)
- Scored structure criteria (E5 decides)
