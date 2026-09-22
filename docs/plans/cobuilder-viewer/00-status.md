# Status: cobuilder-viewer

The Work surface of the bundle viewer: the application shell, its levels, and the
sections each level pages. `cobuilder-viewer` merges `react-viewer` and
`review-flight-deck` into one design, and its eighteen epics carry the Work,
FlightDeck, and Reference surfaces.

- Gate 1 — Product: APPROVED 2026-09-22
- Gate 2 — Architecture: APPROVED 2026-09-22
- Gate 2b — Interaction design: APPROVED 2026-09-22
- Gate 3 — Program Design: pending
- Gate 4 — Slice plan, epic designs, and rubrics: pending
  - 4a Slice plan: pending
  - 4b Epic technical solution designs: pending
  - 4c Blind rubrics: pending

Design mode: cobuilder-viewer
Hindsight: unavailable (the session that wrote this status registered no Hindsight tool, so no retain and no recall ran)

## Slices

No slice exists yet, and this file invents none. Gate 3 and Gate 4 did not run.
So `03-program-design.md` and `04-slices.md` do not exist, and the design carries
no slice ladder. `goal.json` holds eighteen planned epics. Each epic's slices
arrive at Gate 4a.

## Escalated

None. No slice ran, so no score fell below its threshold.

## Notes for a fresh session

**All eighteen epics share one branch.** Every epic in `goal.json` names
`design/cobuilder-viewer/work-prototype`, and no epic names a pull request. So
the epic state join reads `no-pull-request` for all eighteen, and the Build level
cannot group its epics by state. The Build level pages them in delivery order
instead, six epics to a section. ADR-0028 states the reason.

**E4's artifact is the React prototype, not a static HTML file.** E4's outcome
asks for a prototype of the Work board. `goal.json`'s round-2 note then names a
"detailed static HTML prototype" for each surface. The Work board's prototype
shipped as a React application instead. It lives under
`plugins/artifact/viewer/src/variations/sections-e/`, with its own `src/index.css`
token set and its own Vite entry. `variations/app-shell/` is the same shell
without the section model, kept as the comparison. Both are scaffolding for the
design decision, in the same sense `Variations.tsx` is. Do not read either one as
the shipped viewer: the shipped file is `plugins/artifact/viewer/index.html`,
which ADR-0023's build owns.

**No `ui-spec.jsonc` exists anywhere in this repository, and none ever has.**
This plan carries the first one written. So `verify_gate.py` checks only that the
file exists, and nothing reads its contents. A later session that wants the file
checked must write the check.

**Gate 1 and Gate 2 are approved without their documents.** The engineer
approved both gates on 2026-09-22. Neither `01-product.md` nor
`02-architecture.md` exists in this plan directory, so the approval rests on the
engineer's word and not on a document a later session can read. The product
intent lives in `goal.json` and `intent.json`. The architecture lives in
`docs/architecture/designs/cobuilder-viewer/diagrams/` and in the five ADRs the
design names. A session that needs the two missing documents should write them.
Do not read the two gate lines as evidence that the documents exist.

**The level-and-section model replaced the lens model.** Six design lenses were
the vocabulary of `react-viewer` and of earlier versions of this design. Those six
were intent, problem/solution, architecture, risks and verdict, build, and pull
requests. Nothing renders a lens now. A level pages its sections, one section at a
time on a horizontal track. ADR-0028 records the decision, and
`docs/architecture/designs/cobuilder-viewer/diagrams/level-1.mmd` carries the
corrected text.

**This design keeps its diagram sources in the repository.** They live in
`docs/architecture/designs/cobuilder-viewer/diagrams/level-{1,2,3}.mmd` and reach
the bundle through `shared/build_index.py`. Level 1 is the container drawing and
belongs to the Intent level. Levels 2 and 3 are mechanism and belong to
Architecture. A PR's own diagrams under `<bundle-dir>/data/diagrams/` are a
different set, and `plugins/pr/scripts/build_diagrams.py` compiles those.

**Seven designs carry a `goal.json` and nothing else.** `build-workflow-polish`,
`gate-state-resolution`, `inflight-record-store`, `interaction-design-gate`,
`lean-bundle-diffs`, `maintainable-viewer`, and `ubiquitous-language`. E5's
surviving criterion is that the Work surface renders each of them. They are the
fixtures for a sparse-record test, and they need no intent, narrative, or
assessment record to do it.
