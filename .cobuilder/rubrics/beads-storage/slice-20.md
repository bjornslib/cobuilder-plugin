Kind: test-suite

# Rubric: Slice 20 — E5 native ready on beads: parity check

Feature: beads-storage
Epic: beads-storage/E5
Slice goal: The slice checks if `bd ready` can replace the adapter ready rule. In bd 1.3.0 the parity check fails. The adapter keeps computing ready, `native_ready` stays false, and the code has no `ready_argv` and no hybrid. The deliverable is the parity evidence (transcripts, a live test, and notes) and the false flag.
Test command: `uv run pytest tests/test_tracker_beads_ready.py tests/test_tracker_contract.py -q -m ''`

The live test `test_live_bd_ready_differs_and_adapter_equals_projector` carries the pytest mark `slow`. The default run skips it, so the command adds `-m ''` to run it. It skips without `bd`. A skip counts as no evidence for C1.

## Criteria

### C1 — The adapter matches the projector for each kind and under, and the bd difference is recorded [CRITICAL]

**Must be true:** For `program`, `epic`, and `slice`, and for the `under` case `demo-E1`, the beads adapter `next_ready` result equals the projector result on the same corpus. The slice also records the bd difference with transcripts: `bd ready` misses the children of a blocked parent, and it lists the pull request task and the deferred epic.

**Evidence to check:**
- Run `tests/test_tracker_beads_ready.py` with `-m ''` and with `bd` on the path. `test_replay_next_ready_equals_projector` must cover all three kinds. `test_replay_next_ready_under_equals_projector` must cover `demo-E1`.
- `test_live_bd_ready_differs_and_adapter_equals_projector` must assert the native `bd ready` titles, that `demo-E1-s3` is missing from them, and that the adapter equals the projector for each kind and for `under`.
- `test_recorded_bd_ready_lists_a_pull_request_and_a_deferred_epic` and `test_recorded_bd_ready_misses_the_slice_under_a_blocked_epic` read the transcript `ready-bd-corpus`. Confirm that the transcript exists under `tests/fixtures/tracker/beads/transcripts/`. Confirm that `shared/tracker-adapter-beads.md` states the difference.

**Scoring:**
- 1.0: the tests run with `bd`, all four adapter comparisons match, and the bd difference has a transcript and a note.
- 0.5: the comparisons match, but the difference has no transcript or no note, or the `under` case is missing.
- 0.0: the live test skips with no transcript, a comparison fails, or the tests do not exist.

### C2 — The adapter returns no pull request, no deferred epic, and no molecule root [CRITICAL]

**Must be true:** The adapter `next_ready` result never holds a pull request record, a deferred epic, or a molecule root. The tests assert this on the adapter result, not on the bd output. The code has no `ready_argv`.

**Evidence to check:** Read the tests that assert the adapter result. The pull request `pr-101` and the deferred epic `demo-E3` must be absent from the adapter result for each kind. Read `test_recorded_molecule_root_has_type_molecule` and the note on the molecule root. Confirm that `shared/tracker_port/bd_runner.py` and `shared/tracker_port/beads.py` have no `ready_argv`.

**Scoring:**
- 1.0: the adapter result has none of the three records, the tests assert it, and the code has no `ready_argv`.
- 0.5: two of the three are asserted on the adapter result.
- 0.0: a record appears in the adapter result, a rule is missing, or `ready_argv` exists.

### C3 — `native_ready` stays false, matched by the recorded difference

**Must be true:** `Capabilities.native_ready` is false for beads. The recorded bd difference in C1 is the reason. The code has no hybrid ready that calls `bd ready` and then filters.

**Evidence to check:** Read the flag in `shared/tracker_port/beads.py`. Read `test_native_ready_is_false` and `test_doctor_shows_native_ready_false`. Confirm that the adapter computes ready from `blocked_by`, as the projector does.

**Scoring:**
- 1.0: the flag is false, the tests assert it, and the recorded difference explains it.
- 0.5: the flag is false, but the notes do not state the reason.
- 0.0: the flag is true while the recorded bd result differs from the projector.

## Regression check

- `uv run pytest tests/test_tracker_beads.py -q` passes.
- The contract run still passes the next-ready cases on the fake adapter and on beads.

## Out of scope — do not penalise

- The atomic claim. That belongs to slice 19.
- The pull request gate. That belongs to slice 21.
- The formula. That belongs to slice 22.
- Performance of `bd ready` on large corpora.
