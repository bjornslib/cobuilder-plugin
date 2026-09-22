# Rubric: Slice 11 — the diagram tiles open their drawing

Feature: cobuilder-viewer
Epic: cobuilder-viewer/E5
Slice goal: A tile shows the drawing's miniature scaled to its box, a press opens it whole with zoom from 50 to 400 percent, Escape and the backdrop close it, and a failed render shows the authored source
Test command: `uv run --with pytest pytest tests/ -v`

Serve the bundle before any browser check: `python3 -m http.server` rooted at
`.cobuilder-architect/self/`. The runtime arrives from `cdn.jsdelivr.net`, so the failure
case works offline or with that host blocked.

## Criteria

### C1 — A tile shows the drawing's own miniature [CRITICAL]
**Must be true:** A tile is a miniature of one drawing, scaled to its box and keeping the drawing's proportions. A press opens that drawing whole.
**Evidence to check:**
- With the ChromeDevTools MCP tools, open the Diagrams section and take a snapshot. It holds one tile per diagram level the bundle carries.
- Read one tile's drawing: the element carries the drawing's own width, and a scale transforms it to the tile's width.
- Press the tile. The dialog opens with that level's drawing, and its heading names the level and the drawing's kind.
**Scoring:**
- 1.0 — one tile per level, each scaled to its box, and a press opens that level's own drawing.
- 0.5 — the tiles render and one opens another level's drawing.
- 0.0 — no tile renders, or a press opens nothing.

### C2 — The zoom moves the drawing, and the body keeps its scroll [CRITICAL]
**Must be true:** The zoom scales the drawing rather than the dialog. A reader reaches every part of a zoomed drawing through the dialog's own scroll.
**Evidence to check:**
- With the ChromeDevTools MCP tools, open one drawing. Read the zoom reading and the drawing's on-screen width.
- Press zoom in twice and read both again. The reading steps up, and the drawing's width grows with it.
- Read the dialog body's `scrollWidth` against its `clientWidth`. The scroll area grew, so the zoomed drawing stays reachable.
- Press reset. The reading returns to where it started.
**Scoring:**
- 1.0 — the reading steps, the drawing grows, the scroll area grows with it, and reset returns the fit.
- 0.5 — the reading steps and the drawing is clipped at the dialog's edge.
- 0.0 — the zoom does nothing, or it scales the dialog and hides the drawing's edges.

### C3 — The zoom range stops at 50 and 400 percent
**Must be true:** The zoom holds a sensible range. A control at either end states that it cannot act, and no reader meets a dead control.
**Evidence to check:**
- With the ChromeDevTools MCP tools, press zoom out until it stops. Read the reading, which is 50 percent, and read the control's disabled state and its cursor.
- Press zoom in until it stops. Read the reading, which is 400 percent, and the disabled state.
- Read every zoom control's size. Each is at least 44 px in both directions.
**Scoring:**
- 1.0 — the range holds at 50 and 400, each end disables its control, and every control is at least 44 px.
- 0.5 — the range holds and a control at the end still looks pressable.
- 0.0 — the zoom runs past either end, or a control is smaller than 44 px.

### C4 — Escape, the backdrop, and the close control all close it
**Must be true:** A reader closes the dialog three ways, and each one works. Focus lands on the close control when the dialog opens.
**Evidence to check:**
- With the ChromeDevTools MCP tools, open one drawing and press `Escape`. The dialog closes.
- Open it again and press the backdrop. It closes.
- Open it again and read the focused element. The close control holds focus. Press it, and the dialog closes.
**Scoring:**
- 1.0 — all three close it, and the close control takes focus on open.
- 0.5 — two of the three work.
- 0.0 — one way out exists, or none.

### C5 — A failed render still gives the reader the source
**Must be true:** With the runtime unreachable, a tile states the failure and its dialog shows the authored source as text. A reader with no network still gets something to read.
**Evidence to check:**
- Block `cdn.jsdelivr.net`, then reload the Diagrams section.
- With the ChromeDevTools MCP tools, read a tile. It states that the drawing did not load, in one line.
- Press it, and read the dialog. It holds the authored Mermaid source as text, and the failure message.
**Scoring:**
- 1.0 — the tile states the failure, and the dialog holds the authored source.
- 0.5 — the tile states the failure and the dialog is empty.
- 0.0 — the tiles render blank with no explanation.

### C6 — The runtime loads when the section mounts, not on a press
**Must be true:** The tiles draw themselves without a press. A reader who reaches the Diagrams section meets drawings, not a control to fetch them.
**Evidence to check:**
- With the ChromeDevTools MCP tools, open the Diagrams section and read the network requests. The runtime request appears on mount.
- Read the tiles with no press. Each one holds its drawing.
- Confirm no control on the page offers to draw a diagram.
**Scoring:**
- 1.0 — the runtime loads on mount, the tiles draw themselves, and no draw control exists.
- 0.5 — the runtime loads on mount and one tile needs a press.
- 0.0 — a press is required, so the old rule is still in force.

## Regression check
- All tests that passed before this slice must still pass, including `tests/test_sections.py`, `src/shell/Board.test.tsx`, and `src/shell/readiness.test.ts`.
- Files outside the slice scope must remain unchanged: `plugins/artifact/viewer/src/flightdeck/`, `shared/`, and `plugins/pr/scripts/build_diagrams.py`.
- A level's other sections still render: the diagrams change nothing outside their own section.

## Out of scope — do not penalise
- Which level holds which diagram. The Intent level takes the first diagram level, and Architecture takes the rest.
- Publishing a diagram as an Artifact. It defers with E16.
- The source block the old panel carried for a working render. Only the failure path shows the source.
