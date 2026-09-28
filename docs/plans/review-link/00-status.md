# Status: Review link

- Gate 1 — Product: APPROVED 2026-09-28
  view: http://127.0.0.1:62583/active/viewer/index.html#/review-link/build/plan/product
- Gate 2 — Architecture: APPROVED 2026-09-28
  view: http://127.0.0.1:62583/active/viewer/index.html#/review-link/build/plan/architecture
- Gate 2b — Interaction design: APPROVED 2026-09-28
- Gate 3 — Program Design: APPROVED 2026-09-28
  view: http://127.0.0.1:62583/active/viewer/index.html#/review-link/build/plan/program
- Gate 4 — Slice plan, epic designs, and rubrics: APPROVED 2026-09-28
  view: http://127.0.0.1:62583/active/viewer/index.html#/review-link/build/epics
  - 4a Slice plan: APPROVED 2026-09-28
  - 4b Epic technical solution designs: APPROVED 2026-09-28
  - 4c Blind rubrics: APPROVED 2026-09-28

Design mode: review-link
Hindsight: yes

## Slices
- [x] Slice 1 — tracer bullet: review_link.py prints a checked deep link   score: 0.92   attempt 1
- [x] Slice 2 — plan documents in the index and a plan page in the viewer  score: 1.00   attempt 2
- [x] Slice 3 — Present for review procedure and the link check            score: 0.92   attempt 1

## Escalated
none yet

Slice 1 C6 scored 0.5: no test writes two port lines to the log to prove the last one wins.

## Notes
- Slice 2 attempt 1 hid the Plan row for a work with no plan. The spec asks for a disabled row with the reason "no plan". Attempt 2 shows it disabled, and three older viewer tests changed to state this.
- App.test "holds one row list" now compares reachable rows only, so its availability check can no longer fail. Other cases pin the disabled row.
- The plan page's empty line uses --ink-dim at 4.16:1 in light mode, below WCAG AA 4.5:1. The viewer has no darker text tier for this line.
- The comment at plugins/artifact/viewer/src/shell/model.ts near line 379 still says the Plan row shows only for a work with a plan directory. The row now shows disabled instead.
- Slice 3 C3 scored 0.5: no blind transcript showed an agent writing the view link onto a gate line, because the blind agents could not write files.
- Slice 3 had one valid blind pass, on a build gate. No blind pass covered the after-slice step, ESCALATE, or the architect modes. The packaging tests cover those points by text only.
- A gate link names the local port of the View server. After a restart on another port the link fails, but its route still names the page the approver saw.
- The gate view links moved off the state text onto their own `view:` lines under the gate lines, per the ADR-0032 amendment of 2026-09-28. Two facts rode one string, so every parser had to split them, and one projection failed to.
- verify_gate.py keeps a comment near line 99 that names plugins/artifact/scripts/build_builds_view.py. It was there before this feature. A grep for plugins/artifact/ in plugins/implement matches it.

## Notes for a fresh session
Pre-approved by the user in chat on 2026-09-28: decisions 1-5, one ADR, one epic, a couple of slices, built without further questions.

The design record is `docs/architecture/designs/review-link/` (ADR-0032).

Gates 1, 2, 3, and 4 carry a viewer link. Gate 2b reads n/a.
