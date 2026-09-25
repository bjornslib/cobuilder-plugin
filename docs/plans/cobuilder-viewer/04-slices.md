# Slices: cobuilder-viewer

Gate 4a. One line per slice, in build order. Every slice ends in a working,
testable state, and every slice declares the epic it advances.

Test command: `uv run --with pytest pytest tests/ -v`

The viewer slices 6 to 13 carry two runners. `npm test` in `plugins/artifact/viewer/`
runs their component cases through vitest. The page-level claims in their rubrics need
a served bundle and the ChromeDevTools MCP tools, and no runner in this repository holds
them yet.

Rubrics: `.cobuilder/rubrics/cobuilder-viewer/slice-N.md`, written before any
implementation exists.

## What makes a slice here

**A slice is vertical when it ends in something observable.** That is the one test,
and the count follows from the work rather than the other way round.

An observable end is a state a reader can see or a test can assert. "A pull request
that already has a description is left alone" is one. "Add the validation" is not,
and neither is "wire the types": they name a layer, and a layer is not a state.

So a slice here crosses every layer it needs, however thinly. Slice 1 reaches from
source into a published Artifact, and it carries no new user-facing behaviour at all.
The plan allows that, because its end is observable: a publish still works.

**The count is the number of observable ends the epic has.** One is a real answer.
Four epics here carry exactly one slice, because their whole outcome is one end
state. Where an epic has two ends, it gets two slices, and the second is never "the
edge cases". Edge cases belong to the slice whose end they threaten.

**A slice is not a layer, and this is where that shows.** An earlier draft of this
plan used a three-slice template: tracer bullet, then happy path, then edge cases.
That template cuts horizontally and it inflates Gate 4b, because every epic with
more than one slice owes a technical solution design. It is gone. What decides a
slice here is one question: what can a reader see when this slice is done?

## The scope cut of 2026-09-22

The engineer narrowed this program to two surfaces: the Work surface, and the
current pull request viewer renamed to FlightDeck at parity. Eleven epics left the
build on that date, and they are deferred rather than deleted or renumbered: **E8,
E9, E10, E11, E12, E13, E14, E15, E16, E17, and E18.** Each one carries
`state: "deferred"` in `goal.json` with the reason on the epic. They hold the
Reference surface, the describe-on-arrival path, the whole multi-pull-request mode
and its merge-order simulation, the ledger and its audit, the path runner, publish
parity, the workflow-polish carryover, and the feedback path. They are named in the
table below with no slices under them, so this ladder still says what was cut.

Eight epics remain in scope and carry the eighteen slices below: E1, E2, E3, E4, E5,
E6, E7, and E19. The ladder was re-derived rather than copied. A slice survives only
where its end still belongs to the narrowed program, and one slice moved from E5 to
E19 because the shell now lands somewhere. Slice 18 joined the ladder on 2026-09-25.

## The ladder

Eight epics carry eighteen slices. Four carry more than one, and those four owe a
Gate 4b design before their slices build: E2, E5, E7, and E19. Four carry exactly
one: E1, E3, E4, and E6, and three of those four are the prototype epics, whose
single end is an approval.

Slice numbers run in build order. **This is not the table order.** The table groups
slices under the epic they advance, and E19 builds before E5, so the numbers step
out of epic order once. Build order is slice 1, then 2 and 3, then 4, then 5, then 6
and 7, then 8 through 13, then 14, then 15, 16, and 17, then 18.

Three dependencies set that order. E1 before E2, because the exporter's markers
exist before the build changes how the file is produced. E3 before E19, because the
board reads the typed model. E19 before E5, because the board is the surface that
opens a work item, and E5's sections render inside one.

