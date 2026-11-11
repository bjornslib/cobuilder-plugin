# Rubric: Slice 7 — The loop text makes the main agent use the three agents

Feature: structure-coaching
Epic: E3
Slice goal: see row 7 of docs/plans/structure-coaching/04-slices.md
Test command: uv run pytest tests -q

## Criteria

### C1 — A blind main agent spawns the three agents [CRITICAL]
**Must be true:** A fresh main agent that got the changed loop text and a small design spawned RED, GREEN, and VALIDATE by agent type, in that order, for each slice.
**Evidence to check:**
- Read the blind-pass transcript in the slice evidence.
**Scoring:**
- 1.0 — every slice, in order
- 0.5 — one slice skipped or out of order
- 0.0 — the main agent wrote code itself

### C2 — The check runs before a slice closes [CRITICAL]
**Must be true:** In the same transcript, the main agent ran verify_gate.py --slice before set-slice-state closed.
**Evidence to check:**
- Read the transcript for the order of the two calls.
**Scoring:**
- 1.0 — every slice
- 0.5 — some slices
- 0.0 — never

### C3 — One real slice ran locally
**Must be true:** A transcript shows one real slice of this repo from RED to a VALIDATE score.
**Evidence to check:**
- Read the slice evidence.
**Scoring:**
- 1.0 — kept
- 0.5 — partial
- 0.0 — absent

## Regression check
- All tests that passed before this slice must still pass.
- Files outside the slice scope in the epic design must remain unchanged.

## Out of scope — do not penalise
- slice-loop.js as the default mode, which the engineer ruled out
