# Status: Review link

- Gate 1 — Product: APPROVED 2026-09-28
- Gate 2 — Architecture: APPROVED 2026-09-28
- Gate 2b — Interaction design: APPROVED 2026-09-28
- Gate 3 — Program Design: APPROVED 2026-09-28
- Gate 4 — Slice plan, epic designs, and rubrics: APPROVED 2026-09-28
  - 4a Slice plan: APPROVED 2026-09-28
  - 4b Epic technical solution designs: APPROVED 2026-09-28
  - 4c Blind rubrics: APPROVED 2026-09-28

Design mode: review-link
Hindsight: yes

## Slices
- [x] Slice 1 — tracer bullet: review_link.py prints a checked deep link   score: 0.92   attempt 1
- [x] Slice 2 — plan documents in the index and a plan page in the viewer  score: 1.00   attempt 2
- [ ] Slice 3 — Present for review procedure and the link check            score: —

## Escalated
none yet

Slice 1 C6 scored 0.5: no test writes two port lines to the log to prove the last one wins.

## Notes
- Slice 2 attempt 1 hid the Plan row for a work with no plan. The spec asks for a disabled row with the reason "no plan". Attempt 2 shows it disabled, and three older viewer tests changed to state this.
- App.test "holds one row list" now compares reachable rows only, so its availability check can no longer fail. Other cases pin the disabled row.
- The plan page's empty line uses --ink-dim at 4.16:1 in light mode, below WCAG AA 4.5:1. The viewer has no darker text tier for this line.
- The comment at plugins/artifact/viewer/src/shell/model.ts near line 379 still says the Plan row shows only for a work with a plan directory. The row now shows disabled instead.

## Notes for a fresh session
Pre-approved by the user in chat on 2026-09-28: decisions 1-5, one ADR, one epic, a couple of slices, built without further questions.

The design record is `docs/architecture/designs/review-link/` (ADR-0032).

The gate lines above carry no viewer link yet. No plan page existed when the
user approved them. Their date is 2026-09-28, so the check from slice 3
applies to them. Slice 3 therefore adds a `view:` link to each of these
lines, as part of its own work. Without that edit, `verify_gate.py` fails this
plan after slice 3 ships.
