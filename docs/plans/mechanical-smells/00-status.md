# Status: Clear the viewer's habit-hooks findings (mechanical-smells)

- Gate 1 — Product: APPROVED 2026-10-25
  view: http://127.0.0.1:62583/active/viewer/index.html#/mechanical-smells/build/plan/product
- Gate 2 — Architecture: APPROVED 2026-10-25
  view: http://127.0.0.1:62583/active/viewer/index.html#/mechanical-smells/build/plan/architecture
- Gate 2b — Interaction design: n/a (no UI) — Screens: "no UI change: the viewer renders the same pages"
- Gate 3 — Program Design: APPROVED 2026-10-25
  view: http://127.0.0.1:62583/active/viewer/index.html#/mechanical-smells/build/plan/program
- Gate 4 — Slice plan, epic designs, and rubrics: APPROVED 2026-10-26
  view: http://127.0.0.1:62583/active/viewer/index.html#/mechanical-smells/build/epics
  - 4a Slice plan: APPROVED 2026-10-25
  - 4b Epic technical solution designs: APPROVED 2026-10-26
  - 4c Blind rubrics: APPROVED 2026-10-26

Design mode: mechanical-smells
Memory (Gate 1): absent
Memory (before Gate 3, or Gate 2): absent

## Slices
- [x] Slice 1 — tracer bullet: the logic layer: `data/*` and `shell/model.ts`   score: 1 on attempt 1   note: —
- [x] Slice 2 — the atoms and sections   score: 1 on attempt 1   note: —
- [x] Slice 3 — the change surface   score: 1 on attempt 1   note: —
- [x] Slice 4 — the shell and chrome   score: 1 on attempt 2   note: —
- [x] Slice 5 — the viewer test files   score: 1 on attempt 1   note: —
- [x] Slice 6 — the comments in viewer source   score: 1 on attempt 1   note: —
- [x] Slice 7 — the comments in viewer tests   score: 1 on attempt 1   note: —

## Escalated
none

## Notes for a fresh session
- Epic E1 holds seven slices. Epic E2 holds the 703 findings outside the viewer and has no slices. A later pass cuts them.
- `.habit-hooks/config.toml` excludes `components/ui` and `components/smoothui`.
- The engineer chose per-comment review for slices 6 and 7.
- The engineer allows async pushes of the Beads database (2026-10-26). Do not set `sync: off` in `.cobuilder/tracker.yaml`.
- The engineer approved all gates by 2026-10-26. The build runs on branch `design/mechanical-smells` in a worktree, and slice 1 passed at 1.00 on attempt 1.
- The comment wording fix is in place: slices 1 to 5 ignore the `non-essential-comment` smell and must not raise its count, and slices 6 and 7 own it.
- Do not read anything under `.cobuilder/`.
