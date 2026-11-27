Kind: test-suite

# Rubric: Slice 27 — E7 native ready for slices, with parity

Feature: beads-storage
Epic: beads-storage/E7
Slice goal: `next_ready("slice", under)` runs `bd ready -t task --label cb [--parent X]`, and `native_ready` is true. The parity test compares the adapter with the projector on the corpus. The adapter refuses on a legacy tracker. The corpus deferred date is 2099-12-31.
Test command: `uv run pytest tests/test_tracker_beads_native_ready.py tests/test_tracker_contract.py -q -m ''`

The real-bd tests carry the pytest mark `slow`. The default run skips them, so the command adds `-m ''` to run them. They skip without `bd`. A skip counts as no evidence for a criterion that names a live test.

## Criteria

### C1 — The ready argv is exact, and the adapter maps `under` [CRITICAL]

**Must be true:** `ready_argv` returns `bd ready -t task --label cb --json --limit 0`, with `--parent <bd id>` only for an `under` that names an epic or a program. The adapter maps the cb id to the bd id and turns each returned row into a cb record through the one list read.

**Evidence to check:** Read the replay tests of the argv with and without `under`. Check the recorded call list: one ready call and one list read.

**Scoring:**
- 1.0: both argv forms are asserted, and the call list holds one ready call.
- 0.5: the argv is asserted, but the `under` mapping is not.
- 0.0: the argv misses `--label cb`, or the adapter computes slice ready itself.

### C2 — Live parity holds for each kind and for `under` [CRITICAL]

**Must be true:** The live test compares the adapter with the projector for `program`, `epic`, and `slice`, and for `under` an epic and a program. The corpus holds one epic with an open PR, one deferred epic, one in_progress epic, and one program with two ordered epics. The test compares sets, not the first item.

**Evidence to check:** Run the file with `-m ''` and `bd` on the path. A skip counts as no evidence. Read the five comparisons.

**Scoring:**
- 1.0: the test runs and all five comparisons pass.
- 0.5: the test runs, but one comparison is missing.
- 0.0: the test skips with no transcript, or a comparison fails while `native_ready` is true.

### C3 — `native_ready` is true only when parity holds [CRITICAL]

**Must be true:** `Capabilities.native_ready` is true for beads, and `doctor` shows it. The tests that asserted false are updated. A legacy tracker makes `next_ready` for slices raise `AdapterError` that names `migrate-mapping`.

**Evidence to check:** Read the capability test, the doctor test, and the legacy refusal test.

**Scoring:**
- 1.0: the flag, the doctor value, and the refusal are asserted, and parity passes in the same run.
- 0.5: the flag is true, but the refusal has no test.
- 0.0: the flag is true while a parity case fails.

### C4 — The fake and the epic kind follow bd; the fixture date moves

**Must be true:** The fake adapter ready rule treats a slice as ready only when each ancestor is unblocked and not deferred, and a PR never counts. The corpus deferred date is `2099-12-31`. The old `tests/test_tracker_beads_ready.py` is removed.

**Evidence to check:** Read the fake ready tests and the fixture. List the test files.

**Scoring:**
- 1.0: all three hold.
- 0.5: the rule and the date hold, but the old test file remains.
- 0.0: the fixture date is a near date.

## Regression check

- `uv run pytest tests/test_tracker_beads.py tests/test_tracker_cli.py -q` passes.
- `claim-slice` still passes its tests.

## Out of scope — do not penalise

- `claim-next`. That belongs to slice 28.
- The migration. That belongs to slice 29.
- Reading a past defer date as not deferred (open question 3 of the design).
