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
- Gate 4 — Slice plan, epic designs, and rubrics: APPROVED 2026-09-25
  - 4a Slice plan: APPROVED 2026-09-22
  - 4b Epic technical solution designs: APPROVED 2026-09-25
  - 4c Blind rubrics: APPROVED 2026-09-25

Design mode: cobuilder-viewer
Hindsight: unavailable (the session that wrote this status registered no Hindsight tool, so no retain and no recall ran)

## Slices

Eight epics carry eighteen slices, written in `04-slices.md`. Gate 4a approved the
first seventeen on 2026-09-22, and slice 18 joined the ladder on 2026-09-25. Four of
those epics carry more than one slice, and each owes a Gate 4b design before its
slices build: E2, E5, E7, and E19. The cut defers eleven epics, and they carry none: E8,
E9, E10, E11, E12, E13, E14, E15, E16, E17, and E18.

- [ ] Slice 1 — Tracer bullet: a publish survives a marker rename   score: —
- [x] Slice 2 — Two builds produce the same bytes                   score: 1.00
- [x] Slice 3 — The build owns the committed file                   score: 1.00
- [x] Slice 4 — One typed model reads the bundle                    score: 1.00
- [x] Slice 5 — The Work prototype, reviewed                        score: 1.00
- [x] Slice 6 — The shell lands on the bundle's designs             score: 1.00
- [x] Slice 7 — A row opens the item's Work surface                 score: 1.00
- [x] Slice 8 — The section model                                   score: 1.00
- [x] Slice 9 — The level's progress                                score: 1.00
- [ ] Slice 10 — Every level renders its own sections                score: —
- [ ] Slice 11 — The diagram tiles open their drawing                score: —
- [ ] Slice 12 — A record opens in the Sheet                         score: —
- [ ] Slice 13 — A goal.json-only design renders                     score: —
- [ ] Slice 14 — The FlightDeck prototype, reviewed                  score: —
- [ ] Slice 15 — The change's account renders                        score: —
- [ ] Slice 16 — The rail reads two accounts, each at its own address  score: —
- [ ] Slice 17 — The account mark, and the jump across               score: —
- [ ] Slice 18 — A pull request with no design is a row of its own   score: —

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

**Slice 1 ran on 2026-09-23, and it cannot be scored in full.** It built the exporter's
named-marker seam: `export_artifact.py` holds `MARKERS` as module data, matches each region
by name, and stops with a message naming a missing marker instead of writing a
half-rewritten page. The viewer carries six marker pairs. Its C2 and C3 pass, on seven tests
in `tests/test_export_artifact_markers.py`.

**Its C1 and C4 could not be scored.** C1 and C2 are the slice's two CRITICAL criteria. C2
passes, and C1 cannot be scored, because it needs a real publish. The Artifact platform
refuses every call in this session, which authenticates with `ANTHROPIC_AUTH_TOKEN`. The
slice is therefore escalated on C1 alone, rather than accepted. The follow-up is one
action: unset that variable, then run `/login` and choose the subscription account. Slice 1
scored 0.50 of its four criteria, and its ladder row stays `pending` until the publishes run.

Slice 1 belongs to `cobuilder-viewer/E1`, its only slice. Slices 6 and 7 belong to
`cobuilder-viewer/E19` and stand at 1.0. Nine slices of the eighteen have not run:
10, 11, 12, 13, 14, 15, 16, 17, and 18. Slice 1 ran, and it did not reach an
accepted score.

**The engineer approved slice 5 on 2026-09-25, and its artifact is the Work surface itself.**

The engineer approved the Work surface, the ported shell at
`plugins/artifact/viewer/src/shell/`. The engineer said the Work pages were already
approved and implemented. That approval is the slice's score, 1.00.

No separate prototype exists for this slice, so a later session must not look for
one. The prototype under `plugins/artifact/viewer/src/variations/sections-e/` is
what E4 left behind. It is not the artifact of this slice.

