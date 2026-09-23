# Status: cobuilder-viewer

The Work surface of the bundle viewer: the application shell, its levels, and the
sections each level pages. `cobuilder-viewer` merges `react-viewer` and
`review-flight-deck` into one design. Nineteen epics carry it, and eleven of them
deferred on 2026-09-22 when the engineer narrowed the scope to the Work surface and
FlightDeck at parity.

- Gate 1 — Product: APPROVED 2026-09-22
- Gate 2 — Architecture: APPROVED 2026-09-22
- Gate 2b — Interaction design: APPROVED 2026-09-22
- Gate 3 — Program Design: APPROVED 2026-09-22
- Gate 4 — Slice plan, epic designs, and rubrics: pending
  - 4a Slice plan: APPROVED 2026-09-22
  - 4b Epic technical solution designs: in progress
  - 4c Blind rubrics: pending

Design mode: cobuilder-viewer
Hindsight: unavailable (the session that wrote this status registered no Hindsight tool, so no retain and no recall ran)

## Slices

Eight epics carry sixteen slices, written at Gate 4a in `04-slices.md`. Four of
those epics carry more than one slice, and each owes a Gate 4b design before its
slices build: E2, E5, E7, and E19. The cut defers eleven epics, and they carry none: E8,
E9, E10, E11, E12, E13, E14, E15, E16, E17, and E18.

- [ ] Slice 1 — Tracer bullet: a publish survives a marker rename   score: —
- [ ] Slice 2 — Two builds produce the same bytes                   score: —
- [ ] Slice 3 — The build owns the committed file                   score: —
- [ ] Slice 4 — One typed model reads the bundle                    score: —
- [ ] Slice 5 — The Work prototype, reviewed                        score: —
- [x] Slice 6 — The shell lands on the bundle's designs             score: 1.00
- [x] Slice 7 — A row opens the item's Work surface                 score: 1.00
- [ ] Slice 8 — The section model                                   score: —
- [ ] Slice 9 — The level's progress                                score: —
- [ ] Slice 10 — Every level renders its own sections                score: —
- [ ] Slice 11 — The diagram tiles open their drawing                score: —
- [ ] Slice 12 — A record opens in the Sheet                         score: —
- [ ] Slice 13 — A goal.json-only design renders                     score: —
- [ ] Slice 14 — The FlightDeck prototype, reviewed                  score: —
- [ ] Slice 15 — A single pull request at parity                     score: —
- [ ] Slice 16 — The joins rail                                      score: —

**Slice 6 ran on 2026-09-22 and scored 1.0**, weighted 0.08. It built the Work board at
`src/shell/Board.tsx` and `src/shell/readiness.ts`, and the shell that reaches it at
`src/shell/App.tsx`. Four of its nine criteria were carried from an earlier run: C3, C4,
C6, and C8 were measured before the board's height was repaired, and the repair changed
no claim they make. C1, C2, C5, C7, and C9 were re-measured after it.

**One defect was found and fixed inside slice 6.** C7 scored 0.0 on the first run: the
board's scroll pane had no definite height, so it grew to its content and the document
scrolled instead. The cause was wider than the board. `src/index.css` holds no `height`
rule, `#root` holds none, and the shadcn wrapper's `min-h-svh` does not survive `cn`, so
the shell root's `h-full` resolved to `auto` on every route. The prototype never showed
this, because `Variations.tsx` gave the variation `h-dvh` and the old committed viewer
set `html, body { height: 100% }` with `#app { height: 100vh }`. The fix adds a
`max-h-dvh` cap to the shell root and a `min-w-0 shrink-0` wrapper around the board's
pane slot. Both are in `src/shell/App.tsx`, and the file's header states the rule.

**Slice 7 ran on 2026-09-22 and scored 1.0**, weighted 0.05. It made a board row a real
link, so a press opens that item's Work surface. Both CRITICAL criteria scored 1.0, and no
console message appeared at any level on any route.

Both of this epic's slices now stand at 1.0. Fourteen slices of the sixteen have not run: 1 to 5,
and 8 to 13, and 14 to 16.

## Escalated

None. Slices 6 and 7 ran and each scored 1.0, so no score fell below its threshold.

