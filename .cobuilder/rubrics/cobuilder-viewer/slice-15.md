# Rubric: Slice 15 — a single pull request at parity

Feature: cobuilder-viewer
Epic: cobuilder-viewer/E7
Slice goal: A reader opens one pull request and reads its four narration levels, its diagrams, its art, its audio, and its intent and assessment sheet, as the shipped viewer does today
Test command: `uv run --with pytest pytest tests/ -v`

Serve the bundle before any browser check: `python3 -m http.server` rooted at
`.cobuilder-architect/self/`. Measure parity against the shipped viewer's own output for
one merged pull request the bundle narrates.

## Criteria

### C1 — The four narration levels render [CRITICAL]
**Must be true:** A reader opens one pull request and reads its four levels, each with its own title and its own narration. The levels move between one another as they do today.
**Evidence to check:**
- With the ChromeDevTools MCP tools, open one pull request on the FlightDeck surface. Take a snapshot at each level.
- Read each level's title and narration against the same level in the shipped viewer. They match.
- Move between levels and confirm each one renders its own content.
**Scoring:**
- 1.0 — four levels render, each matches the shipped viewer, and the reader can move between them.
- 0.5 — fewer than four render, or one level shows another level's text.
- 0.0 — the surface renders one level or none.

### C2 — The diagrams, the art, and the audio all resolve [CRITICAL]
**Must be true:** A pull request's own assets render. The three diagram levels draw, the scene art shows, and the narration plays from the bundle.
**Evidence to check:**
- With the ChromeDevTools MCP tools, read the network requests for one pull request. Each diagram, each hero frame, and each audio file the record names responds with a success status.
- Confirm level 4 carries no diagram, as the bundle records it.
- Press play on one level and confirm the audio element's source resolves.
**Scoring:**
- 1.0 — every named asset resolves, level 4 carries no diagram, and the audio source resolves.
- 0.5 — one asset family fails to resolve, and the surface states the gap.
- 0.0 — the art or the narration is missing with no statement.

### C3 — The diff and the sheets render [CRITICAL]
**Must be true:** The diff reads as it reads today, and the intent and assessment sheet opens with the pull request's own records.
**Evidence to check:**
- With the ChromeDevTools MCP tools, open one pull request's diff. Read its file entries. Read the shipped viewer's own output for the same pull request. The two agree.
- Press the control that opens the intent and assessment sheet. It opens with that pull request's intent and its assessment verdict.
**Scoring:**
- 1.0 — the diff matches the shipped viewer's entries, and the sheet opens with the pull request's own records.
- 0.5 — the diff matches and the sheet holds another pull request's records.
- 0.0 — the diff renders nothing, or the sheet opens empty.

### C4 — The mode switch offers the second mode and says it is not built
**Must be true:** The surface carries the mode switch the design gives it, and the second mode is not a dead control. A reader learns that the multi-pull-request mode is not built yet.
**Evidence to check:**
- With the ChromeDevTools MCP tools, read the mode switch. It offers both modes.
- Read the second mode's state. It either renders a stated placeholder or states that it is not built.
- Confirm the first mode still renders after the switch is read.
**Scoring:**
- 1.0 — the switch offers both modes, the second states what it is, and the first still works.
- 0.5 — the switch offers both and the second renders a blank surface.
- 0.0 — the switch is missing, or the second mode renders as a broken surface.

### C5 — An open pull request states what it lacks
**Must be true:** A pull request with fewer records renders the parts it has, and states the parts it does not. It never renders an empty level.
**Evidence to check:**
- With the ChromeDevTools MCP tools, open a pull request the bundle carries little narration for.
- Read each part. The parts it holds render, and each part it lacks states the absence in place.
- Read the console messages. None reports an error.
**Scoring:**
- 1.0 — the surface renders what exists and states what does not, with a clean console.
- 0.5 — one missing part renders as an empty block.
- 0.0 — the surface errors, or it renders nothing for that pull request.

## Regression check
- All tests that passed before this slice must still pass, including every case in `tests/test_sections.py`, `src/shell/Board.test.tsx`, and `src/shell/readiness.test.ts`.
- Files outside the slice scope must remain unchanged: the Work surface's own behaviour, `shared/`, and `plugins/artifact/scripts/export_artifact.py`.
- This slice leaves a pull request's data in the bundle unchanged. The surface reads it and writes nothing.

## Out of scope — do not penalise
- The joins rail. Slice 16 owns it.
- The multi-pull-request mode and the merge-order path. They defer with E11 to E13.
- Publishing a pull request as an Artifact. It defers with E16.
- The diff's own rendering. The team ports it as it stands.