**Slice 2 ran on 2026-09-23 and scored 1.00**, weighted 0.09. It belongs to
`cobuilder-viewer/E2`. All four of its criteria scored 1.0, so the mean is 1.0. C1 (two
builds of one input produce identical bytes) is the only CRITICAL criterion, and it
scored 1.0: two runs of `npm run build` in `plugins/artifact/viewer/` each wrote a
1,177,754 byte file with sha256
`09a372fd5cfee74f803c483e2f7af58f19988cc8d0a3a43d4273ac03f75bda4b`, and `cmp` exited 0.
The build ran on Node v22.22.3 and npm 10.9.8. C2 (the toolchain pins enough to reproduce
itself) passed on the tracked `package-lock.json`, on `.nvmrc` reading `22.22.3`, and on
`package.json` declaring `engines.node` as `>=22.22.3`. C3 (a differing byte is
detectable, and the report names it) flipped one byte at offset 500000, the report named
that offset, and `cmp -l` agreed. C4 (the built file still boots and renders) served and
rendered the built file: the page title was "CoBuilder viewer", the rail showed Work with
a count of 15, the console held zero messages, and every request returned 200. The build
writes `plugins/artifact/viewer/dist/index.html`, which is gitignored, so the build writes
no tracked file yet. Four test cases still fail, from the Pillow architecture fault, which
is pre-existing and independent of this slice. The validator re-ran its measurement after
the test file changed underneath it at commit b00129e, so this score stands on the current
content. Two things a later session must know. First, the built file is not self-contained,
because it fetches its data from the absolute path `/bundle/`, so serving it needs a root
that holds a directory named `bundle`. Second, the validator reached the browser with the
`agent-browser` CLI over CDP, not the ChromeDevTools MCP tools the rubric names, and it
confirmed the page URL and title before each reading.

**Slice 3 ran on 2026-09-23 and scored 1.00**, weighted 0.10. It belongs to
`cobuilder-viewer/E2`, and its end is that the build owns the committed file. All five of
its criteria scored 1.0, so the mean is 1.00. C1 and C2 are the CRITICAL pair. C1 (the
build writes the committed file) scored 1.0: the build now writes
`plugins/artifact/viewer/index.html` itself, at 1,184,484 bytes with sha256
`0af3663ede577a0b9f8cad788dd5601832cd954562248fd6ee12a0b013dbd5c6`, and two builds wrote
byte-identical files. C2 (one edited byte fails the guard) scored 1.0: a single flipped
byte made the guard fail and name the offset. C3 (the build does not empty the plugin
root) scored 1.0, and the plugin root survives a build. C4 (the committed file still boots
and renders) scored 1.0 on a clean console. C5 (every named marker survives) scored 1.0,
and the six marker names reach the built file. Slice 3 failed the slice's own regression
check in two of its three clauses, and broke slice 1's seam. The last note under "Notes for
a fresh session" records both.

**Slice 4 ran on 2026-09-23 and 2026-09-24, and scored 1.00 on 2026-09-24**, weighted
0.10. It belongs to `cobuilder-viewer/E3`, and its end is that one typed model reads
the bundle. All four of its criteria scored 1.0, so the mean is 1.00 and the
contribution is 0.100. C1 (one module resolves every join) and C2 (the drift guard
fires on a rename) are the CRITICAL pair. One module under `src/data/` reads every
global the bundle defines and resolves every join, and no file outside it reads a
global or resolves a join. An independent TypeScript AST sweep over 126 non-test
files outside the data module proves that, and `PullRequest` and its branded
extension `OpenPullRequest` are each declared once. C3 (a level renders from the
typed model) scored 1.0, and a level renders this repository's own records with a
clean console. C4 (the model reads every global the bundle defines) scored 1.0.
The committed viewer carries sha256
`07c29308d9417eb83bb6a78c97adaf751890f5db226bbcd23a35c3ff168660e5`. The viewer suite
is 67 of 67 and the type check is clean, and the repository suite is unchanged at 9
failed, 378 passed, and 1 skipped.

