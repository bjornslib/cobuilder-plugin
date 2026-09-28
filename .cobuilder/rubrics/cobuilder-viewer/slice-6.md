# Rubric: Slice 6 — the shell lands on the bundle's designs

Feature: cobuilder-viewer
Epic: cobuilder-viewer/E19
Slice goal: Opening the viewer with no work item named shows every design as a row, each row stating its stage and the records it holds, and no error state
Test command: `npm test` in `plugins/artifact/viewer/` runs the board's own cases
through vitest. The page criteria below need a served bundle and the ChromeDevTools MCP tools.

Serve the bundle before any browser check: `python3 -m http.server` rooted at
`.cobuilder-architect/self/`, which is the parent of `viewer/`. Open
`plugins/artifact/viewer/dist/index.html` through the dev server at port 5273, or the
built file beside the bundle. The bare route is `#/`.

## Criteria

### C1 — The bare route is the board, and the rail returns to it [CRITICAL]
**Must be true:** A reader opens the viewer with no work item named and sees the board, not an error. The rail's top entry named `Work` opens the board from any level.
**Evidence to check:**
- With the ChromeDevTools MCP tools, open `#/`, take a snapshot, and read the pane. It holds a list of rows and no error text. The heading reads `Work`.
- Open one design's level, press the rail's `Work` entry, and take a snapshot. The board renders again.
**Scoring:**
- 1.0 — the bare route renders the board, and the rail's entry returns to it from a level.
- 0.5 — the bare route renders the board and the rail entry does not, or the rail entry works and the bare route shows an error.
- 0.0 — the bare route renders the unknown-id error, or no board renders at all.

### C2 — Every design in the bundle appears, one row each [CRITICAL]
**Must be true:** The board lists every design the record index carries. One design gets one row. No design goes missing, and none appears twice.
**Evidence to check:**
- With the ChromeDevTools MCP tools, count the rows in the board's list. Read `data/index.json` and count `entities.design`. The two numbers are equal.
- The key above the list states the same count in words.
**Scoring:**
- 1.0 — the row count equals the design count, and the key states it.
- 0.5 — the count is short by a design, or the key disagrees with the rows.
- 0.0 — the list is empty, or it lists fewer than half the designs.

### C3 — A row carries the item's stage and its record signature [CRITICAL]
**Must be true:** Each row states the design's stage, and it carries six record marks, one per authored record kind, in the same order on every row. A record that does not exist still gets a mark.
**Evidence to check:**
- Take a snapshot of the board and read one row. It states the stage the design records in `data/index.json`.
- Count the marks in that row: six, in the order `goal, intent, narrative, assessment, pr-draft, diagrams`.
- Read the row's record count chip. It equals the number of marks whose record exists, whole or in part.
**Scoring:**
- 1.0 — the stage, the six marks, and the count chip all match the record.
- 0.5 — the stage or the marks render and the count chip disagrees, or a row hides a mark for an absent record.
- 0.0 — a row carries no stage, or fewer than six marks.

### C4 — An absent record keeps its mark, and it reads apart from a present one
**Must be true:** A record that does not exist keeps its mark, and that mark is visibly distinct from a mark for a record that exists. A reader can tell the two apart without colour.
**Evidence to check:**
- Find a design with no records and one with all six. Take a screenshot of both rows.
- Read the marks' computed styles. An absent mark takes a dashed border and a shape marker beside it. A present mark takes a solid border and no marker.
- Read a mark's tooltip. It names the record and its readiness, and a `partial` mark names the empty part.
**Scoring:**
- 1.0 — an absent mark renders. It differs in fill and in shape from a present one, and it states the record and the state in its tooltip.
- 0.5 — the mark renders and the difference rests on colour alone, or the tooltip names no record.
- 0.0 — an absent record renders no mark, or the row hides it.

