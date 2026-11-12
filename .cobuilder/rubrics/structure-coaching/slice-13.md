# Rubric: Slice 13 — The whole-repository findings file

Feature: structure-coaching
Epic: E6
Slice goal: see row 13 of docs/plans/structure-coaching/04-slices.md
Test command: uv run pytest tests -q

## Criteria

### C1 — Findings in old files [CRITICAL]
**Must be true:** `structure_evidence.py --repo --out <path>` on a fixture repo reports a crowded folder, a name family, and a boundary edge in committed old files, which the change view does not report.
**Evidence to check:**
- Run the script on a fixture repo and read the record.
**Scoring:**
- 1.0 — all three
- 0.5 — one or two
- 0.0 — none

### C2 — The order by change count [CRITICAL]
**Must be true:** The findings of the folder with more commits in the last 90 days come first.
**Evidence to check:**
- Read the order in the record for a fixture with known commit counts.
**Scoring:**
- 1.0 — right order
- 0.5 — —
- 0.0 — another order

### C3 — The folder table
**Must be true:** Each folder with three or more code files has `n`, `internal`, `out`, `in`, `cf`, `instability`, `groups`, and `test_share`. A folder with known edges gives the right `cf` and `instability`. A folder with no edges gives `null`.
**Evidence to check:**
- Run the tests for structure_repo.py, or compute the values for the fixture by hand.
**Scoring:**
- 1.0 — all hold
- 0.5 — one value wrong
- 0.0 — no table

### C4 — The trend [CRITICAL]
**Must be true:** `compare_findings` gives new, worse, unchanged, and fixed for two fixture records.
**Evidence to check:**
- Run the unit tests for compare_findings.
**Scoring:**
- 1.0 — all four
- 0.5 — two or three
- 0.0 — none

### C5 — The record shape
**Must be true:** The record has the keys `schema`, `commit`, `since`, `findings`, `folders`, and `not_analysed`, and each finding has a `key` and `changes_90d`.
**Evidence to check:**
- Read a record.
**Scoring:**
- 1.0 — all keys
- 0.5 — one missing
- 0.0 — more missing

### C6 — The whole-repository signals [CRITICAL]
**Must be true:** Two `util.py` files in two folders give one twin finding, and two `page.tsx` files give none. A pair of files in different folders committed together in 5 of 6 commits gives one co-change group. A block in three files gives one duplicate group, not three pairs. A window of fewer than 20 commits in 90 days widens to 365 days, and the record states the window.
**Evidence to check:**
- Run the tests for structure_repo.py on a fixture repo.
**Scoring:**
- 1.0 — all five hold
- 0.5 — three or four hold
- 0.0 — fewer

## Regression check
- All tests that passed before this slice must still pass.
- Files outside the slice scope in the epic design must remain unchanged.

## Out of scope — do not penalise
- The review report text (slice 14)
- The refactor skill (E8)