**Slice 8 ran and was validated on 2026-09-24, and it scored 1.00**, weighted 0.10. It
belongs to `cobuilder-viewer/E5`, and its end is that one box is on screen, the strip,
the pager bar, and the two arrow keys move one index, and the pane reports no scroll at
all. All six of its criteria scored 1.0, so the mean is 1.00 and the contribution is
0.100. C1 (one box is on screen, and the pane does not scroll) and C2 (one index drives
the strip, the pager, and the arrow keys) are the CRITICAL pair. C3 (the strip's labels
come from the sections themselves), C4 (the arrow keys are guarded, and they never write
the route), C5 (a paged level drops the band and keeps the heading element), and C6
(Rubrics keeps the stacking shape) each scored 1.0. Eighteen of the nineteen new cases
passed on arrival, because the section model was ported into the shipped shell. The
committed viewer carries sha256
`658921c92ce8bdf9b77313d215b0dfb8571cade3a8e4163c4599c75566730061`, and the viewer suite
is 86 of 86. The repository suite is unchanged at 9 failed, 378 passed, and 1 skipped.

**Slice 9 ran and was validated on 2026-09-24, and it scored 1.00**, weighted 0.05. It
belongs to `cobuilder-viewer/E5`, and its end is that the strip reads how far through a
level a reader is. All five of its criteria scored 1.0, so the mean is 1.00 and the
contribution is 0.050. C1 (the reading is a position in the level) and C2 (the reading
never decreases on a forward walk) are the CRITICAL pair. Measured in a real browser, the
first section reads 0 at its top and 25 at its bottom, the second bottomed reads 50, and
the last bottomed reads 100. A forward walk reads 25, 50, 75, and 100, and it never
decreases and never resets. One step back reads 75. A box with no scroll range reads the
whole of its share. Scrolling a box leaves the pane, the window, and the track where they
were. Nine new cases live in `plugins/artifact/viewer/src/shell/LevelProgress.test.tsx`,
and the viewer suite is 95 of 95. The repository suite is nine failed, 378 passed, and one
skipped.

**Slice 14 was built on 2026-09-23, and it waits on the engineer.** The prototype is one
surface with two modes behind one control, and it lives at
`plugins/artifact/viewer/src/variations/flightdeck/`. Its dev entry serves it at
`http://localhost:5273/variations/flightdeck/dev.html`, and the two states a reader meets
are recorded beside it as `.mode-1-single-pull-request.png` and
`.mode-2-multi-design.png` in that same directory. Mode one reads this repository's own
pull request 2 from `.cobuilder-architect/self/`, and it shows the six parts of parity:
four narration levels with their narration, the three diagrams, the three scene-art
`webp` files, the three narration audio files, the diff, and the intent and assessment
sheet. Mode two draws the select-and-recommend path and states in three places that it is
a design rather than a shipped surface.

Its third regression clause holds, and the build proves it. `npm run build` in
`plugins/artifact/viewer/` wrote 1,184,484 bytes with sha256
`0af3663ede577a0b9f8cad788dd5601832cd954562248fd6ee12a0b013dbd5c6` before this work and
after it, and two builds after it wrote byte-identical files. The build's own guard agrees:
`tests/test_viewer_build.py::test_two_builds_produce_the_same_bytes` passes and prints that
hash. `tests/test_viewer_modes.py::test_export_artifact_parses_updated_viewer` and the four
marker cases stay red, which is slice 3's recorded export-seam gap, and the four webp cases
stay red from the Pillow fault. Nine cases fail and 378 pass, which is the state this
branch already carried.

The clause nearly failed, and the cause is worth keeping. The prototype's modules never
reach the shipped graph, because nothing imports them. Its class names did. Tailwind scans
every file under `src/`, so twenty-three utility rules that only this variation's markup
named were emitted into the build's stylesheet and moved the hash by 1,836 bytes. The
repair is a rule for any later variation in this directory: use only class names the
shipped stylesheet already holds, and reach for an inline style when a value has no
existing utility. The prototype keeps a few inline widths and heights for that reason, and
each one is commented where it sits.

