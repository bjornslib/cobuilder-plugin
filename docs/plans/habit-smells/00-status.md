# Status: Mechanical smells in review and maintenance (habit-smells)

- Gate 1 — Product: APPROVED 2026-10-08 (delegated by user)
  view: http://127.0.0.1:62583/#/habit-smells/build/plan/product
- Gate 2 — Architecture: APPROVED 2026-10-08 (delegated by user)
  view: http://127.0.0.1:62583/#/habit-smells/build/plan/architecture
- Gate 2b — Interaction design: n/a (no UI) — Screens: "no UI"
- Gate 3 — Program Design: APPROVED 2026-10-08 (delegated by user)
  view: http://127.0.0.1:62583/#/habit-smells/build/plan/program
- Gate 4 — Slice plan, epic designs, and rubrics: APPROVED 2026-10-08 (delegated by user)
  view: http://127.0.0.1:62583/#/habit-smells/build/epics
  - 4a Slice plan: APPROVED 2026-10-08 (delegated by user)
  - 4b Epic technical solution designs: n/a (no epic carries more than one slice)
  - 4c Blind rubrics: APPROVED 2026-10-08 (delegated by user)

Design mode: habit-smells
Hindsight: no

## Slices
- [x] Slice 1 — E1 whole epic: `habit_smells.py`, the `habit.smells` gate key, and the scan tests   score: 1.00
- [x] Slice 2 — E2 whole epic: the review mode Mechanical smells section and its wiring tests       score: 1.00 (accepted; a summary-key defect found by the blind pass is being fixed under E1)
- [x] Slice 3 — E3 whole epic: the maintenance mode pair diff, its wiring tests, and the commands   score: 0.90 (attempt 2; C3 0.5: first scan tags every pair NEW and sets the baseline)

## Escalated
none

## Notes for a fresh session
- The user delegated all four gate approvals in one hand-off on 2026-10-08. Decide independently and record the approvals as done above.
- No slice is built yet. The branch `feature/habit-smells` holds the ADR and the plan only.
- The scan target is this repo. Its duplicate-code group is large, so the top-10 cap is a first-class rule in slice 2.
- Do not read anything under `.cobuilder/`.