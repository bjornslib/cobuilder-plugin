# Rubric: Slice 10 — every level renders its own sections

Feature: cobuilder-viewer
Epic: cobuilder-viewer/E5
Slice goal: A reader walks Intent, Problem & Solution, Architecture, Build, Pull requests, and Shipped of one work item, and the envisioned pull request leads the Pull requests level
Test command: `uv run --with pytest pytest tests/ -v`

Serve the bundle before any browser check: `python3 -m http.server` rooted at
`.cobuilder-architect/self/`. Use one rich work item: `cobuilder-viewer` itself.

## Criteria

### C1 — Every section of every level renders its own records [CRITICAL]
**Must be true:** A reader walks the whole work item and meets each section's own content. Intent shows its contract parts. Problem & Solution shows its panels. Architecture shows its decisions, its boundaries, and its reach. Build shows its epics and its rubrics. Pull requests shows its pull requests. Shipped shows its stage.
**Evidence to check:**
- With the ChromeDevTools MCP tools, walk each of the four paged levels' sections, and the two stacking ones. Take a snapshot of each and read what it holds.
- Compare one section against the bundle: the decisions the Architecture level lists are the decisions `data/index.json` links to that design.
- Read the console messages across the walk. None reports an error.
**Scoring:**
- 1.0 — every section renders its own records, each matches the bundle, and the console is clean.
- 0.5 — one section renders empty where the design carries records.
- 0.0 — a level renders nothing, or its content belongs to another design.

### C2 — The envisioned pull request leads its level [CRITICAL]
**Must be true:** On the Pull requests level, the pull request this work will open reads first, above any real pull request. Its heading says it is a draft rather than a pull request that exists.
**Evidence to check:**
- With the ChromeDevTools MCP tools, open the Pull requests level and take a snapshot.
- Read the first block. It holds the design's own draft text from `data/designs.js`, and its heading names it as the pull request this work will open.
- A work with no draft renders no such block.
**Scoring:**
- 1.0 — the draft leads the level, its heading says what it is, and a work with no draft shows none.
- 0.5 — the draft renders below a real pull request, or its heading claims it exists.
- 0.0 — the draft is absent while the design carries one.

### C3 — Absence reads in place, and no panel is a fold
**Must be true:** A record a section lacks reads where it would have been read. A paged section shows its whole content on arrival, so no panel carries a fold.
**Evidence to check:**
- With the ChromeDevTools MCP tools, open a section whose record is absent. The panel states the absence in place and carries a `not present` marker.
- Take a snapshot of a paged section and count its disclosure controls inside the panels. None exists, and each panel's body renders open.
**Scoring:**
- 1.0 — an absence reads in place, and no panel of a paged section folds.
- 0.5 — an absence reads in place and one panel still carries a fold.
- 0.0 — an absent record renders a blank panel, or a panel hides its body behind a fold.

### C4 — The Build level pages its epics in runs
**Must be true:** Eighteen epics are not one section. The Build level cuts them into a small number of sections in delivery order, and each section is one screen.
**Evidence to check:**
- With the ChromeDevTools MCP tools, open the Build level and read the strip's labels and the pager's count.
- Count the epic rows in each section. Each section holds a run, and the runs together hold every epic the design carries.
- Read each section's box against the pane's height. Each section fits one screen.
**Scoring:**
- 1.0 — the epics are cut into runs, every epic appears once, and each section fits one screen.
- 0.5 — the epics are cut and one section needs a scroll of more than one screen.
- 0.0 — all eighteen epics render in one section, or an epic is missing.

### C5 — A panel's own records come from the bundle, never from a fixture
**Must be true:** Every value a panel shows exists in the bundle. No panel invents a value to fill a gap.
**Evidence to check:**
- Pick three panels that show a value: a contract outcome, a decision rule, an assessment verdict.
- Find each value in `data/index.json`, `data/designs.js`, or `data/adrs.js`. Each one is there.
**Scoring:**
- 1.0 — every sampled value traces to the bundle.
- 0.5 — one sampled value traces to no record.
- 0.0 — a panel shows a fabricated value.

## Regression check
- All tests that passed before this slice must still pass, including `tests/test_sections.py`, `src/shell/Board.test.tsx`, and `src/shell/readiness.test.ts`.
- Files outside the slice scope must remain unchanged: `plugins/artifact/viewer/src/flightdeck/`, `shared/build_index.py`, and the bundle's data files.
- The board still renders and still opens a work item.

## Out of scope — do not penalise
- The section model. Slice 8 owns the track, the strip, and the pager.
- The progress strip. Slice 9 owns it.
- The diagram tiles, the record sheet, and the sparse-record case. Slices 11, 12, and 13 own them.
- The FlightDeck surface. E7 owns it.
