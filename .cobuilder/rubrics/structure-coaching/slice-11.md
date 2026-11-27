# Rubric: Slice 11 — Duplicated code and consumer locality in the packet

Feature: structure-coaching
Epic: E4
Slice goal: see row 11 of docs/plans/structure-coaching/04-slices.md
Test command: uv run pytest tests -q

## Criteria

### C1 — A copied block gives one finding [CRITICAL]
**Must be true:** On a fixture repo, a slice that adds a file with a block of 8 lines copied from an old file gives one `duplicate-block` finding with `lines`, `other`, `other_lines`, and `size`.
**Evidence to check:**
- Run `structure_evidence.py` on the fixture and read the packet, or run the test that does.
**Scoring:**
- 1.0 — one finding with all facts
- 0.5 — a finding with a fact missing, or more than one finding
- 0.0 — no finding

### C2 — The filters hold [CRITICAL]
**Must be true:** A block of literal rows with fewer than 4 distinct lines gives no finding (filter A). A block of 4 or more named-argument lines gives no finding (filter B). A copied block in an unchanged old line gives no finding.
**Evidence to check:**
- Run the script or the tests on each of the three cases.
**Scoring:**
- 1.0 — all three hold
- 0.5 — two hold
- 0.0 — fewer

### C3 — One finding for a pair of slice files
**Must be true:** When the slice adds both copies, the packet holds one finding for the pair.
**Evidence to check:**
- Run the case on a fixture repo.
**Scoring:**
- 1.0 — one finding
- 0.5 — —
- 0.0 — two findings or none

### C4 — Consumer locality is evidence only [CRITICAL]
**Must be true:** An added file that two files in one other folder import gives an `evidence.consumer_locality` entry with `importers_by_folder` and `sole_consumer_folder`. No `findings` entry holds it. When that consumer folder imports 3 or more files of the folder of the file, the entry is absent.
**Evidence to check:**
- Run the case and the layer-filter case on a fixture repo.
**Scoring:**
- 1.0 — both cases right, and no finding
- 0.5 — one case right
- 0.0 — a `findings` entry, or both cases wrong

### C5 — No dropped signal
**Must be true:** The packet holds no TypeScript drift and no missing-partner finding, because the spike dropped both from VALIDATE.
**Evidence to check:**
- Grep the evidence modules for those signal names.
**Scoring:**
- 1.0 — none
- 0.5 — —
- 0.0 — a dropped signal appears

## Regression check
- All tests that passed before this slice must still pass.
- Files outside the slice scope in the epic design must remain unchanged.

## Out of scope — do not penalise
- Duplicate groups and twin names in the whole-repository view (slice 13)
- The vocabulary leads (slice 12)