| # | Epic | Slice | Ends with | Score | State |
|---|---|---|---|---|---|
| | **`cobuilder-viewer/E1` — The exporter seam.** `export_artifact.py` matches named markers the build emits on purpose, so a publish survives the build changing its output. | | | | |
| 1 | `cobuilder-viewer/E1` | **Tracer bullet: a publish survives a marker rename** | The exporter matches the built file's named markers, and a real publish of the current viewer still succeeds after the marker names move | — | pending |
| | **`cobuilder-viewer/E2` — The build pipeline.** The toolchain reproduces the same bytes, then `npm run build` produces the committed `index.html` and a test rebuilds it and fails on any difference. | | | | |
| 2 | `cobuilder-viewer/E2` | Two builds produce the same bytes | Two builds from the same lockfile on the same machine produce the same bytes, so the byte-equal guard is possible at all | 1.00 | completed |
| 3 | `cobuilder-viewer/E2` | The build owns the committed file | The build reproduces `plugins/artifact/viewer/index.html` byte for byte, and one edited byte makes the rebuild test fail | 1.00 | completed |
| | **`cobuilder-viewer/E3` — The typed data layer.** One module reads the six window globals and `index.json`, resolves every join, and declares `PullRequest` and its branded extension `OpenPullRequest`. | | | | |
| 4 | `cobuilder-viewer/E3` | One typed model reads the bundle | A level renders from `index.json` with no join derived in a component, and a field renamed on `PullRequest` and not on `OpenPullRequest` fails the type check | 1.00 | completed |
| | **`cobuilder-viewer/E4` — The Work prototype.** A detailed prototype of the Work board, against this repository's own design records, reviewed before E5 starts. | | | | |
| 5 | `cobuilder-viewer/E4` | The Work prototype, reviewed | The Work surface itself, the ported shell, reads this repository's own records, and the engineer approved it rather than naming a change | 1.00 | completed |
| | **`cobuilder-viewer/E5` — The Work surface.** The program's account: every row it holds, and the sections each row pages, including a design whose records are `goal.json` only. ADR-0028 owns the shape. | | | | |
| 8 | `cobuilder-viewer/E5` | The section model | One box is on screen, the strip, the pager bar, and the two arrow keys move one index, and the pane reports no scroll at all | 1.00 | completed |
| 9 | `cobuilder-viewer/E5` | The level's progress | The strip reads 0 at the first section's top, 25 percent at its bottom, 50 on the second, 100 on the last, and never decreases on a forward walk | 1.00 | completed |
| 10 | `cobuilder-viewer/E5` | Every level renders its own sections | A reader walks Intent, Problem & Solution, Architecture, Epics, and Rubrics, and each row renders its sections | — | pending |
| 11 | `cobuilder-viewer/E5` | The diagram tiles open their drawing | A tile shows the drawing's miniature scaled to its box, a press opens it whole with zoom from 50 to 400 percent, Escape and the backdrop close it, and a failed render shows the authored source | — | pending |
| 12 | `cobuilder-viewer/E5` | A record opens in the Sheet | Pressing a decision, a boundary rule, or an epic's design opens the whole record, and a part link scrolls the record and moves focus to that heading | — | pending |
| 13 | `cobuilder-viewer/E5` | A goal.json-only design renders | One of the seven sparse designs shows every level it can fill, and the rail gates the levels it cannot | — | pending |
| | **`cobuilder-viewer/E6` — The FlightDeck prototype.** One work item read as two accounts, with the rail grouped under Build and Review, reviewed before E7 starts. | | | | |
| 14 | `cobuilder-viewer/E6` | The FlightDeck prototype, reviewed | One work item renders as two accounts, the change's account at parity, and the engineer approves it | — | pending |
| | **`cobuilder-viewer/E7` — FlightDeck, one pull request.** The change's account of one work item: the pull request its own epics carry, read at parity with today's viewer, in its own sections beside the program's and at an address of its own. | | | | |
| 15 | `cobuilder-viewer/E7` | The change's account renders | A reader of a work item reads the change's Intent, Problem & Solution, Architecture, and File Diffs sections, each from that pull request's own records, at parity with today's viewer | — | pending |
| 16 | `cobuilder-viewer/E7` | The rail reads two accounts, each at its own address | The rail groups its rows under Build and Review, `#/<work>/pull-requests/<pr>` opens the change's Intent section, one appended segment selects a named section, the row that opens the reader's address reads current, and the rail's fold and its arrow walk obey one convention | — | pending |
| 17 | `cobuilder-viewer/E7` | The account mark, and the jump across | Every section of both accounts carries its account's mark, a word and a glyph with no fill, and a press moves from one account's section to the other account's same-named section | — | pending |
| | **`cobuilder-viewer/E8` — The Reference prototype.** Deferred on 2026-09-22, and carries no slice. | | | | |
| | **`cobuilder-viewer/E9` — The Reference surface.** Deferred on 2026-09-22, and carries no slice. | | | | |
| | **`cobuilder-viewer/E10` — Describe on arrival.** Deferred on 2026-09-22, and carries no slice. | | | | |
| | **`cobuilder-viewer/E11` — Read the open set.** Deferred on 2026-09-22, and carries no slice. | | | | |
| | **`cobuilder-viewer/E12` — Simulate and replay the routes.** Deferred on 2026-09-22, and carries no slice. | | | | |
| | **`cobuilder-viewer/E13` — Narrate and render the route.** Deferred on 2026-09-22, and carries no slice. | | | | |
| | **`cobuilder-viewer/E14` — The ledger and the audit.** Deferred on 2026-09-22, and carries no slice. | | | | |
| | **`cobuilder-viewer/E15` — Execute the path.** Deferred on 2026-09-22, and carries no slice. | | | | |
| | **`cobuilder-viewer/E16` — Publish parity.** Deferred on 2026-09-22, and carries no slice. | | | | |
| | **`cobuilder-viewer/E17` — The workflow-polish carryover.** Deferred on 2026-09-22, and carries no slice. | | | | |
| | **`cobuilder-viewer/E18` — The feedback path.** Deferred on 2026-09-22, and carries no slice. | | | | |
| | **`cobuilder-viewer/E19` — The Work board.** New in round 3. The shell lands on a board of every design in the bundle, each row stating the item's stage and which records it holds, and a row opens that item's Work surface. Slice 18 extends the board on 2026-09-25. It adds a pull request that belongs to no design as a row of its own. A tab strip filters the board by status. | | | | |
| 6 | `cobuilder-viewer/E19` | The shell lands on the bundle's designs | Opening the viewer with no work item named shows every design as a row, each row stating its stage and the records it holds, and no error state | 1.00 | completed |
| 7 | `cobuilder-viewer/E19` | A row opens the item's Work surface | Pressing a row lands on that item's Work surface at its first level, with the route naming the item | 1.00 | completed |
| 18 | `cobuilder-viewer/E19` | A pull request with no design is a row of its own | A pull request with no design reads as a row of its own, its status is its own state, and the tabs filter by status | — | pending |

