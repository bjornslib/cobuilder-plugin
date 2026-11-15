# Rubric: Slice 19 — structure_evidence.py keeps to the size guide

Feature: structure-coaching
Epic: E9
Slice goal: see row 19 of docs/plans/structure-coaching/04-slices.md
Test command: uv run pytest tests -q

## Criteria

### C1 — The size [CRITICAL]
**Must be true:** `shared/structure_evidence.py` has 200 lines or fewer, and each moved function sits in a module under `shared/structure/` that also keeps the guide.
**Evidence to check:**
- wc -l the files.
**Scoring:**
- 1.0 — 200 or fewer
- 0.0 — over 200

### C2 — No change in behaviour [CRITICAL]
**Must be true:** Every test of the evidence script, the repo record, the trend option, and the import failure passes, and the script runs on this repo with exit 0.
**Evidence to check:**
- Run the tests.
- Run the script with --repo and with --base.
**Scoring:**
- 1.0 — all pass
- 0.0 — a test fails
