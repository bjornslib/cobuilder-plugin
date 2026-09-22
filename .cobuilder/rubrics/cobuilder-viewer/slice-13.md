# Rubric: Slice 13 — a goal.json-only design renders

Feature: cobuilder-viewer
Epic: cobuilder-viewer/E5
Slice goal: One of the seven sparse designs shows every level it can fill, and the rail gates the levels it cannot
Test command: `uv run --with pytest pytest tests/ -v`

Serve the bundle before any browser check: `python3 -m http.server` rooted at
`.cobuilder-architect/self/`. Seven designs in this repository carry one record:
`build-workflow-polish`, `gate-state-resolution`, `inflight-record-store`,
`interaction-design-gate`, `lean-bundle-diffs`, `maintainable-viewer`, and
`ubiquitous-language`.

## Criteria

### C1 — A sparse design opens and renders what it fills [CRITICAL]
**Must be true:** A design whose only record is `goal.json` renders its content rather than an error. A reader reaches it from the board and meets its own records.
**Evidence to check:**
- With the ChromeDevTools MCP tools, open `inflight-record-store` from the board. Its work surface renders.
- Read the pane. The levels that design can fill render their panels, and each panel's values trace to its `goal.json`.
- Repeat for `maintainable-viewer` and `ubiquitous-language`. Each renders.
**Scoring:**
- 1.0 — every sampled sparse design opens and renders the records it carries.
- 0.5 — one sampled design opens and one fails.
- 0.0 — a sparse design errors, or its surface renders nothing.

### C2 — The rail gates what the design cannot fill [CRITICAL]
**Must be true:** A level the design cannot fill is absent from the rail, not disabled and not empty. A reader never spends a click on a level that holds nothing.
**Evidence to check:**
- With the ChromeDevTools MCP tools, read the rail for `inflight-record-store`. The levels that design fills are present, and the rest are absent.
- Read the console messages across the visit. None reports an error.
- Open one level the design does fill. Its panels state the records the design lacks, in place.
**Scoring:**
- 1.0 — the rail holds only the fillable levels, the console is clean, and the panels state what is absent.
- 0.5 — one unfillable level still renders, and it holds only absence statements.
- 0.0 — the surface errors, or the rail offers a level that renders blank.

### C3 — A redirect is stated, never silent
**Must be true:** A route that names a level the design cannot fill lands on a level it can, and says so. A reader learns why the address changed.
**Evidence to check:**
- With the ChromeDevTools MCP tools, open a sparse design at a route naming a level it cannot fill.
- Read the pane. A notice names the level that was asked for and the level the shell redirected to.
- Read the rail. The level the shell landed on reads as the active one.
**Scoring:**
- 1.0 — the redirect lands, and the notice names both levels.
- 0.5 — the redirect lands with no notice.
- 0.0 — the address renders an error or a blank pane.

### C4 — The sparse case does not damage a rich one
**Must be true:** The rule that lets a sparse design render does not weaken a design that carries every record. A rich design still shows all its content.
**Evidence to check:**
- With the ChromeDevTools MCP tools, open `cobuilder-viewer` itself. Every level that carries records renders them.
- Read its rail. The levels it fills are all present.
- Compare one level's content against the same level before this slice. Nothing is hidden.
**Scoring:**
- 1.0 — a rich design renders as it did, with every level present.
- 0.5 — a rich design renders and one level reads as absent that was present.
- 0.0 — the sparse rule hides content on a rich design.

## Regression check
- All tests that passed before this slice must still pass, including `tests/test_sections.py`, `src/shell/Board.test.tsx`, and `src/shell/readiness.test.ts`.
- Files outside the slice scope must remain unchanged: `shared/build_index.py`, `plugins/pr/`, and the designs' own record files.
- The board still lists all fifteen designs, sparse ones included, and each row still states what its design holds.

## Out of scope — do not penalise
- A record the design does not carry. This slice renders what exists and states what does not.
- The rich designs' own content. Slice 10 owns it.
- Any change to `goal.json`'s shape, or a new record type.
