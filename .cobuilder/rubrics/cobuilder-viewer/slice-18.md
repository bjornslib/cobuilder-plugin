# Rubric: Slice 18 — a pull request with no design is a row of its own

Feature: cobuilder-viewer
Epic: cobuilder-viewer/E19
Slice goal: The Work board lists a pull request that belongs to no design as a row of its own, beside the design rows, with that pull request's own state as its status, and a tab strip filters the board by status
Test command: `uv run --with pytest pytest tests/ -v`

Serve the bundle before any browser check: `python3 -m http.server` rooted at
`.cobuilder-architect/self/`. The component cases run with `npm test` in
`plugins/artifact/viewer/`.

The evidence is the board as a reader meets it, and the records it draws from. Measured
on 2026-09-25, this bundle holds seventeen pull requests, and twelve of them belong to no
design: 1 to 10, 17, and 22. Ten of those twelve are `merged`, and two are `open`. So the
board carries a real PR-alone set, and one pull request of each state.

## Criteria

### C1 — A pull request that belongs to no design is a row of its own [CRITICAL]
**Must be true:** The board lists every design in the bundle, and it also lists every pull request the record index holds that no design's epics point at. Each such pull request reads as one row of its own, beside the design rows and never inside one. A pull request a design's epics do point at is not a second row.
**Evidence to check:**
- Read `data/index.json`. Note every pull request it holds, and the set its `joins.epic_to_pull_request` resolves through the designs. The difference is the PR-alone set.
- With the ChromeDevTools MCP tools, open the bare route and take a snapshot. Read the row count and every row's title.
- Match each PR-alone pull request to exactly one row, and each design to exactly one row.
- Read a design row that carries a pull request of its own. The board renders no second row for that pull request.
**Scoring:**
- 1.0 — every PR-alone pull request reads as exactly one row beside the design rows, and no design's own pull request repeats.
- 0.5 — one PR-alone pull request is missing, or one repeats as a second row.
- 0.0 — no PR-alone pull request appears, or a PR-alone entry renders inside a design's row.

### C2 — A PR-alone row states its own state, and PR names its kind [CRITICAL]
**Must be true:** A PR-alone row states the state the index records for that pull request, `open` or `merged`. The word PR names the row's kind and never its status, so no row states `PR` where a state belongs. A design row's status reading stays the design's stage.
**Evidence to check:**
- With the ChromeDevTools MCP tools, open the bare route. Read the state on each PR-alone row.
- Compare each one against that id's `state` in `data/index.json`'s `entities.pull_request` list. Two of this bundle's PR-alone rows read `open`, and ten read `merged`.
- Read the two states against each other. `open` and `merged` read as two different words.
- Read a design row. Its kind reads as a design, and its stage is not a pull request state.
**Scoring:**
- 1.0 — every PR-alone row states the index's own state for it, both states render differently, and no row states a kind where a state belongs.
- 0.5 — one row's state disagrees with the index, or the two states render identically.
- 0.0 — the rows carry no state, or every PR-alone row reads `PR` in place of its state.

### C3 — The tabs filter the board by status [CRITICAL]
**Must be true:** The board carries a tab strip. Each tab selects by status, and `All` selects every row. A tab never selects a row whose status it does not name, and a status tab reads the same whether the row it selects is a design or a pull request.
**Evidence to check:**
- With the ChromeDevTools MCP tools, press each tab in turn and take a snapshot after each press.
- Read the row count on each tab against the status each remaining row states. Every row under a tab carries that tab's status, and no row that carries it is absent.
- Read the `All` tab. It holds every row, and its count equals the sum of the status tabs' counts.
- Read the tab labels. Each one names a status, and none names a record type.
**Scoring:**
- 1.0 — every tab filters by status, `All` holds every row, the counts add up, and no row is misfiled.
- 0.5 — the tabs filter and one row sits under a tab whose status it does not carry.
- 0.0 — no tab strip exists, or a tab filters by something other than status.

### C4 — A PR-alone row is a destination, and it carries one link
**Must be true:** A PR-alone row opens that pull request's own records. The row is one link or one control, so a reader reaches the pull request without a second press. Nothing interactive sits inside the row.
**Evidence to check:**
- With the ChromeDevTools MCP tools, open the bare route and take a snapshot of a PR-alone row.
- Read the row's target. It names that pull request, and a press opens that pull request's own records.
- Read the row for a second control inside it. None exists.
- Press the row. The address line names the pull request the row stated.
**Scoring:**
- 1.0 — one press opens that pull request's own records, and the row holds one control.
- 0.5 — the row opens the right pull request behind a second press, or it holds a second control.
- 0.0 — the row is not a destination, or it opens a surface that belongs to another work item.

### C5 — A status reading and a kind reading are two different filters
**Must be true:** A reader can narrow the board to one row kind, and the status tabs keep working inside that set. A kind control never states a status, and a status tab never states a kind.
**Evidence to check:**
- Find the control that narrows the board to the PR-alone rows. Press it and read the rows.
- Press a status tab while the kind filter holds. Read the rows and the tab count. The status tab narrows the kind-filtered set.
- Release the kind filter and read the rows. Every row returns.
- Read each control group's label. One names kinds, and the other names statuses.
**Scoring:**
- 1.0 — a reader reaches the PR-alone rows alone, the status tabs still filter them, and each control group names one thing.
- 0.5 — the two readings exist and one control does both jobs, so changing one clears the other.
- 0.0 — no reading separates the two, so a reader cannot tell a row's kind from its status.

## Regression check
- All tests that passed before this slice must still pass, including `src/shell/Board.test.tsx` and `src/shell/readiness.test.ts`.
- Files outside the slice scope must remain unchanged: `plugins/artifact/viewer/src/data/`, `shared/build_index.py`, and the bundle's data files.
- The design rows still render, still state their stage and their six record marks, and still open a work item.
- The board still draws no section strip, no pager bar, and no level progress bar.
- The board still reads its data from the index, and it authors no record of its own.

## Out of scope — do not penalise
- The change's account, the rail's two groups, the change's own address, and the account mark. E7's slices 15, 16, and 17 own all four.
- The design rows' own content, order, and address. Slices 6 and 7 own them.
- The reference surface and its record-type tabs. E9 owns it, and it is deferred.
- What the generation scripts write into the bundle. This slice reads the index and does not reshape it.
- The design mode's stage vocabulary and the pull request's state vocabulary. The board reads both and invents neither.
