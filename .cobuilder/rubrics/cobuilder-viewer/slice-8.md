# Rubric: Slice 8 — the section model

Feature: cobuilder-viewer
Epic: cobuilder-viewer/E5
Slice goal: One box is on screen, the strip, the pager bar, and the two arrow keys move one index, and the pane reports no scroll at all
Test command: `uv run --with pytest pytest tests/ -v`

Serve the bundle before any browser check: `python3 -m http.server` rooted at
`.cobuilder-architect/self/`, which is the parent of `viewer/`. A paged level is any of
Intent, Problem & Solution, Architecture, and Build's epics sub-view. Rubrics is the
section that stacks.

## Criteria

### C1 — One box is on screen, and the pane does not scroll [CRITICAL]
**Must be true:** On a paged level, one section is on screen and the frame a reader sees does not move. The box owns the scroll, so a section taller than its box scrolls inside it.
**Evidence to check:**
- With the ChromeDevTools MCP tools, open each of the four paged levels. Read the pane's `scrollHeight` against its `clientHeight`. The two are equal, so the pane has no scroll.
- Read the boxes' rects. Exactly one box sits inside the pane's own rect.
- Find a section taller than its box, scroll it, and read the pane again. The pane stays at zero, and the box's `scrollTop` moves.
**Scoring:**
- 1.0 — the pane has no scroll on all four levels, one box is in view, and a tall box scrolls itself.
- 0.5 — the pane has no scroll and a tall box clips instead of scrolling.
- 0.0 — the pane scrolls on a paged level, or more than one box is in view.

### C2 — One index drives the strip, the pager, and the arrow keys [CRITICAL]
**Must be true:** A press on a heading, a press on Next, and an arrow key all move the same index by one section. The track moves by exactly one box width, forward and back.
**Evidence to check:**
- With the ChromeDevTools MCP tools, read the track's transform, then press Next. The transform moves by one box width, and the pager's text reads the next section.
- Press a heading three sections along. The track jumps three box widths, and the active heading moves with it.
- Press `ArrowRight`, then `ArrowLeft`. Each step moves one box, and the track returns to where it started.
**Scoring:**
- 1.0 — all three controls move one shared index, and each step is exactly one box width.
- 0.5 — the controls move the index and one of them lands between two boxes.
- 0.0 — a control moves nothing, or the controls disagree about the active section.

### C3 — The strip's labels come from the sections themselves
**Must be true:** The strip names the sections the level rendered, and the pager's count comes from the same list. A renamed section renames its own link, and no count disagrees with the boxes.
**Evidence to check:**
- Read the strip's labels and the headings of the boxes. They are the same words, in the same order.
- Read the pager's count against the box count. They are equal.
- Rename one section's heading, reload, and read the strip. The link carries the new words.
**Scoring:**
- 1.0 — the labels match the headings, the count matches the boxes, and a rename follows through.
- 0.5 — the labels match and the count disagrees, or a rename reaches the heading and not the link.
- 0.0 — the strip holds a list of its own that disagrees with the page.

### C4 — The arrow keys are guarded, and they never write the route
**Must be true:** The two arrow keys step the index. They do nothing while a field has focus, and nothing while a modifier key is held. A step never changes the address.
**Evidence to check:**
- With the ChromeDevTools MCP tools, read `window.location.hash`, press `ArrowRight`, and read it again. It is unchanged.
- Focus a text `input` on the page, press `ArrowRight`, and read the pager. The section does not change.
- Hold a modifier and press `ArrowRight`. The section does not change.
**Scoring:**
- 1.0 — the keys step, the address never moves, and the field and modifier guards both hold.
- 0.5 — the keys step and one guard fails.
- 0.0 — the keys change the address, or they step while a field has focus.

### C5 — A paged level drops the band and keeps the heading element
**Must be true:** A paged level shows no heading band, because the strip says the same words. The document keeps one `h1` for the level, and a section change moves focus to it.
**Evidence to check:**
- With the ChromeDevTools MCP tools, open a paged level and confirm no band element renders above the strip.
- Read `#work-section-heading`. It exists, it is `sr-only`, and it carries the level's own title.
- Change the section and read the focused element. Focus lands on that heading.
**Scoring:**
- 1.0 — no band, the `sr-only` heading exists with the level's title, and focus lands on it.
- 0.5 — the band is gone and focus stays where it was.
- 0.0 — a band renders on a paged level, or the heading element is missing.

### C6 — Rubrics keeps the stacking shape
**Must be true:** The Rubrics sub-view is not paged. Its pane owns its own scroll, and it draws no strip and no pager.
**Evidence to check:**
- With the ChromeDevTools MCP tools, open `build/rubrics`. Confirm no strip, no pager, and no level progress bar.
- Read the pane's `scrollHeight` against its `clientHeight`. The pane scrolls when its content is taller.
**Scoring:**
- 1.0 — Rubrics draws none of the three controls and its pane scrolls.
- 0.5 — Rubrics draws one of them.
- 0.0 — Rubrics is paged, so a reader lost its previous behaviour.

## Regression check
- All tests that passed before this slice must still pass, including `src/shell/Board.test.tsx` and `src/shell/readiness.test.ts` from slice 6.
- Files outside the slice scope must remain unchanged: `plugins/artifact/viewer/src/flightdeck/`, `shared/`, and `plugins/pr/`.
- A section a reader could reach before this slice is still reachable, and the board's rows still open a work item.

## Out of scope — do not penalise
- The progress strip. Slice 9 owns it.
- The panels' own content. Slice 10 owns it.
- The diagram tiles, the record sheet, and the sparse-record case. Slices 11, 12, and 13 own them.
- A shared link to one section. The index is view state by design, and nothing here changes that.