**The score and the approval are the engineer's, so this row stays `pending`.** The work
is complete and the evidence above is recorded, and the rubric's fourth criterion asks for
a decision the session cannot give itself. The engineer opens the two screenshots or the
dev URL, and answers whether the surface is right. A follow-up run writes that answer, its
date, and this location into this file and into the ladder at
`docs/plans/cobuilder-viewer/04-slices.md`.

## Escalated

**Slice 1 is escalated.** Its two CRITICAL criteria are C1 and C2. C2 passes, and C1 cannot
be scored, because every Artifact call in this session is refused while the session holds
`ANTHROPIC_AUTH_TOKEN`. The
implementation is complete and committed as `d44cc24`, and its two locally scorable
criteria pass. A later session that logs in with the subscription account can score C1 and
C4 without touching the code.

No other slice scored below its threshold, so nothing else escalated.

## Notes for a fresh session

**Gate 4 cleared on 2026-09-25.** The engineer approved the four Gate 4b epic technical
solution designs for E2, E5, E7, and E19 with one word, "Approved". That word covers the
four designs, and the instruction to build the slices gives it force. So the 4b line, the
4c line, and Gate 4's own line now read approved on that date. The gate script exits 0,
and the command is
`uv run plugins/implement/scripts/verify_gate.py --plan docs/plans/cobuilder-viewer`.
`verify_gate.py` reads the 4b line in this file for its `design.approved` key. It reads no
other approval record. That line is therefore the one the gate depends on.

**The engineer approved slice 14, and its artifact is the FlightDeck prototype.**

The prototype lives at `plugins/artifact/viewer/src/variations/flightdeck/`. The engineer
read it at `http://localhost:5273/variations/flightdeck/dev.html`, and approved it on
2026-09-25. The prototype shows one work item as two accounts. Build reads the program's
account, and Review reads the change's account.

The checklist line and the ladder row in `04-slices.md` describe this slice. Neither one
carries the approval yet. The checklist's `score:` cell and the ladder's State cell stay as
they are, because the validator's score is not in yet. A separate step writes both. The
wait the "run order changed" note below declares is therefore over, so a session may run
slices 15, 16, and 17.

**Slice 18 joined the board on 2026-09-25, and the weights moved with it.**

The engineer asked for one more item. A reader must reach a design together with its pull
request, and a pull request that belongs to no design. Slice 18 answers both. The board
carries a pull request with no design as a row of its own, beside the design rows. That
row's status is the pull request's own state, `open` or `merged`. A tab strip filters the
board by status. The word PR names the row's kind and never its status. `04-slices.md`
states the slice's end in full. Its rubric is
`.cobuilder/rubrics/cobuilder-viewer/slice-18.md`.

The slice keeps the number 18, at the end of the ladder, and no slice moved.

Its weight is 0.05, and three slices that have not run give it up. Slice 10 falls from 0.11
to 0.09, slice 15 from 0.10 to 0.08, and slice 16 from 0.04 to 0.03. The sum is still 1.00.
For slices 10 to 17, this note supersedes the weight list in the "E7's ladder changed" note
below.

Every slice already recorded at a score keeps its weight, so its contribution stands.
Slice 1 contributes 0.030. Slices 2, 3, 4, 5, 6, 7, 8, and 9 contribute 0.080, 0.090,
0.090, 0.040, 0.060, 0.040, 0.090, and 0.040. Those nine slices contribute 0.560 in total.

**E7's ladder changed on 2026-09-25, and the weights moved with it.**

The engineer approved a new model for one work item and the pull request its own
epics carry. The two are two accounts of one surface. Build reads the program's
account. Review reads the change's account. The same three section names appear in
both, so a reader crosses between the two on a section of the same name.

Slices 15 and 16 now read against that model, and they keep their numbers. Slice 17
is new. It owns the account mark, a word and a glyph with no fill, and the jump
across. No slice changed its number. The numbers are build order, and both the
rubrics and this file reference them.

