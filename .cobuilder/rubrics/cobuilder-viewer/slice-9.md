# Rubric: Slice 9 — the level's progress

Feature: cobuilder-viewer
Epic: cobuilder-viewer/E5
Slice goal: The strip reads 0 at the first section's top, 25 percent at its bottom, 50 on the second, 100 on the last, and never decreases on a forward walk
Test command: `uv run --with pytest pytest tests/ -v`

Serve the bundle before any browser check: `python3 -m http.server` rooted at
`.cobuilder-architect/self/`. The strip carries `role="progressbar"` and its reading is
`aria-valuenow`. Wait at least one second after each scroll before reading, so a spring
settles.

## Criteria

### C1 — The reading is a position in the level [CRITICAL]
**Must be true:** The strip reports how far through the level a reader is, not a fraction of a page. On a four-section level the readings step by one quarter.
**Evidence to check:**
- With the ChromeDevTools MCP tools, open a paged level of four sections at its first section, scrolled to the top. Read `aria-valuenow`. It is 0.
- Scroll the first box to its bottom and read again. It is 25.
- Step to the second section and read. It is 50. Step to the last and read. It is 100.
**Scoring:**
- 1.0 — the four readings are 0, 25, 50, and 100 at those positions, and the middle values follow the same step.
- 0.5 — the first and last readings are right and a middle reading is wrong.
- 0.0 — the reading does not move with the section, or it stays at one value.

### C2 — The reading never decreases on a forward walk [CRITICAL]
**Must be true:** A reader who steps forward and reads each section never sees the strip go backwards. A section change never resets it.
**Evidence to check:**
- With the ChromeDevTools MCP tools, start at the first section and record the reading at each step forward, with each box scrolled to its bottom.
- The sequence never decreases, and it ends at 100 on the last section.
- Step back once. The reading falls, which is correct for a backward step and is not a reset.
**Scoring:**
- 1.0 — the forward walk never decreases and ends at 100.
- 0.5 — one step forward holds the same reading.
- 0.0 — a step forward lowers the reading, or a section change resets it to zero.

### C3 — A box with no scroll range counts as fully read
**Must be true:** A section that fits its box contributes its whole share. A reader is not asked to scroll a section that has nothing to scroll.
**Evidence to check:**
- With the ChromeDevTools MCP tools, open a section whose box has no scroll range, so `scrollHeight` equals `clientHeight`.
- Read `aria-valuenow`. It equals the reading the section reaches at the end of its share.
**Scoring:**
- 1.0 — a box with no range reads as fully read.
- 0.5 — it reads part way, so the strip stalls at a boundary that is not real.
- 0.0 — it reads zero, or the strip is hidden for that section.

### C4 — Scrolling a box moves nothing else
**Must be true:** The strip measures the box the reader is on. Scrolling it moves neither the pane, nor the window, nor the track.
**Evidence to check:**
- With the ChromeDevTools MCP tools, read the pane's `scrollTop`, `window.scrollY`, and the track's transform.
- Scroll the active box to its bottom and read all three again. Each is unchanged, and the reading climbs.
- Scroll the box back to its top. The reading returns to where it was.
**Scoring:**
- 1.0 — the box scrolls, the reading climbs, and the pane, the window, and the track stay put.
- 0.5 — the reading climbs and one of the three moves.
- 0.0 — the reading does not move with the box, or the pane moves.

### C5 — The strip keeps its stated contract
**Must be true:** The strip remains a progress bar a reader can read. It states its own name, and its range stays 0 to 100.
**Evidence to check:**
- With the ChromeDevTools MCP tools, read the strip's role and its accessible name. It is a `progressbar` named `Reading progress`.
- Read `aria-valuemin` and `aria-valuemax`. They are 0 and 100.
**Scoring:**
- 1.0 — the role, the name, and the range are all as stated.
- 0.5 — the role and range hold and the name is missing.
- 0.0 — the strip is not a progress bar, so no reader hears it.

## Regression check
- All tests that passed before this slice must still pass, including every case in `tests/test_sections.py` from slice 8.
- Files outside the slice scope must remain unchanged: `plugins/artifact/viewer/src/flightdeck/`, `shared/`, and `plugins/pr/`.
- A section that stacks keeps the strip's previous behaviour: it reports the pane's own offset.

## Out of scope — do not penalise
- The section model itself. Slice 8 owns the track, the strip, and the pager.
- The panels' content. Slice 10 owns it.
- A per-section reading, or any second number on the strip.
- Publishing, and every deferred epic.
