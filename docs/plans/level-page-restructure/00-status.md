# Status: Level page restructure

**Feature:** `level-page-restructure`
**Epics:** E1 — Level chrome · E2 — In Short · E3 — Record gaps
**Slices:** 5

**Approval note, 2026-10-07.** The engineer waived the gate presentations:
"don't present them". Each gate below is recorded APPROVED on that waiver, and
the content of every gate comes from the engineer's own decisions in the
session that approved the prototype. The engineer reads the result in the pull
request.

## Gates

- Gate 1 — Product (no tech talk): APPROVED 2026-10-07 (waived)
  view: `#/level-page-restructure/build/plan/product`
- Gate 2 — Architecture: APPROVED 2026-10-07 (waived)
  view: `#/level-page-restructure/build/plan/architecture`
- Gate 2b — Interaction design: APPROVED 2026-10-07 (waived) — Screens: "Level page (work item or pull request)"
- Gate 3 — Program design: APPROVED 2026-10-07 (waived)
  view: `#/level-page-restructure/build/plan/program`
- Gate 4 — Slice plan, epic designs, and rubrics: APPROVED 2026-10-07 (waived)
  view: `#/level-page-restructure/build/plan/epics`
  - 4a Slice plan: APPROVED 2026-10-07 (waived)
  - 4b Epic technical solution designs: APPROVED 2026-10-07 (waived)
  - 4c Blind rubrics: APPROVED 2026-10-07 (waived)

Design mode: none
Hindsight: no

## Slices

- [ ] Slice 1 — branch in the top bar, bar removed: score: —
- [ ] Slice 2 — account link in the section heading: score: —
- [ ] Slice 3 — one rail: score: —
- [ ] Slice 4 — In Short strip: score: —
- [ ] Slice 5 — record gaps in build_index: score: —

## Escalated

None.

## Notes for a fresh session

- The approved design is the prototype page, version 3: https://claude.ai/artifact/8vkqCoEjZfB5YpfiVcqbd6
- RED agents run only where code logic needs a test (slices 2, 3, 4, 5). Slice 1 has none.
- Existing tests that assert removed UI may be updated by GREEN. Each change is listed in the GREEN report, and VALIDATE checks that no test was weakened.
- This work is on branch `level-page-restructure`, which stacks on PR 30 (`fix/stage-guard-and-intent-pr`). The viewer files it changes are the ones PR 30 changed.
- Do not bump plugin versions. The engineer will ask for that at the end.

## Build log

- Slice 1, attempt 1: VALIDATE scored 0.917 and returned FAIL, because critical C1 held 0.5. `TopLinePanel` and `Fact` remain in `src/variations/sections-e/`, a frozen prototype the Shell does not import. The engineer ruled `src/variations/` out of scope. The rubric grep now covers `src/shell/`, and a fresh VALIDATE re-scores.
