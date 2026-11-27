# Rubric: Slice 8 — Append and read

Feature: priority-dev-spike
Epic: E3
Slice goal: `uv run priority log append` twice with one idempotency key stores one row, and `priority log read --from 0` lists rows in order.
Test command: `uv run pytest priority-dev/tests -q`

## Criteria

### C1 — A repeated key stores one row [CRITICAL]
**Must be true:** two appends with the same key give one row and the same `seq`.
**Evidence to check:**
- Run the contract test against Postgres.
**Scoring:**
- 1.0 — the test passes.
- 0.5 — the test passes only with a retry.
- 0.0 — two rows exist.

### C2 — Rows read back in order from a cursor
**Must be true:** `read --from N` returns rows with `seq` above N in ascending order.
**Evidence to check:**
- Run the read test.
**Scoring:**
- 1.0 — passes.
- 0.5 — passes for one case.
- 0.0 — fails.

### C3 — The database runs in Docker on 127.0.0.1 with a named volume
**Must be true:** `docker compose up` starts Postgres 17 bound to 127.0.0.1 with a named volume, and the data survives a restart.
**Evidence to check:**
- Run compose, append a row, restart, and read.
**Scoring:**
- 1.0 — the row survives.
- 0.5 — the service runs, but the row is lost.
- 0.0 — the service does not start.

## Regression check
- All tests that passed before this slice must still pass.
- Files outside `priority-dev/` must remain unchanged, except the committed reports named in the slice.

## Out of scope — do not penalise
- Behaviour that belongs to a later slice of the plan.
- The policy, the actuator, the attention queue, and the notifier.
