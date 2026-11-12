# Rubric: Slice 8 — Tracer: VALIDATE writes the Structure block from the evidence packet

Feature: structure-coaching
Epic: E4
Slice goal: see row 8 of docs/plans/structure-coaching/04-slices.md
Test command: uv run pytest tests -q

## Criteria

### C1 — The packet holds Python contract drift [CRITICAL]
**Must be true:** On a fixture repo, a base commit and a work-tree change to a public function give one event for a changed raise, one for a new required parameter, and one for a changed return annotation. Each event names the untouched files that use the symbol.
**Evidence to check:**
- Run `uv run shared/structure_evidence.py --base <sha> --out <path>` on a fixture repo, or read the test that does.
- Read the packet.
**Scoring:**
- 1.0 — three events of the right kind, each with its callers
- 0.5 — events present, kind or callers wrong
- 0.0 — no events

### C2 — The move filter and private names
**Must be true:** A public function that moved to another file gives no `removed` event. A change to a name with a leading underscore gives no event.
**Evidence to check:**
- Run the script on a fixture repo with a move and a private change.
**Scoring:**
- 1.0 — both hold
- 0.5 — one holds
- 0.0 — neither

### C3 — Boundary edges on the diff
**Must be true:** A path string to another context in an added line gives a boundary-edge finding. The same text in an unchanged line gives none.
**Evidence to check:**
- Run the script on a fixture repo with synthetic boundary records.
**Scoring:**
- 1.0 — both hold
- 0.5 — one holds
- 0.0 — neither

### C4 — The packet shape and failure
**Must be true:** The packet has the keys `schema`, `base`, `files`, `findings`, `evidence`, and `not_analysed`. A bad base gives a `not_analysed` line and exit 0.
**Evidence to check:**
- Run the script with a bad base and read the exit code and the packet.
**Scoring:**
- 1.0 — both hold
- 0.5 — one holds
- 0.0 — neither

### C5 — The block labels each finding [CRITICAL]
**Must be true:** A blind VALIDATE on a fixture slice ran the script with the base and the out path from its spawn message, and wrote a ### Structure block. The block labels each packet finding confirmed, accepted, or dismissed, with evidence and one line of reason, and gives the contract drift, cohesion, and dependencies lines.
**Evidence to check:**
- Read the blind-pass transcript for the script call and its arguments.
- Read the fixture attempt file.
**Scoring:**
- 1.0 — the script ran, each finding labelled, three lines present
- 0.5 — block present, a label or a line missing
- 0.0 — no script run or no block

### C6 — The block stays outside the score [CRITICAL]
**Must be true:** overall_score in the fixture attempt file is the plain average of the rubric criteria only.
**Evidence to check:**
- Recompute the average from the criterion scores in the fixture attempt file.
**Scoring:**
- 1.0 — equal
- 0.5 — —
- 0.0 — the block changed the score

### C7 — A FAIL passes the block to GREEN
**Must be true:** On a failed fixture attempt, slice-N-feedback.md holds the block.
**Evidence to check:**
- Read the fixture feedback file.
**Scoring:**
- 1.0 — present
- 0.5 — partial
- 0.0 — absent

### C8 — The slice base is recorded
**Must be true:** `slice-loop.md` tells the main agent to record the commit before RED, and to pass the script path, the base, and the packet path to VALIDATE.
**Evidence to check:**
- Read slice-loop.md and check that each named path or option exists in the script.
**Scoring:**
- 1.0 — all three named and real
- 0.5 — one missing
- 0.0 — none

## Regression check
- All tests that passed before this slice must still pass.
- Files outside the slice scope in the epic design must remain unchanged.

## Out of scope — do not penalise
- A spike signal (slice 11)
- The vocabulary leads (slice 12)
- Scored structure criteria (E5 decides)
