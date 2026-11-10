# Rubric: Slice 12 — The unverified rows pass in a test workspace

Feature: `linear-tracker-adapter`
Epic: E6 — The live smoke test
Slice goal: A live test in a test workspace passes the claim order, the repeated create, the three-level chain, the login map, the archived read by id, and the metadata size, and the default run skips it.
Test command: `uv run pytest tests -q`

## Criteria

### C1 — The default run skips the live test [CRITICAL]

**Must be true:** `uv run pytest tests -q` skips `tests/test_tracker_linear_live.py` with a reason, and needs no key.

**Evidence to check:**
- Run `uv run pytest tests/test_tracker_linear_live.py -q` with `LINEAR_API_KEY` unset and read the skip line.

**Scoring:**
- 1.0 — skipped with a clear reason
- 0.5 — skipped with no reason
- 0.0 — the run fails or needs a key

### C2 — The rows pass in a test workspace [CRITICAL]

**Must be true:** With a key and a test team, the live test passes the claim order, the repeated create, the three-level chain, the login map, the archived read by id, and the metadata size. The engineer runs it, and the output is in the epic notes.

**Evidence to check:**
- Read the pasted live output in the epic notes.
- Check that each of the six rows has a pass or a recorded failure.

**Scoring:**
- 1.0 — six rows recorded with output
- 0.5 — some rows recorded
- 0.0 — no live output

### C3 — Recordings replay, the fake matches, and the abort rules are checked

**Must be true:** The live responses are recorded under `tests/fixtures/tracker/linear/`. A test in the default run replays them against `LinearClient`. `FakeLinear` matches each live result. The notes state whether an abort rule of the design fires.

**Evidence to check:**
- Run `uv run pytest tests/test_tracker_linear_replay.py -q`.
- Read the notes for each row and the abort rules.

**Scoring:**
- 1.0 — every row maps to a fake change or a note, and the abort rules are stated
- 0.5 — abort rules not stated
- 0.0 — a row contradicts the fake with no note

## Regression check

- All tests that passed before this slice must still pass.
- Files outside the slice scope must remain unchanged. Protected scope: slices 1 to 11 tests.

## Out of scope — do not penalise

- the install offer.
