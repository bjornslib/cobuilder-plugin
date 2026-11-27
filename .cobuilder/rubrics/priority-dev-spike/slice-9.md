# Rubric: Slice 9 — Ingest and follow

Feature: priority-dev-spike
Epic: E3
Slice goal: `POST /events` stores an event, and a follower gets it within one second and resumes from its cursor after a restart.
Test command: `uv run pytest priority-dev/tests -q`

## Criteria

### C1 — POST stores an event and a repeat key stores one
**Must be true:** the endpoint returns the `seq`, and a repeat with the same key returns the same `seq`.
**Evidence to check:**
- Run the endpoint test.
**Scoring:**
- 1.0 — passes.
- 0.5 — passes for a new key only.
- 0.0 — fails.

### C2 — A follower sees a new event within 1 second
**Must be true:** with LISTEN and NOTIFY, a follower receives a posted event in 1 second or less in 10 trials.
**Evidence to check:**
- Run the timing test.
**Scoring:**
- 1.0 — 10 of 10.
- 0.5 — 8 or 9 of 10.
- 0.0 — fewer.

### C3 — A follower restarts from its cursor with no loss and no repeat [CRITICAL]
**Must be true:** after a restart, the follower resumes at its cursor, and the set of events seen has no gap and no repeat.
**Evidence to check:**
- Run the restart test with 100 events.
**Scoring:**
- 1.0 — no gap, no repeat.
- 0.5 — a repeat, but no gap.
- 0.0 — a gap.

## Regression check
- All tests that passed before this slice must still pass.
- Files outside `priority-dev/` must remain unchanged, except the committed reports named in the slice.

## Out of scope — do not penalise
- Behaviour that belongs to a later slice of the plan.
- The policy, the actuator, the attention queue, and the notifier.
