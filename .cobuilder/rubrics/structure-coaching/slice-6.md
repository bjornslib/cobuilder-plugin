# Rubric: Slice 6 — The agent-use check

Feature: structure-coaching
Epic: E3
Slice goal: see row 6 of docs/plans/structure-coaching/04-slices.md
Test command: uv run pytest tests -q

## Criteria

### C1 — The effect is chosen and recorded [CRITICAL]
**Must be true:** 00-status.md notes or the ADR record which effect the check reads, and why, from the spike.
**Evidence to check:**
- Read the notes and ADR-0048 decision 9.
**Scoring:**
- 1.0 — chosen with a reason
- 0.5 — chosen with no reason
- 0.0 — still open

### C2 — The four cases [CRITICAL]
**Must be true:** check_slice passes for a pass at attempt 1 and for a workflow-mode slice, and fails for no attempt file and for a slice that the main agent wrote.
**Evidence to check:**
- Run tests/test_agent_use.py.
**Scoring:**
- 1.0 — all four pass
- 0.5 — three
- 0.0 — fewer

### C3 — verify_gate.py --slice runs the check
**Must be true:** verify_gate.py --plan <dir> --slice <N> runs only the agent-use check and exits 1 with a reason when it fails.
**Evidence to check:**
- Run the command on a fixture plan.
**Scoring:**
- 1.0 — works with a reason
- 0.5 — works without a reason
- 0.0 — absent

## Regression check
- All tests that passed before this slice must still pass.
- Files outside the slice scope in the epic design must remain unchanged.

## Out of scope — do not penalise
- The loop text (slice 7)
