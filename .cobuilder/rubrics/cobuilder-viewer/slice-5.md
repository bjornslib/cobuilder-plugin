# Rubric: Slice 5 — the Work prototype, reviewed

Feature: cobuilder-viewer
Epic: cobuilder-viewer/E4
Slice goal: The prototype renders this repository's own designs across the Work board, and the engineer approves it or names what to change
Test command: `uv run --with pytest pytest tests/ -v`

The evidence is the prototype as a reader meets it, the bundle it reads, and a recorded decision.

## Criteria

### C1 — The prototype renders this repository's own records [CRITICAL]
**Must be true:** The prototype reads the bundle in this repository. It shows real designs, real stages, and real record counts. It is not a fixture page.
**Evidence to check:**
- With the ChromeDevTools MCP tools, open the prototype. Take a snapshot and read the items it lists.
- Compare the item count against `data/index.json`'s design count. The two agree.
- Set one design aside in the index, reload, and confirm the prototype follows.
**Scoring:**
- 1.0 — the prototype renders this repository's designs, and the count matches the index.
- 0.5 — it renders this repository's designs and one item is missing or invented.
- 0.0 — it renders fixtures, or it fails to load the bundle.

### C2 — Every item states what it holds [CRITICAL]
**Must be true:** An item states its stage and what it carries, so a reader compares two items without opening either. The design's own outcome statement is not enough on its own.
**Evidence to check:**
- Take a snapshot and read one item. It states the design's stage.
- Read the same item's record marks or figures against the design's records in `data/designs.js`. They agree.
- Open the sparse design `inflight-record-store` and read its item. It states what that design lacks.
**Scoring:**
- 1.0 — an item states its stage and what it holds, and a sparse design states its gap.
- 0.5 — an item states its stage and not what it holds.
- 0.0 — an item states neither, or it lists records the design does not carry.

### C3 — The board opens a design
**Must be true:** A reader who picks an item reaches that design's own content. The prototype is a way in, not a dead end.
**Evidence to check:**
- With the ChromeDevTools MCP tools, press one item. The prototype renders that design's content.
- Press another item. It renders the second design.
**Scoring:**
- 1.0 — a press opens that item's content, and a second press opens the second item's.
- 0.5 — a press opens content that belongs to another item.
- 0.0 — a press does nothing.

### C4 — The engineer's decision reaches the record [CRITICAL]
**Must be true:** This slice's end is an approval. The approval, or the change the engineer asked for, appears where a later session reads it.
**Evidence to check:**
- Read `docs/plans/cobuilder-viewer/00-status.md`. The record holds the prototype's outcome and its date.
- Confirm the record names the prototype's own location, so a reader can open the artifact that was reviewed.
**Scoring:**
- 1.0 — the record holds the approval, its date, and the artifact's location.
- 0.5 — the record holds an approval with no date or no location.
- 0.0 — the record holds nothing, so the next slice rests on a conversation nobody wrote down.

## Regression check
- All tests that passed before this slice must still pass.
- Files outside the slice scope must remain unchanged: `shared/`, `plugins/pr/`, and `plugins/artifact/scripts/`.
- The prototype lives outside the shipped viewer, so nothing it adds may enter `plugins/artifact/viewer/index.html`.

## Out of scope — do not penalise
- The production surface. E5 ports what this prototype proves, and it owns the shipped behaviour.
- The board's final arrangement, if the engineer asks for a change before approving.
- Anything about FlightDeck, publishing, or a deferred epic.
