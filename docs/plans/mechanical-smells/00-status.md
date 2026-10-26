# Status: Clear the viewer's habit-hooks findings (mechanical-smells)

- Gate 1 — Product: in progress
- Gate 2 — Architecture: in progress
- Gate 2b — Interaction design: n/a (no UI) — Screens: "no UI change: the viewer renders the same pages"
- Gate 3 — Program Design: in progress
- Gate 4 — Slice plan, epic designs, and rubrics: in progress
  - 4a Slice plan: pending
  - 4b Epic technical solution designs: pending
  - 4c Blind rubrics: pending

Design mode: mechanical-smells
Memory (Gate 1): absent
Memory (before Gate 3, or Gate 2): absent

## Slices
- [ ] Slice 1 — tracer bullet: the logic layer: `data/*` and `shell/model.ts`   score: —   note: —
- [ ] Slice 2 — the atoms and sections   score: —   note: —
- [ ] Slice 3 — the change surface   score: —   note: —
- [ ] Slice 4 — the shell and chrome   score: —   note: —
- [ ] Slice 5 — the viewer test files   score: —   note: —
- [ ] Slice 6 — the comments in viewer source   score: —   note: —
- [ ] Slice 7 — the comments in viewer tests   score: —   note: —

## Escalated
none

## Notes for a fresh session
- Epic E1 holds seven slices. Epic E2 holds the 703 findings outside the viewer and has no slices. A later pass cuts them.
- `.habit-hooks/config.toml` excludes `components/ui` and `components/smoothui`.
- The engineer chose per-comment review for slices 6 and 7.
- The tracker config set `sync: off` while the records were seeded, so nothing pushed to origin.
- Do not read anything under `.cobuilder/`.
