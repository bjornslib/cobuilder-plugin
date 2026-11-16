# Rubric: Slice 3 — The key, the request budget, and prepare

Feature: `linear-tracker-adapter`
Epic: E1 — The adapter reads the plan
Slice goal: A full read of 265 issues takes at most 8 requests, a rate-limit answer gives exit 3 with the reset time, a missing key gives exit 3, and `prepare` checks the key, team, and states.
Test command: `uv run pytest tests -q`

## Criteria

### C1 — The request budget holds [CRITICAL]

**Must be true:** A full read of 265 issues through `LinearClient` over a stub transport at page size 50 makes at most 8 requests.

**Evidence to check:**
- Run `uv run pytest tests/test_tracker_linear_client.py -q` and find the budget test.
- Read the test and check that it builds 265 issues and reads the request count from the client.

**Scoring:**
- 1.0 — the count is asserted at 8 or fewer on 265 issues
- 0.5 — the test uses fewer than 265 issues
- 0.0 — the count is not asserted

### C2 — Errors name their cause with exit 3 [CRITICAL]

**Must be true:** A rate-limit answer raises `AdapterError` that carries the reset time. A missing `LINEAR_API_KEY` raises `AdapterError` that names the variable. The CLI exits 3 in both cases. `doctor` shows `requests_left` and `reset_at` from the last response headers.

**Evidence to check:**
- Run the error tests and the `doctor` test.
- Run `LINEAR_API_KEY= uv run shared/tracker.py --config <linear config> doctor` and read the exit code and message.

**Scoring:**
- 1.0 — both messages, exit 3, and the `doctor` values are correct
- 0.5 — one of the two is correct
- 0.0 — the key is read from a file or the exit code is wrong

### C3 — Prepare checks and creates

**Must be true:** `prepare` reports a missing mapped state, creates a missing label, and returns `changed`.

**Evidence to check:**
- Run the prepare tests.
- Read the return value for a team with a missing state and for a missing label.

**Scoring:**
- 1.0 — all three cases pass
- 0.5 — the label case is missing
- 0.0 — `prepare` writes to Linear without a label check

## Regression check

- All tests that passed before this slice must still pass.
- Files outside the slice scope must remain unchanged. Protected scope: slices 1 and 2 tests.

## Out of scope — do not penalise

- every write, claim, and `sync`.
