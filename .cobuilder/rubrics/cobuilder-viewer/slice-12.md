# Rubric: Slice 12 — a record opens in the Sheet

Feature: cobuilder-viewer
Epic: cobuilder-viewer/E5
Slice goal: Pressing a decision, a boundary rule, or an epic's design opens the whole record, and a part link scrolls the record and moves focus to that heading
Test command: `uv run --with pytest pytest tests/ -v`

Serve the bundle before any browser check: `python3 -m http.server` rooted at
`.cobuilder-architect/self/`.

## Criteria

### C1 — A press opens the whole record [CRITICAL]
**Must be true:** A reader opens a decision, a boundary rule, or an epic's technical solution design from the panel that names it, and the whole record reads in the sheet. The pane does not move while it opens.
**Evidence to check:**
- With the ChromeDevTools MCP tools, press a decision's control on the Architecture level. The sheet opens with that decision's record, and its own title and state read at the top.
- Press a boundary rule's control, then an epic's design control from Build. Each opens its own record.
- Read the pane's `scrollTop` before and after one open. It stays where it was.
**Scoring:**
- 1.0 — all three record kinds open their own record, and the pane keeps its place.
- 0.5 — one kind opens the wrong record, or the pane moves.
- 0.0 — a press opens nothing, or the sheet renders an empty body.

### C2 — The jumplink row lists the record's own headings [CRITICAL]
**Must be true:** The row above a record carries one link per heading the record renders, in the record's own order. A renamed part renames its own link, so no link disagrees with a heading.
**Evidence to check:**
- With the ChromeDevTools MCP tools, open one decision record. Read the row's links and the record's own headings. They are the same words, in the same order.
- Read a record whose parts differ from that one. Its row names its own parts.
**Scoring:**
- 1.0 — the links match the record's headings, in order, and a second record gets its own row.
- 0.5 — the links match and one heading is missing from the row.
- 0.0 — the row holds a fixed list that disagrees with the record, or no row renders.

### C3 — A part link scrolls the record and moves focus
**Must be true:** A press on a part link brings that heading into view, and the heading holds focus afterwards, so a keyboard reader lands where the pointer did.
**Evidence to check:**
- With the ChromeDevTools MCP tools, press the last part link in a long record. That heading comes into view, and it holds focus.
- Press a middle link. The container scrolls to that heading, and it holds focus.
- Read `window.location.hash` after a press. It stays where it was.
**Scoring:**
- 1.0 — the press scrolls the record, focuses the heading, and leaves the address alone.
- 0.5 — the press scrolls the record and focus stays where it was.
- 0.0 — the press moves the page or the window, or it does nothing.

### C4 — A record with no marked parts shows no row
**Must be true:** A record that marks no heading renders no jumplink row, rather than an empty one. An empty row would state a presence the record does not have.
**Evidence to check:**
- Open a boundary rule record and an epic design record. Read the row area.
- Where a record marks no heading, no row renders and the record body starts at its own top.
**Scoring:**
- 1.0 — no row renders for a record with no marked part.
- 0.5 — an empty row renders and takes no space.
- 0.0 — a row renders with no links, so a reader meets a blank bar.

### C5 — The sheet owns its own scroll
**Must be true:** A long record scrolls inside the sheet. The pane behind it does not move, and the document never scrolls.
**Evidence to check:**
- With the ChromeDevTools MCP tools, open a long record and scroll inside it. The record moves, and the pane behind it stays where it was.
- Read the document's `scrollHeight` against its `clientHeight`. They are equal.
- Close the sheet with `Escape` and with the backdrop. Each closes it.
**Scoring:**
- 1.0 — the sheet scrolls its own record, the pane and the document stay put, and both ways out close it.
- 0.5 — the sheet scrolls and the pane moves with it.
- 0.0 — the record does not scroll, so its lower part stays out of reach.

## Regression check
- All tests that passed before this slice must still pass, including every case in `tests/test_sections.py`, `src/shell/Board.test.tsx`, and `src/shell/readiness.test.ts`.
- Files outside the slice scope must remain unchanged: `plugins/artifact/viewer/src/flightdeck/`, `shared/`, and `plugins/pr/`.
- Every panel still renders its own body: the sheet is an addition, and no panel loses a control to it.

## Out of scope — do not penalise
- The sheet's own field layout, or which fields a record shows.
- The board and the section model. Slices 6, 7, and 8 own them.
- Publishing and every deferred epic.
