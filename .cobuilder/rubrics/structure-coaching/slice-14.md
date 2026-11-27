# Rubric: Slice 14 — Review mode and maintenance mode report the record

Feature: structure-coaching
Epic: E6
Slice goal: see row 14 of docs/plans/structure-coaching/04-slices.md
Test command: uv run pytest tests -q

## Criteria

### C1 — Review mode writes the section [CRITICAL]
**Must be true:** A blind agent in review mode with a fixture repo runs the record step, writes structure-findings.json beside the reports, and writes a Structure section with a judgment (debt, accepted, or false) and a reason for each finding it reports.
**Evidence to check:**
- Read the blind-pass transcript and the section it wrote.
**Scoring:**
- 1.0 — script run, record written, each finding judged
- 0.5 — section present, judgments missing
- 0.0 — no section

### C2 — Maintenance mode gives the trend [CRITICAL]
**Must be true:** The maintenance step names the record of the last run, runs the script with `--since`, and tags each finding new, worse, unchanged, or fixed.
**Evidence to check:**
- Read the maintenance step in SKILL.md and check each named option exists in the script.
- Read the blind-pass transcript when one ran.
**Scoring:**
- 1.0 — all named and real
- 0.5 — one missing
- 0.0 — none

### C3 — A failed run claims no clean result
**Must be true:** The skill text tells the agent to say that the run failed, and to claim no clean result.
**Evidence to check:**
- Read the step and structure-review.md.
**Scoring:**
- 1.0 — present
- 0.5 — partial
- 0.0 — absent

### C4 — Plugin rules hold
**Must be true:** The architect plugin names no path inside another plugin, and the existing architect and install tests pass.
**Evidence to check:**
- Run `uv run pytest tests -q`.
- Grep the changed skill files for `plugins/`.
**Scoring:**
- 1.0 — both hold
- 0.5 — one holds
- 0.0 — neither

## Regression check
- All tests that passed before this slice must still pass.
- Files outside the slice scope in the epic design must remain unchanged.

## Out of scope — do not penalise
- The refactor skill (E8)
- The dependency diagram (E7)
