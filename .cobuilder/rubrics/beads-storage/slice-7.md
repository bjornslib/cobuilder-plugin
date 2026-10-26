Kind: test-suite

# Rubric: Slice 7 — Beads writes on recorded transcripts

Feature: beads-storage
Epic: E2
Slice goal: Each beads write case sends the argument list recorded in its transcript. The claim reads back the assignee. The `metadata.cb` envelope survives a create and a read. Write cases pass for beads.
Test command: `uv run pytest tests/test_tracker_beads_write.py -q`

## Criteria

### C1 — Each write sends the recorded argument list [CRITICAL]
**Must be true:** for each transcript in `tests/fixtures/tracker/beads/transcripts/`, the adapter call sends exactly the recorded `args`. A call that sends different arguments fails the test.
**Evidence to check:**
- `uv run pytest tests/test_tracker_beads_write.py -q ` exits 0.
- Read the transcript directory: it holds a recorded file for each write case. These are `create_program`, `create_epic`, `create_slice`, `open_pull_request_steps`, `set_slice_state_steps`, and `claim_slice_steps`. The engineer agreed on 2026-10-19 to drop the single-call `create_pr`, `set_state`, and `claim_slice` files, because the `*_steps` files replay the same calls.
- Make one temporary change to a recorded `args` value in a copy of a transcript, and run the test. It must fail.
**Scoring:**
- 1.0 — all six write cases pass, and the altered copy fails.
- 0.5 — all six pass, but the altered copy does not fail.
- 0.0 — any transcript is missing, or a test fails.

### C2 — The claim reads back the assignee and rejects a mismatch [CRITICAL]
**Must be true:** a claim sends an `update` call, then a `show --json` call. When the read-back shows the claimant, the claim succeeds. When the read-back shows another assignee, the claim raises the claim error and reports no success.
**Evidence to check:**
- `uv run pytest tests/test_tracker_beads_write.py -q ` exits 0.
- Read `test_claim_slice_maps_cb_id_then_reads_back_the_claimant` and `test_claim_slice_raises_when_read_back_shows_another_claimant`. One asserts the success path, and the other asserts the error path.
**Scoring:**
- 1.0 — both paths are tested and pass.
- 0.5 — only the success path is tested.
- 0.0 — the read-back is missing, or a test fails.

### C3 — The envelope round trip keeps every value
**Must be true:** the envelope written through `create` for a slice returns the same values from `show --json`. The `score` value 0.92 keeps its type and value. A string value such as `gate1` keeps its exact text.
**Evidence to check:**
- `uv run pytest tests/test_tracker_beads_write.py -q ` exits 0, and `uv run pytest tests/test_tracker_beads.py -q` exits 0.
- Read `test_create_record_round_trip_types` and `test_create_record_round_trip_on_real_bd`. They compare the written envelope with the read envelope, by value and by type.
**Scoring:**
- 1.0 — every key matches, and the test compares types as well as values.
- 0.5 — every key matches, but the test compares values only.
- 0.0 — any key differs, or the test fails.

## Regression check

- `uv run pytest tests/test_tracker_beads.py -q -k "list_json or hooked or capabilities"` still passes. These are the slice 6 read cases.
- `uv run pytest tests/test_tracker_contract.py -q -k beads` still passes case 7.

## Out of scope — do not penalise

- The `seed-from-files` dry run (slice 8).
- The fresh clone check (slice 9).
- Contract cases 1, 2, and 6. They belong to E1 and the fake adapter.
- The internal structure of `beads.py`, including its helper names.
