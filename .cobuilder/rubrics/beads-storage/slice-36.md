Kind: test-suite

# Rubric: Slice 36 — E8 next ready and pull request state on the board

Feature: beads-storage
Epic: beads-storage/E8
Slice goal: A Work board card shows the closed and total slices, the next ready slice, and one chip for each pull request record, all from the tracker. The GREEN work adds the tests itself, since the RED stage is skipped.
Test command: `uv run pytest tests/test_index_design_tracker.py tests/test_viewer_build.py -q` and `cd plugins/artifact/viewer && npm run test`

The new test file is `tests/test_index_design_tracker.py`. Read the `design_tracker` index shape in `epic-E8-design.md`.

## Criteria

### C1 — The index holds `design_tracker` for each design [CRITICAL]

**Must be true:** `build_index.py` fills `design_tracker` from the snapshot. Each design gets its slice counts, its first ready slice (by epic id, then `n`), and its pull request records. A record belongs to a design when it tracks one of the design's epics. On the fake adapter, a design with a ready slice gives that slice, a design at `implemented` gives `null`, and with the files adapter every design gives `null`. A counting runner shows at most three bd calls for the build.

**Evidence to check:** Read the build test and the counting test. Run the file. Read `design_tracker` of two designs in the rebuilt `data/index.json`.

**Scoring:**
- 1.0: all three cases and the count are asserted and pass.
- 0.5: the cases pass, but the call count is not asserted.
- 0.0: `next_ready` is wrong for a design, or the build makes four or more calls.

### C2 — The card shows the tracker values [CRITICAL]

**Must be true:** The deck row shows `slicesDone/slicesTotal`, the epic meter, the next ready slice (id and title, one line), and one chip for each pull request. A chip reads `#43 open` or `#43 merged`. The merge icon shows for `merged` only. A viewer test renders a card with an open and a merged record and checks the icon.

**Evidence to check:** Read the viewer test. Run `npm run test`. Open the Work board in the viewer and read two cards.

**Scoring:**
- 1.0: the test passes and the screen shows the chips.
- 0.5: the test passes, but the screen was not checked.
- 0.0: a chip says `merged` for an open record.

### C3 — An unread tracker shows nothing wrong

**Must be true:** When `trackerRead` is false, the card shows no next ready slice and no chip, and the drawer footer says the tracker was not read. With the files adapter the footer says that next ready needs a tracker. `resolvedJoinsOf` gives the two answers `designTracker(designId)` and `trackerRead()`, and no file outside `src/data/` reads a join table.

**Evidence to check:** Read the viewer tests for the unread state. Grep `src` outside `src/data/` for the join table names.

**Scoring:**
- 1.0: both states are tested and the grep is empty.
- 0.5: one state is untested.
- 0.0: a card shows a ready slice while the tracker was not read.

## Regression check

- `cd plugins/artifact/viewer && npm run build` writes `index.html` in both places, and `uv run pytest tests/test_viewer_build.py -q` passes.
- The `shipped` lane blurb in `workDeck.ts` says "The tracker holds the stage implemented."
- The field `DesignRow.pullRequests` is removed when no reader remains (grep result in the evidence).

## Out of scope — do not penalise

- The status words and the epic count. Slice 35 owns them.
- Repair of old records. Slice 37 owns it.