No slice scored below its threshold on a second attempt, so nothing escalated.

## Notes for a fresh session

**All nineteen epics share one branch.** Every epic in `goal.json` names
`design/cobuilder-viewer/work-prototype`, and no epic names a pull request. So the
epic state join reads `no-pull-request` for all of them, deferred ones included, and
the Build level cannot group its epics by state. The Build level pages them in
delivery order instead, six epics to a section. ADR-0028 states the reason.

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

**The scope was cut on 2026-09-22.** The engineer narrowed this program to two
surfaces. One is the Work surface. The other is the current pull request viewer,
renamed to FlightDeck at parity. The cut defers eleven epics rather than deleting
them: E8 to E18. Each one carries `state: "deferred"` in `goal.json`, with the
reason on the epic.
Do not renumber them, and do not read the gap as an unfinished list. The ladder in
`04-slices.md` names them with no slices under them, so the cut is visible from the
plan as well as from the design.

**E19 is the landing surface the shell never had.** Before it, a reader arrived on
a route that named a work item. Nothing listed the bundle's designs, and a route
that named no work item fell through to the route error. E19 adds a board of every
design in the bundle. Each row states the item's stage and the records it holds,
and a row opens that item's Work surface. It is new in round 3, it reads `planned`,
and it carries two slices.

**Seven designs carry a `goal.json` and nothing else.** `build-workflow-polish`,
`gate-state-resolution`, `inflight-record-store`, `interaction-design-gate`,
`lean-bundle-diffs`, `maintainable-viewer`, and `ubiquitous-language`. E5's
surviving criterion is that the Work surface renders each of them. They are the
fixtures for a sparse-record test, and they need no intent, narrative, or
assessment record to do it.

**The shipped shell owns the bare route, and the prototype does not.** `src/shell/App.tsx`
sets `ROUTE_PREFIX` to `#/`, so `#/` is the board, `#/<design-id>` is that design's Work
surface, and `#/variations` reaches the comparison harness. The prototype keeps its own
`#/sections-e` prefix at `src/variations/sections-e/model.ts`. Any older document that
names `#/sections-e` as a route is stale.

**The built viewer asks for its data at an absolute path.** It requests
`/bundle/data/index.json`, because the vite dev server mounts the bundle at `/bundle/`.
A built file served beside a real bundle would 404 on its own data. E2 owns the fix, and
it must land before the build is allowed to write the committed `index.html`.

**A diagram tile once showed a raw Mermaid comment as its title.** On the design
`review-flight-deck`, the level 1 tile rendered the literal text `%% review-flight-deck
level 1 — where each part runs`, and its accessible name carried the same string. The
title was read from a `.mmd` line that is a comment. The fix makes the title skip `%%`
comment lines. Slice 11 owns the diagram tiles, so a later session should re-check the
tile in a browser.

**The slice ladder's Score and State cells have no consumer.** `shared/build_index.py`'s
`collect_plans()` reads `row.name`, `row.ends_with`, and `row.n` from `shared/slice_table.py`,
and it never reads `row.score` or `row.state`. So
the Score and State columns of `04-slices.md` are parsed and then discarded. A slice's score
and state come from this document's checklist, through `STATUS_SLICE_RE`. So the two cells
can disagree, and the checklist wins. The checklist is also the richer source, because it
alone records `on attempt N`. Either a future session gives the ladder's cells a consumer,
or it drops them. It is not decided here.

**The Builds view carries the wrong rubrics, and it can read only fourteen.** The page's
generator, `plugins/artifact/scripts/build_builds_view.py`, defaults `--rubrics` to
`.cobuilder/rubrics/cobuilder-family`. So a page built for this plan carries the
`cobuilder-family` rubrics, not this plan's own, and all sixteen of this plan's rubrics are
absent from the viewer. The generator also holds `RUBRIC_COUNT` as the module constant `14`
at line 33, and `read_rubrics` loops `range(1, RUBRIC_COUNT + 1)`. So even a run with
`--rubrics .cobuilder/rubrics/cobuilder-viewer` would drop slices 15 and 16 in silence, and
would print no warning. A later session should derive the count from the files present, and
derive the default rubrics directory from the plan's slug. Neither is changed here.
