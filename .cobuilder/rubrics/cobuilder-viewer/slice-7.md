# Rubric: Slice 7 — a row opens the item's Work surface

Feature: cobuilder-viewer
Epic: cobuilder-viewer/E19
Slice goal: Pressing a row lands on that item's Work surface at its first level, with the route naming the item
Test command: `npm test` in `plugins/artifact/viewer/` runs the board's own cases
through vitest. The page criteria below need a served bundle and the ChromeDevTools MCP tools.

Serve the bundle before any browser check: `python3 -m http.server` rooted at
`.cobuilder-architect/self/`, which is the parent of `viewer/`. The bare route is
`#/`, and the board renders there.

## Criteria

### C1 — A row press opens that item's Work surface at its first level [CRITICAL]
**Must be true:** Pressing a design's row lands on that design's Work surface, on the level a reader meets first. The surface renders the design the row named, and not another.
**Evidence to check:**
- With the ChromeDevTools MCP tools, open `#/`, take a snapshot, and press one row's link.
- Take a snapshot after the press. The heading names the level a reader meets first on this surface, and the top line names the design the row carried.
- Press a second row for a different design and repeat. The second surface names the second design.
**Scoring:**
- 1.0 — the press opens the row's own design, on the first level, and a second row opens its own design too.
- 0.5 — the press opens a Work surface and the wrong design, or the wrong level.
- 0.0 — the press does nothing, or the surface renders no design.

### C2 — The route after the press names the item [CRITICAL]
**Must be true:** The address after a press names the design the reader pressed, so they can copy it, reload it, and land on the same screen. The route is the shell's own work-item route, not a board-local one.
**Evidence to check:**
- With the ChromeDevTools MCP tools, read `window.location.hash` after the press. It carries the design's id and the first level's section.
- Reload that address directly. The same design's Work surface renders, with no board in between and no error.
- Press the browser's back control. The board renders again.
**Scoring:**
- 1.0 — the address names the design, a reload lands on the same surface, and going back returns to the board.
- 0.5 — the address names the design and a reload shows the board first, or the address carries a board-local id.
- 0.0 — the address does not change, or a reload of it renders an error.

### C3 — The row is a real link, and its address works on its own
**Must be true:** A row is an anchor with the item's address. It is right-clickable, and a reader can open it in a new tab without the board being open first.
**Evidence to check:**
- With the ChromeDevTools MCP tools, read one row's element. It is an anchor, its `href` names the design's route, and its accessible name names the design and its stage.
- Open that `href` in a fresh page load. The design's Work surface renders.
**Scoring:**
- 1.0 — the row is an anchor with the item's address, its name names the design, and the address works alone.
- 0.5 — the row is an anchor and its accessible name names no design, or the address works only from the board.
- 0.0 — the row is a control with no address, so nothing can be opened in a new tab.

### C4 — A design with one record opens too
**Must be true:** A design whose only record is `goal.json` opens on its Work surface, and that surface states what the design cannot fill rather than erroring. Seven designs in this repository carry one record.
**Evidence to check:**
- With the ChromeDevTools MCP tools, press the row for `inflight-record-store` on the bare route. Its Work surface renders.
- Read the pane. The level the design fills renders, and the levels it cannot fill stay in the rail as gated entries that name the records the design misses. No error text appears.
- Read the console messages. None reports an error from that surface.
**Scoring:**
- 1.0 — the sparse design opens, its filled level renders, the rest are gated, and the console is clean.
- 0.5 — it opens, and an empty level renders where a gated one belongs.
- 0.0 — the press errors, or no surface renders.

### C5 — The transition keeps the reader's place
**Must be true:** The pane starts at the top of the level the press landed on, and it does not carry the board's scroll offset into the surface.
**Evidence to check:**
- With the ChromeDevTools MCP tools, scroll the board to its last row, then press that row. Read the pane's `scrollTop` on the surface.
- Confirm the document's own scroll stays at zero throughout.
**Scoring:**
- 1.0 — the surface opens at the pane's top, and the document never scrolls.
- 0.5 — the surface opens part way down, and the reader can scroll up to its heading.
- 0.0 — the surface opens at the board's old offset, so the reader meets a level mid-page.

## Regression check
- All tests that passed before this slice must still pass, including every case in `src/shell/Board.test.tsx` and `src/shell/readiness.test.ts`.
- Files outside the slice scope must remain unchanged: `plugins/artifact/viewer/src/flightdeck/`, `shared/`, `plugins/pr/`, and `plugins/artifact/scripts/`.
- The board still lists every design, still orders rows by the lane rule, and still draws no strip and no pager. This slice adds a destination and removes nothing.

## Out of scope — do not penalise
- The board's own list, count, order, marks, and key. Slice 6 owns them, and re-scoring them here would score the board twice.
- Every panel, section, and level the Work surface renders. E5 owns them; this slice scores the arrival, not the destination's content.
- The rail's entry back to the board, beyond its use as evidence in C2's back control.
- The FlightDeck surface, publishing, and every deferred epic.
