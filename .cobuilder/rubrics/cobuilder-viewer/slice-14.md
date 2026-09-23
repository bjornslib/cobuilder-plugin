# Rubric: Slice 14 — the FlightDeck prototype, reviewed

Feature: cobuilder-viewer
Epic: cobuilder-viewer/E6
Slice goal: One surface shows single-pull-request narration at parity and the multi-pull-request path as its second mode behind one switch, and the engineer approves it or names what to change
Test command: `uv run --with pytest pytest tests/ -v`

The evidence is the prototype as a reader meets it, the records it draws from, and a
recorded decision.

## Criteria

### C1 — One surface, two modes, one switch [CRITICAL]
**Must be true:** FlightDeck reads as one surface. A reader switches between the single-pull-request mode and the multi-pull-request mode from one control, and the surface keeps its shape across the switch.
**Evidence to check:**
- With the ChromeDevTools MCP tools, open the prototype. Take a snapshot of the default mode.
- Press the switch. The second mode renders in the same surface, with the same frame, and no second page or second window opens.
- Press back. The first mode renders again, in the state a reader left it.
**Scoring:**
- 1.0 — both modes render in one surface, the switch moves between them, and a return restores the first.
- 0.5 — both modes render and the switch reloads the page.
- 0.0 — one mode renders, or the two render as separate pages.

### C2 — The single mode shows a real pull request at parity [CRITICAL]
**Must be true:** The single-pull-request mode draws on this repository's own pull request records, and it shows the parts the shipped viewer shows: the narration levels, the diagrams, the scene art, the narration audio, the diff, and the intent and assessment sheet.
**Evidence to check:**
- With the ChromeDevTools MCP tools, open one pull request in the prototype and take a snapshot.
- Read the six parts against the same pull request in the shipped viewer. Each one is present in the prototype.
- Read the console messages. None reports a missing asset.
**Scoring:**
- 1.0 — the six parts all render for one pull request, and the console is clean.
- 0.5 — five of the six render, and the sixth names itself as unbuilt.
- 0.0 — the mode renders a fixture, or three or more parts are missing.

### C3 — The second mode reads as a design, and says what it is
**Must be true:** The multi-pull-request mode shows the select-and-recommend path as a design. A reader can tell it apart from a built surface, so nobody mistakes a sketch for working behaviour.
**Evidence to check:**
- With the ChromeDevTools MCP tools, switch to the second mode and take a snapshot.
- Read the surface for the selection step and for the path a reviewer would accept. Both read.
- Read any statement the mode makes about its own state. It says the mode is a design rather than a shipped surface.
**Scoring:**
- 1.0 — the second mode renders the select-and-recommend path and states what it is.
- 0.5 — it renders and states nothing, so a reader may read it as built.
- 0.0 — the second mode renders nothing, or the switch has no second position.

### C4 — The engineer's decision reaches the record [CRITICAL]
**Must be true:** This slice's end is an approval. The approval, or the change the engineer asked for, appears where a later session reads it.
**Evidence to check:**
- Read `docs/plans/cobuilder-viewer/00-status.md`. The record holds the prototype's outcome and its date.
- Confirm the record names the prototype's own location, so a reader can open the artifact that was reviewed.
**Scoring:**
- 1.0 — the record holds the approval, its date, and the artifact's location.
- 0.5 — the record holds an approval with no date or no location.
- 0.0 — the record holds nothing, so E7 rests on a conversation nobody wrote down.

## Regression check
- All tests that passed before this slice must still pass.
- Files outside the slice scope must remain unchanged: `shared/`, `plugins/pr/`, and `plugins/artifact/scripts/`.
- The prototype lives outside the shipped viewer, so nothing it adds may enter `plugins/artifact/viewer/index.html`.

## Out of scope — do not penalise
- The production FlightDeck surface. E7 ports what this prototype proves.
- The merge-order simulator, the ledger's three state subtypes, and the path runner. All three defer with E12, E14, and E15.
- The Work surface's own arrangement. E5 owns it.
