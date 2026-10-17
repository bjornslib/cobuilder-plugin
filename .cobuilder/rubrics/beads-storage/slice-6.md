Kind: test-suite

# Rubric: Slice 6 — Beads reads match the fake adapter

Feature: beads-storage
Epic: E2
Slice goal: The beads adapter reads a recorded `bd list --json` array and returns the same records as the fake adapter for the same corpus. Read cases pass, and contract case 7 (projector parity) passes for beads.
Test command: `uv run pytest tests/test_tracker_beads.py -q`

## Criteria

### C1 — The recorded beads rows map to the fake corpus records [CRITICAL]
**Must be true:** the records that the beads adapter builds from the recorded list output equal the records that the fake adapter builds from the same corpus, for all four kinds: program, epic, slice, and pr.
**Evidence to check:**
- `uv run pytest tests/test_tracker_beads.py -q -k list_json` exits 0.
- Read the test: it compares the two record sets by id, and it compares every field.
**Scoring:**
- 1.0 — all four kinds match, and the test compares every field.
- 0.5 — three kinds match, or the test skips one field.
- 0.0 — any kind differs, or the test fails.

### C2 — Projector parity holds for beads [CRITICAL]
**Must be true:** the index that the projector builds from the beads records equals the checked-in golden file for the same corpus.
**Evidence to check:**
- The contract test case 7 runs for the beads adapter and passes: `uv run pytest tests/test_tracker_contract.py -q -k beads`.
- Read `tests/test_tracker_contract.py`: the beads adapter appears in the adapter list, and the case compares to `tests/fixtures/tracker/expected-index.json`.
**Scoring:**
- 1.0 — the case passes for beads, and the golden file is the comparison target.
- 0.5 — the case passes, but it compares to a copy of the golden file, not the file itself.
- 0.0 — the case fails for beads, or beads is missing from the adapter list.

### C3 — Status, version, and capability mapping hold
**Must be true:** a row with status `hooked` reads as `in_progress`. A row whose `metadata.cb.v` is not 1 raises an error that names the bad value. The capability report has `atomic_claim` false and `rich_envelope` true.
**Evidence to check:**
- `uv run pytest tests/test_tracker_beads.py -q -k "hooked or unknown_metadata_version or capabilities"` exits 0.
- Read the three test functions: each one asserts the stated value.
**Scoring:**
- 1.0 — all three assertions hold and pass.
- 0.5 — two of the three hold.
- 0.0 — one or none holds, or a test fails.

## Regression check

- `uv run pytest tests/test_tracker_contract.py -q` shows the fake adapter still passes every case that passed before slice 6.
- The fake adapter source has no diff from its state before slice 6.
- On a machine without `bd` or a beads workspace, `uv run pytest tests/test_tracker_contract.py -q` exits 0. The beads entry skips, and the skip line names the reason.

## Out of scope — do not penalise

- Write cases, the claim read-back, and the metadata round trip (slice 7).
- The seed script (slice 8) and the fresh clone check (slice 9).
- The GitHub and Linear adapters, and the skill migration.
- The internal structure of `beads.py`, including its helper names.
