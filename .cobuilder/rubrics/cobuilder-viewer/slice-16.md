# Rubric: Slice 16 — the joins rail

Feature: cobuilder-viewer
Epic: cobuilder-viewer/E7
Slice goal: The same page lists the decisions, the design, and the epics that reach that pull request
Test command: `uv run --with pytest pytest tests/ -v`

Serve the bundle before any browser check: `python3 -m http.server` rooted at
`.cobuilder-architect/self/`. Pick a pull request the index links to a decision.

## Criteria

### C1 — The rail lists what reaches the pull request [CRITICAL]
**Must be true:** A reader who reads a pull request learns what it came from, without leaving the page. The rail lists the decisions that link to it, its design, and the epics whose branch or pull request carries it.
**Evidence to check:**
- With the ChromeDevTools MCP tools, open one pull request and read the rail.
- Read `data/index.json`'s `adr_to_pull_request` for that pull request. Each decision the join names appears in the rail.
- Read the epics against the index's `epic_to_pull_request` for that pull request. Each appears in the rail.
**Scoring:**
- 1.0 — the rail lists every decision, the design, and every epic the joins name for that pull request.
- 0.5 — the rail lists the decisions and not the epics, or the reverse.
- 0.0 — the rail renders nothing for a pull request the joins link to.

### C2 — The rail reads the index's join, and derives nothing [CRITICAL]
**Must be true:** The rail reads `adr_to_pull_request` and `epic_to_pull_request` from the record index. It does not derive a join of its own, so the rail and the index cannot disagree.
**Evidence to check:**
- Read the rail's source in `plugins/artifact/viewer/src/flightdeck/JoinsRail.tsx`. It reads the index's joins.
- Search the viewer source for a second derivation of a decision-to-pull-request link. The search returns none.
**Scoring:**
- 1.0 — the rail reads the index's joins, and no second derivation exists.
- 0.5 — the rail reads the index and adds one local rule the index does not carry.
- 0.0 — the rail derives the joins, so the index is no longer the one source.

### C3 — A decision in the rail opens its own record
**Must be true:** A reader presses a decision in the rail and reaches that decision's record. The rail is a way in, not a label.
**Evidence to check:**
- With the ChromeDevTools MCP tools, press one decision in the rail. Its record opens with that decision's own title, state, and rule.
- Press a second decision. Its record opens.
**Scoring:**
- 1.0 — a press opens that decision's own record, and a second press opens the second.
- 0.5 — a press opens a record that belongs to another decision.
- 0.0 — a press opens nothing.

### C4 — A pull request nothing links to states the absence
**Must be true:** A pull request the joins do not link renders a stated absence rather than an empty rail. An absence a reader cannot see is an absence they cannot act on.
**Evidence to check:**
- With the ChromeDevTools MCP tools, open a pull request the joins do not reach.
- Read the rail's own place on the page. It states that nothing links to this pull request, or it does not render and the absence reads elsewhere on the page.
**Scoring:**
- 1.0 — the absence is stated in place.
- 0.5 — the rail renders empty with no statement.
- 0.0 — the rail errors on a pull request with no joins.

## Regression check
- All tests that passed before this slice must still pass, including every case in `tests/test_flightdeck_parity.py` from slice 15.
- Files outside the slice scope must remain unchanged: `shared/build_index.py`, the bundle's data files, and `plugins/artifact/scripts/`.
- The six parts of parity still render: the rail adds a block and removes none.

## Out of scope — do not penalise
- The six parts of parity. Slice 15 owns them.
- The multi-pull-request mode and the merge-order path. They defer with E11 to E13.
- An edit to a join, or a new join in the index.
