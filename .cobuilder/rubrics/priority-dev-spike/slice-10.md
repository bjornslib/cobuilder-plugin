# Rubric: Slice 10 — Interpret from the log

Feature: priority-dev-spike
Epic: E3
Slice goal: A `run.stopped` event in the log leads to a `fact.run_digest` event and an `interpretation` event, written by the interpreter service.
Test command: `uv run pytest priority-dev/tests -q`

## Criteria

### C1 — One stop event gives one digest event and one interpretation event [CRITICAL]
**Must be true:** with a fake model, one `run.stopped` event gives exactly one of each event, linked by `seq`.
**Evidence to check:**
- Run the service test.
**Scoring:**
- 1.0 — passes.
- 0.5 — passes with a duplicate of one event.
- 0.0 — fails.

### C2 — Replaying the same event adds nothing
**Must be true:** reading the same `run.stopped` event again adds no event, through the idempotency key.
**Evidence to check:**
- Run the replay test.
**Scoring:**
- 1.0 — no new rows.
- 0.5 — one new row.
- 0.0 — many new rows.

### C3 — A model failure becomes an abstain event [CRITICAL]
**Must be true:** with an injected failure, the log holds an `abstain` event with a reason, and the service keeps running.
**Evidence to check:**
- Run the failure test.
**Scoring:**
- 1.0 — both hold.
- 0.5 — the event exists, but the service stops.
- 0.0 — no event.

## Regression check
- All tests that passed before this slice must still pass.
- Files outside `priority-dev/` must remain unchanged, except the committed reports named in the slice.

## Out of scope — do not penalise
- Behaviour that belongs to a later slice of the plan.
- The policy, the actuator, the attention queue, and the notifier.