## Why this order

**Slice 1 is the tracer bullet, and it carries no new behaviour.** It runs the whole
path the program depends on: source, the build, the marker seam, the exporter, and a
real publish. Nothing about that path is new to a reader, and everything about it is
new to the build. That is the point of a tracer bullet.

**E1 lands before E2.** The exporter rewrites the built file by matching named
markers. A build that changes how that file is produced, published before the seam
exists, breaks publishing silently.

**E19 lands before E5.** The board is where the shell can first show a design, and it
is the surface that opens a work item. E5's sections render inside the item the board
opened, so a board that lands later would leave E5's slices with no screen to land
on.

**E5's sections come before E7's change's account.**

The change's account renders through the same section model the program's account
uses. That model puts one section on screen at a time. A slice that lands before the
model exists has no frame to render in.

**The shipped rail's grouping lands with the change's account, and never before it.**

The engineer approved the rail's two groups on 2026-09-25. Build holds the program's
account, and Review holds the change's account. Slice 16 lands the grouping in the
shipped shell, because it owns the rail. A grouping that landed first would leave the
Review group holding four rows that render nothing, so it travels with the account
that fills it. Slices 10 through 13 therefore run against the grouped rail rather than
against the flat list of six. Their numbers stay as the ladder writes them, and each
one keeps the end state it declares.

**Two answers the E2 spike used to seek now belong to deferred work.** The spike
still settles whether the build can be byte-equal, which is what slice 3 guards. The
published-Artifact size question and the Mermaid-injected-after-load question belong
to E16 and to E18, and both are deferred.

**A slice ends observable, so a slice can be large.** Slice 10 walks six sections.
Four epics here carry one slice each, and none of them hides a second end.

**The run order changed on 2026-09-23, and the slice numbers did not.** After slice
3, the next slices to run are 14, 15, 16, and 17, ahead of 5 and 10 through 13. The
rest of the ladder keeps its order after those four. The numbers stay as the ladder
writes them, so do not renumber a slice.

**Slice 3 makes the committed file the React application, and that application
carries no pull request story yet.** The build writes
`plugins/artifact/viewer/index.html`, so that file becomes the React application.
Measured on 2026-09-23, the legacy hand-written file is 249,710 bytes and the build
writes 1,184,484 bytes, of which about 6,800 bytes are the marker seam. The
application's Pull requests panel lists pull requests. Nothing
under `plugins/artifact/viewer/src/` reads a pull request's narration levels, its
art, its audio, or its diffs. Slice 15 adds those. Between slice 3 and slice
15, a bundle served from this branch would show a pull request with no story to
tell. The engineer chose to shorten that window rather than leave parity last.

**The run stops at slice 14 and waits for the engineer.** Slice 14 ends in an
approval, so the rubric puts the next step in the engineer's hands. Slices 15, 16,
and 17 wait on that answer, and no run reaches them without a human step between.

**E7's ladder was re-cut on 2026-09-25, and the slices kept their numbers.**

The engineer approved a new model for one work item and the pull request its own
epics carry. The two are two accounts of one surface, and a reader crosses between
them on a section of the same name. Slices 15 and 16 now read against that model, and
they keep their numbers. Slice 17 is new. It carries the account mark and the jump
across. No slice moved. `00-status.md` records the reason and the weight change the
re-cut made.

**Slice 18 runs last, and its number says so.** The board's own slices, 6 and 7, land
early, and a design row opens a work item. Slice 18 adds a row for a pull request that
belongs to no design. That row needs the surface which reads a pull request's own records,
and E7's three slices land that surface. The slice therefore takes the number 18, at the
end of the ladder, and no slice moved to make room for it.

## Out of scope for this ladder

- Everything the eleven deferred epics hold, until the engineer brings one back.
- Any change to what the generation scripts write into the bundle. The design reads
  the bundle, and it does not reshape it.
- A new record type, a new join, or a schema version bump beyond `OpenPullRequest`.
- The diff view's own rendering, which the team ports as it stands.
- `--format notion`, which stays a reserved flag value.

## Escalation

`max_attempts: 3` per slice, then escalate rather than loop. The session records an
escalated slice in `00-status.md` with the reason and the follow-up, and it never
accepts one below threshold in silence.