ADR-0029 changed again on 2026-09-25, during this re-cut. The rubrics carry what it
fixes. The rename of `landscape` to `intent` runs with slice 15's parity work. The
rail's fold and its arrow walk obey one convention, and slice 16 carries that
convention because it owns the rail. The change's File Diffs section renders the
diff, and the fate of the narration level `file_changes` stays open.

The sum is still 1.00. Slices 1 to 8 now weigh 0.06, 0.08, 0.09, 0.09, 0.04, 0.06,
0.04, and 0.09. Slices 9 to 17 now weigh 0.04, 0.11, 0.04, 0.03, 0.03, 0.02, 0.10,
0.04, and 0.04. Every score already recorded stands. A weight that moved carries
that score's contribution with it.

Slice 1 scored 0.50 and contributes 0.030. Slices 2, 3, 4, 6, 7, 8, and 9 each
scored 1.00. They contribute 0.080, 0.090, 0.090, 0.060, 0.040, 0.090, and 0.040.
Those eight slices together contribute 0.520, against 0.610 before the re-cut. An
accepted slice therefore keeps its score and loses part of its weight. The change's
account now carries more of the program than the two slices it replaced.

**The engineer accepted the publish seam as a scoped gap on 2026-09-25.**

Five tests stay red. `export_artifact.py` looks for a sibling data `<script src>`
block and a Mermaid CDN tag, and the React build emits neither. The five are
`tests/test_viewer_modes.py::test_export_artifact_parses_updated_viewer`, plus four
marker cases in `tests/test_export_artifact_markers.py`.

The engineer said the publishing seam is not something they care about. They
accepted the gap rather than a repair. No slice in this ladder owns it, and nothing
schedules it. E16 owns publish parity, and E16 stays deferred.

A later session must not read those five red cases as a slice's unfinished work. Do
not schedule a repair for them.

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
which ADR-0023's build owns. The engineer settled what E4's artifact is on
2026-09-25: the Work surface itself, the ported shell. The slice 5 record above
states that, and these two variations are the scaffolding E4 left behind.

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

**The built viewer reads its data at a relative path, and the dev server mounts a bundle
at an absolute one.** `src/data/bundle.ts` sets `BUNDLE_MOUNT` to `/bundle/` under
`import.meta.env.DEV` and to `../` otherwise, so a dev page reads
`/bundle/data/index.json` and a built page reads `../data/index.json` beside itself.
`src/index.html`'s marker seam carries the same `../data/` string. A built file therefore
resolves its own data when a bundle root sits above it. E2's fix landed in slice 3, so the
build writes the committed `plugins/artifact/viewer/index.html`.

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
`cobuilder-family` rubrics, not this plan's own, and all eighteen of this plan's rubrics are
absent from the viewer. The generator also holds `RUBRIC_COUNT` as the module constant `14`
at line 33, and `read_rubrics` loops `range(1, RUBRIC_COUNT + 1)`. So even a run with
`--rubrics .cobuilder/rubrics/cobuilder-viewer` would drop slices 15, 16, 17, and 18 in
silence, and would print no warning. A later session should derive the count from the files
present, and derive the default rubrics directory from the plan's slug. Neither is changed
here.

**Publishing is blocked in any session that holds `ANTHROPIC_AUTH_TOKEN`.** The Artifact
platform refuses every call, because that variable takes precedence over a claude.ai
account. Unset it, then run `/login` and choose the subscription account. This blocks
slice 1's C1 and C4 today, and it will block E16's publish parity later. E16 is
deferred, and it carries no slice today.

**The run order changed on 2026-09-23, and the slice numbers did not.** After slice 3,
the next slices to run are 14, 15, 16, and 17, ahead of 5 and 10 through 13. The rest of
the ladder keeps its order after those four. The numbers stay as the ladder writes
them, so do not renumber a slice. The engineer moved those slices forward because slice
3 makes the committed `plugins/artifact/viewer/index.html` the React application, and
slice 15 is where that application can tell a pull request's story. Slice 14 ends in an
approval, so the run stops there and waits for the engineer before slices 15, 16, and
17. `04-slices.md` states the reason in full under "Why this order".

