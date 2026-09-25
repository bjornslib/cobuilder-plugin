# Rubric: Slice 14 — the FlightDeck prototype, reviewed

Feature: cobuilder-viewer
Epic: cobuilder-viewer/E6
Slice goal: One work item renders as two accounts on one surface: the change's account shows a real pull request at parity, the rail groups its rows under Build and Review, and the engineer approves it or names what to change
Test command: `uv run --with pytest pytest tests/ -v`

The evidence is the prototype as a reader meets it, the records it draws from, and a
recorded decision. The dev entry serves it at
`http://localhost:5273/variations/flightdeck/dev.html`.

## Criteria

### C1 — One surface, two accounts, one grouped rail [CRITICAL]
**Must be true:** The prototype reads one work item as one surface. The rail holds two groups. Build reads the program's account, and it names Intent, Problem & Solution, Architecture, Epics, and Rubrics. Review reads the change's account, and it names Intent, Problem & Solution, Architecture, and File Diffs. No mode switch exists, and no press opens a second surface.
**Evidence to check:**
- With the ChromeDevTools MCP tools, open the dev entry. Take a snapshot.
- Read the rail's two group labels, then the rows under each one. The three middle names repeat across the groups.
- Press one row in each group. Each one renders its own section on the same surface, with the same frame, and no second page or second window opens.
- Read the page for a mode switch. None exists.
**Scoring:**
- 1.0 — both groups render on one surface, each account opens in place, and no switch exists.
- 0.5 — both groups render and a row press reloads the page.
- 0.0 — the surface shows one account only, or the two render as separate pages.

### C2 — The change's account shows a real pull request at parity [CRITICAL]
**Must be true:** The change's account draws on this repository's own pull request records, and it shows the parts the shipped viewer shows: the narration levels, the diagrams, the scene art, the narration audio, the diff, and the intent and assessment sheet. A part the bundle holds no record for reads as an absent part.
**Evidence to check:**
- With the ChromeDevTools MCP tools, walk the change's four rows and take a snapshot at each one.
- Read the six parts against that pull request's own records. Each part the bundle holds for it is present.
- Read the console messages. None reports a missing asset.
- Open a row whose record the bundle lacks. It states the absence in place.
**Scoring:**
- 1.0 — every part the bundle holds renders for one change, each absent part is stated, and the console is clean.
- 0.5 — one part the bundle holds fails to render, and its row states the gap.
- 0.0 — the account renders a fixture, or three or more parts are missing.

### C3 — The account mark separates the two accounts, and the jump crosses between them
**Must be true:** Every section of both accounts carries its account's mark, which is a word and a glyph with no fill. A press on a shared section moves a reader to the other account's section of the same name, and a section only one account carries offers no jump.
**Evidence to check:**
- With the ChromeDevTools MCP tools, open one section of each account. Read the mark on each. The two carry different words, and each carries a glyph. Neither carries a fill.
- Start on the program's Architecture section and press the jump. The change's Architecture section renders, and the address line names it.
- Open the change's File Diffs section. No jump renders on it.
**Scoring:**
- 1.0 — every section carries its account's mark, a shared section jumps across, and a lone section carries none.
- 0.5 — the mark renders on some sections only, or a jump appears on a lone section.
- 0.0 — no mark exists, so a reader cannot tell the two accounts apart.

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
- The shipped change's account, the grouped rail, the change's own address, and the account mark. E7's slices 15, 16, and 17 own all four.
- The prototype's other surface, which reads the whole open set. It defers with E11 to E13.
- The merge-order simulator, the ledger's three state subtypes, and the path runner. All three defer with E12, E14, and E15.
- The program's account's own arrangement. E5 owns it.