### C5 — A sparse design renders without erroring [CRITICAL]
**Must be true:** A design whose only record is `goal.json` gets a row, and opening the board with that design in the bundle raises no error. Seven designs in this repository carry one record.
**Evidence to check:**
- With the ChromeDevTools MCP tools, open the bare route and read the console messages. No error and no warning from the board.
- Read the rows for `inflight-record-store`, `maintainable-viewer`, `gate-state-resolution`, `interaction-design-gate`, `lean-bundle-diffs`, `ubiquitous-language`, and `build-workflow-polish`. Each renders a row.
- Read one sparse row's goal mark tooltip. Five of the seven record `challenge_stage_run` false, and their goal reads `partial` naming design mode's stages 2 to 7. Two record it true, and their goal reads `present`. The rule follows the recorded field, so both readings are correct for the row you read.
**Scoring:**
- 1.0 — all seven render, no console message appears, and a goal mark whose design records `challenge_stage_run` false names the missing part.
- 0.5 — all seven render and a goal mark whose design records `challenge_stage_run` false reads `present`, or one of the seven is missing from the list.
- 0.0 — an error appears, or a sparse design crashes the board.

### C6 — The order follows the lane rule, and the last design reads last
**Must be true:** The board lists the work that waits on somebody first, and a superseded design last. Every row states its own stage, so the order is never the only thing telling a reader where an item stands.
**Evidence to check:**
- Read the stages down the board against the rule: `backlog`, `decided`, `approved`, `review`, `implemented`, `superseded`. The ranks never step backwards.
- Read the row positions of the four superseded designs in this bundle. Each sits after every live stage.
- Find a stage outside that vocabulary in a fixture, if one exists, and confirm it sorts last rather than disappearing.
**Scoring:**
- 1.0 — the order holds, superseded designs read last, and an unknown stage still renders.
- 0.5 — the order holds and an unknown stage drops out of the list.
- 0.0 — no order holds, or a design becomes unreachable because of its stage.

### C7 — The board draws no strip, no pager, and no progress strip
**Must be true:** The board is not a paged level. It draws no section strip, no pager bar, and no level progress bar. It draws no reading-progress strip and no section-link bar either.
**Evidence to check:**
- With the ChromeDevTools MCP tools, take a snapshot of the bare route. Assert no `progressbar` role, no `Sections of this level` navigation, no `Sections on this page` navigation, and no Previous or Next control.
- Scroll the page. The pane owns the scroll: the document's `scrollHeight` equals its `clientHeight`, and the pane's does not.
**Scoring:**
- 1.0 — none of the four controls renders, and the pane owns the scroll.
- 0.5 — one of them renders, or the document scrolls as well as the pane.
- 0.0 — the board renders a strip, a pager, or a progress bar, or the document scrolls.

### C8 — No hover, focus, selected, or active state fills with the heading colour
**Must be true:** A row's hover and focus states stay in the light tint family. None of them fills with the heading colour, which would make a row read as a heading.
**Evidence to check:**
- With the ChromeDevTools MCP tools, hover one row and read its computed `background-color`. It is `--surface-2` or another light tint, never `--band`.
- Focus one row by keyboard and read the same property. The focus ring uses `--ring`, and the fill stays in the tint family.
**Scoring:**
- 1.0 — no row state fills with `--band`, and the focus ring is visible.
- 0.5 — a state fills with a colour close to `--band`, and the reader can still tell it apart from a heading.
- 0.0 — hover or focus fills with `--band`.

### C9 — The unknown-id route keeps its own error
**Must be true:** A route that names a work item the bundle lacks still renders the error that says so. The board did not swallow that address.
**Evidence to check:**
- With the ChromeDevTools MCP tools, open `#/no-such-design`, take a snapshot, and read the pane. It holds the error naming the missing id and the count of designs the index resolved. No row list renders.
- Read the rail. It still renders, and the board is one press away.
**Scoring:**
- 1.0 — the error renders, names the id, and no board renders on that route.
- 0.5 — the error renders without naming the id.
- 0.0 — the board renders for an unknown id, or the pane is blank.

## Regression check
- All tests that passed before this slice must still pass, including `tests/test_plugin_manifests.py` and `tests/test_commands.py`.
- Files outside the slice scope must remain unchanged: `plugins/artifact/viewer/src/shell/panels/`, `plugins/artifact/viewer/src/flightdeck/`, `shared/`, `plugins/pr/`, and `plugins/artifact/scripts/`.
- A level a reader reaches today still renders: no level's route changes in this slice.

## Out of scope — do not penalise
- What a row opens. That is slice 7.
- The Work surface's own panels and their content. E5 owns them.
- Any filter, search, or lane grouping on the board.
- The FlightDeck surface, publishing, and every deferred epic.
- The board's own entrance animation, beyond its behaviour under `prefers-reduced-motion: reduce`.