**Slice 3 failed its regression check, and the guard itself carried a real defect.** The
slice's regression check carries three clauses. Clause 2 holds, because no file outside the
slice scope changed. Clause 1 and clause 3 do not hold. Ten cases that passed at the
pre-slice commit `39c1065` fail after it. Five of those cases asserted the legacy
hand-written viewer's markup: four are now rewritten against the React shell, and one is
skipped with a message naming slice 10, all committed in `f42809d`. The other five are the
export seam, and they stay red. Clause 3 fails because a publish of the newly built file
does not run. The exporter matches a sibling data `<script src>` block and a Mermaid CDN
tag, and the React build carries neither, so it stops with its own message, exits 1, and
writes no file. The engineer accepted no publishing parity on 2026-09-23, so publishing the
React viewer is a recorded, scoped gap. The engineer accepted that gap again on 2026-09-25,
and the note above the slice list records what it covers. Slice 3 therefore broke slice 1's four marker
tests, so E1's seam is unmet again on this branch. E1 was sequenced before E2 precisely to
prevent this.

**The validator found a real defect in the byte guard, and the fix shipped.** The guard
read the committed file when it ran rather than when the file was collected. A sibling
case's build therefore healed a hand edit, and the whole-file run reported a pass on an
edited viewer. The committed bytes are now read once at collection.

**Two affordances the React viewer does not carry.** A boundary finding no longer
advertises itself as a decision candidate, and an `n/a` gate renders like a `pending` one
with no approved-gate count. Slice 10 owns the surface for the second, and slice 10's
rubric does not require the claim, so it is unowned by rubric.

**The six markers reach the build through a classic inline script in `src/index.html`.**
They do not travel through a bundled module, because the minifier strips `//` comments and
esbuild's TypeScript transform strips them from a `.ts` module even unminified. Turning
minification off instead would cost 1,261,969 bytes.

**The engineer resolved C4's scope by fixing the cause, not by choosing a reading.** Six
prototype files each carried a reader of a bundle global, and thirteen resolved joins
themselves. `src/Variations.tsx` imported every prototype statically, so their code and
their duplicate Sheet, panel, atoms, and markdown copies shipped. All of that is gone:
every prototype now reads through `src/data/`, each has its own dev entry, and the
shipped viewer fell from 1,183,959 bytes to 727,197, which is 456,762 bytes, or 38.6
percent. Both C1's and C4's checks now run over all of `src/` with no exclusion, and
both pass.

**C2's type guard is inert, and a reader should not mistake the passing case for the
guard firing.** Because `OpenPullRequest` is an intersection with `PullRequest`,
`Exclude<keyof PullRequest, keyof OpenPullRequest>` is structurally always `never`, so
it can never fire. A renamed field still fails `tsc` and names the field, but through
consumers that read the field, not through the guard.

**A defect was found in the scan underneath both absence criteria.** The comment
projection tracked quotes by hand, and a regex literal holding a backtick desynced it.
C1 counted a JSDoc comment as a join resolution, and C4 was passing partly by accident,
with six comment lines in `src/variations/flightdeck/model.ts` read as code. The
projection now runs through the TypeScript parser, so both criteria are computed rather
than lucky.

**A word in a comment can move the shipped bytes, and it has happened twice.** Tailwind
scans every file under the Vite root and reads any identifier it finds as a candidate
utility class, comments included. The word `invisible` emitted a rule worth 29 bytes, and
the word `shadow` in a comment in the new slice 9 test file emitted one worth 244 bytes,
which broke the build guard and moved the repository suite from nine failures to eleven.
The second is the one to remember, because it made an untracked test file stale the
committed viewer, and it took a validator two runs to establish that the extra failures
were not pre-existing. Test files are now excluded from Tailwind's scan by two
`@source not` lines in `plugins/artifact/viewer/src/index.css`, one per test extension. Do
not widen that exclusion to `src/variations/`: those prototypes share this stylesheet
through the dev server.

