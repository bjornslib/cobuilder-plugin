# Rubric: Slice 6 — E2 edge cases: no-doc cards, mutual exclusivity

Feature: gate-doc-surfacing
Epic: E2
Slice goal: A Gate Rail card whose gate has no matching doc opens nothing; opening the gate-doc sheet closes any open ADR/assessment/comments sheet, and vice versa
Test command: manual browser check via the run skill (no JS test harness in this repo)

## Criteria

### C1 — opening the gate-doc sheet closes an already-open ADR sheet [CRITICAL]
**Must be true:** With the ADR sheet open (e.g. from an ADR reference
button), clicking a Gate Rail card with a `doc` closes the ADR sheet and
opens the gate-doc sheet — never both visible at once.
**Evidence to check:** browser check — open an ADR sheet, then click a
gate-doc-bearing Gate Rail card; confirm the ADR sheet is gone and the
gate-doc sheet is showing.
**Scoring:**
- 1.0 — clean handoff, only one sheet visible at any time.
- 0.5 — the old sheet visually lingers briefly but is gone after the click settles.
- 0.0 — both sheets stack/overlap, or the click is blocked entirely.

### C2 — opening the ADR sheet closes an already-open gate-doc sheet
**Must be true:** The reverse direction of C1 also holds — the gate-doc
sheet's `openGateDocSheet` closing logic is symmetric with existing
`openAdrSheet`/`openAssessmentSheet` calls closing it in turn.
**Evidence to check:** browser check — open the gate-doc sheet, then click
an ADR reference; confirm the gate-doc sheet closes.
**Scoring:**
- 1.0 — symmetric close confirmed both directions (this criterion plus C1).
- 0.0 — only one direction works.

### C3 — a Gate Rail card with no matching doc never opens the sheet [CRITICAL]
**Must be true:** Every gate whose `joins.feature_gates` entry has no `doc`
field (approved gates from before this feature shipped, or any gate on a
feature that predates E1) shows no click response at all — repeats slice
4's C2, now checked against multiple real features in this repo, not just
one fixture.
**Evidence to check:** browser check — spot-check at least two other
features' Gate Rails (e.g. `cobuilder-family` if shown, or any other
feature's gates) with no `doc` field; confirm none of them open a sheet.
**Scoring:**
- 1.0 — confirmed inert across at least two real no-doc gates, not just one.
- 0.5 — inert for the one fixture case but not verified more broadly.
- 0.0 — any no-doc card opens an empty or broken sheet.

## Regression check
- Slices 4 and 5's criteria still hold.
- Comments drawer and audio dialog mutual exclusivity (pre-existing
  behavior) is unaffected — spot check both still close correctly relative
  to the new sheet.
- `python3 -m pytest tests/ -q` still passes.

## Out of scope — do not penalise
- Any new sheet content correctness — covered by slice 5.
- Performance of many rapid open/close cycles.
