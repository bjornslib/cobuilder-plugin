# Rubric: Slice 10 — every level renders its own sections

Feature: cobuilder-viewer
Epic: cobuilder-viewer/E5
Slice goal: A reader walks the program's account of one work item — Intent, Problem & Solution, Architecture, Epics, and Rubrics — and each row renders its own sections
Test command: `uv run --with pytest pytest tests/ -v`

Serve the bundle before any browser check: `python3 -m http.server` rooted at
`.cobuilder-architect/self/`. Use one rich work item: `cobuilder-viewer` itself.

## Criteria

### C1 — Every section of every row renders its own records [CRITICAL]
**Must be true:** A reader walks the whole program's account and meets each section's own content. Intent shows its contract parts. Problem & Solution shows its panels. Architecture shows its decisions, its boundaries, and its reach. Epics shows its epics and their slices. Rubrics shows its gate records.
**Evidence to check:**
- With the ChromeDevTools MCP tools, walk each of the five rows' sections. Take a snapshot of each and read what it holds.
- Compare one section against the bundle: the decisions the Architecture row lists are the decisions `data/index.json` links to that design.
- Read the console messages across the walk. None reports an error.
**Scoring:**
- 1.0 — every section renders its own records, each matches the bundle, and the console is clean.
- 0.5 — one section renders empty where the design carries records.
- 0.0 — a row renders nothing, or its content belongs to another design.

### C2 — The Epics and Rubrics rows render the records they hold [CRITICAL]
**Must be true:** The Epics row renders this work's epics, and each epic names the slices it carries. The Rubrics row renders the gate records the join resolves, and an empty gate reads as empty rather than as a pass.
**Evidence to check:**
- With the ChromeDevTools MCP tools, open the Epics row and the Rubrics row, and take a snapshot of each.
- Read one epic's disclosure. It names that epic's slices, and every slice `data/index.json` links to that epic appears once.
- Read the Rubrics row against the design's own gate records. An epic with no gate record states that, and the row claims no pass.
**Scoring:**
- 1.0 — both rows render their own records, and an empty gate reads as empty.
- 0.5 — one epic's slices are absent, or an empty gate reads as a pass.
- 0.0 — a row renders nothing, or it renders another work item's records.

### C3 — Absence reads in place, and no panel is a fold
**Must be true:** A record a section lacks reads where it would have been read. A paged section shows its whole content on arrival, so no panel carries a fold.
**Evidence to check:**
- With the ChromeDevTools MCP tools, open a section whose record is absent. The panel states the absence in place and carries a `not present` marker.
- Take a snapshot of a paged section and count its disclosure controls inside the panels. None exists, and each panel's body renders open.
**Scoring:**
- 1.0 — an absence reads in place, and no panel of a paged section folds.
- 0.5 — an absence reads in place and one panel still carries a fold.
- 0.0 — an absent record renders a blank panel, or a panel hides its body behind a fold.

### C4 — The Epics row pages its epics in runs
**Must be true:** Eighteen epics are not one section. The Epics row cuts them into a small number of sections in delivery order, and each section is one screen.
**Evidence to check:**
- With the ChromeDevTools MCP tools, open the Epics row and read the strip's labels and the pager's count.
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
- Files outside the slice scope must remain unchanged: `plugins/artifact/viewer/src/data/`, `shared/build_index.py`, and the bundle's data files.
- The board still renders and still opens a work item.

## Out of scope — do not penalise
- The section model. Slice 8 owns the track, the strip, and the pager.
- The progress strip. Slice 9 owns it.
- The diagram tiles, the record sheet, and the sparse-record case. Slices 11, 12, and 13 own them.
- The change's account, and the rail's two groups. E7 owns both.