**Two plan-slug rules coexist.** `src/data/works.ts`'s `planSlugFor` serves the shell,
and `src/variations/epic-first-mosaic/data.ts`'s `planSlugs` serves that prototype; the
second skips a slice-id prefix equal to the design id and excludes `interaction_design`,
which the first does neither. C1 permits it. If the two ever disagree about a real plan,
the shell and that prototype will disagree, and nothing today would report it.

**`src/variations/record-mosaic` crashes on a design row, and it did so before this
work.** Its tile reads `entry.publication.published_at.slice(0, 10)` unconditionally,
and the index carries two publications with `published_at: null`. Reproduced identically
on the parent commit. The prototype is unusable past its board. No shipped output
carries it. Fixing it is not scoped to any slice today.

**The ported shell already carried most of this slice's contract.** Eighteen of the
nineteen cases passed on arrival, because the section model was ported. Only the
level-change focus was broken. A later slice in this epic should expect the same: check
what the port already does before assuming a criterion needs building.

**The focus defect, and why no route-triggered fix could work.** On a level change, focus
landed on the heading of the level the reader was leaving and then fell to `<body>`.
`AnimatePresence` in wait mode keeps the outgoing subtree mounted until its exit
animation finishes, so one frame after the route change the document holds exactly one
`h1` and it belongs to the outgoing level. The id is therefore ambiguous during the
transition, and the lookup itself had to move to the moment the right element exists. The
fix lives in `src/shell/hooks.ts` as a hook that focuses on mount, and the move is owned
by the arriving heading inside the keyed subtree. A delay was rejected because the exit
duration is a token, 200 milliseconds and zero under reduced motion.

**A probe that does not clear focus first can read the bug as a success.** The pre-fix
tree holds focus on the outgoing heading for the exit's duration before falling to the
body. Measured in a real browser, the pre-fix run is body, then the outgoing heading
`Intent`, then body. The post-fix run is body, then the rail link the reader pressed,
then the incoming heading `Architecture`, which holds.

**This slice's page-level claims were scored in a real browser, not carried as a class
contract.** The pane reported `scrollHeight` equal to `clientHeight` on all four paged
levels, exactly one box sat inside the pane's rectangle on each, and the track's transform
stepped by one box width. A later slice should do the same where a browser is reachable,
because jsdom has no layout engine and reads every height as zero.

**One piece of this slice's evidence cannot be driven end to end.** The rubric asks to
rename a section's heading and read the strip. No record field feeds a paged section's
title; all twelve are string literals in the panels, so a record rename cannot reach the
strip on any paged level today. The claim was driven through the live DOM instead, which
is the change a rename would produce.

**A real `Alt` or `Meta` arrow key is a browser history command** and navigates away from
the app, which the app does not consume and is not meant to. The modifier guard was
therefore measured with a real `Shift` arrow and with synthetic modified keydowns read
against `defaultPrevented`.

**Slice 9 had no failing case.** All nine cases passed on arrival, because the ported shell
already satisfied the slice. The file's value is that each claim now fires when it breaks:
inverting the reading fails eight of the nine, and reducing the progress effect's
dependencies to the box ref alone fails exactly one case. That one case is the
frozen-container trap, where the strip resolves its box once at mount and never re-reads
the arriving one, and it is invisible to every other case because a box with no scroll
range reads the same either way.

**`src/index.css` is not itself scanned by Tailwind**, proved with probes, so prose in that
stylesheet is safe. A CSS comment in it cannot contain a `**/` glob, because the glob
contains the comment's own closing sequence and ends the comment early.

**The rubric's regression clause names a file that does not exist.** It calls for every
case in `tests/test_sections.py`, and no such file is anywhere in the repository. Slice
8's cases live in the viewer suite instead, at `src/shell/Pager.test.tsx`.

**One evidence line in the rubric is ambiguous.** Its C1 reads "Step to the second section
and read. It is 50", but an arriving box sits at its top and reads 25 until it is bottomed,
and C1's own earlier lines say each box is bottomed. The slice scored 1.0 with the bottoming
protocol. The rubric is a blind instrument written before the implementation, so it is not
amended; a later validator should apply the protocol the other lines use.
