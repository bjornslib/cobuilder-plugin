# Rubric: Slice 11 — Hooks and tail to the log

Feature: priority-dev-spike
Epic: E4
Slice goal: A Stop hook in the scratch session leads to a `run.stopped` event in the log with `last_assistant_message` and the pane id, and the tailer adds records with no duplicate after a restart.
Test command: `uv run pytest priority-dev/tests -q`

## Criteria

### C1 — The Stop hook gives a run.stopped event with the text and the pane id [CRITICAL]
**Must be true:** in the scratch session, one stop gives one event with `last_assistant_message` and `$TMUX_PANE`.
**Evidence to check:**
- Run the scratch test and read the log.
**Scoring:**
- 1.0 — both fields present.
- 0.5 — the text is present, and the pane id is empty with a reason in the slice 2 report.
- 0.0 — no event.

### C2 — A restart adds no duplicate transcript record
**Must be true:** stopping and starting the host adds no row with a repeated `file:offset` key.
**Evidence to check:**
- Run the restart test.
**Scoring:**
- 1.0 — no duplicate.
- 0.5 — a duplicate that the log drops.
- 0.0 — a stored duplicate.

### C3 — The spool holds events while the service is down [CRITICAL]
**Must be true:** with the service down, events wait in the spool, and they arrive once after it returns.
**Evidence to check:**
- Run the outage test.
**Scoring:**
- 1.0 — all arrive once.
- 0.5 — all arrive, with one repeat dropped by the log.
- 0.0 — some are lost.

### C4 — The bypass file stops every hook [CRITICAL]
**Must be true:** with the bypass file present, no event is written.
**Evidence to check:**
- Run the bypass test.
**Scoring:**
- 1.0 — no event.
- 0.5 — one event.
- 0.0 — events continue.

## Regression check
- All tests that passed before this slice must still pass.
- Files outside `priority-dev/` must remain unchanged, except the committed reports named in the slice.

## Out of scope — do not penalise
- Behaviour that belongs to a later slice of the plan.
- The policy, the actuator, the attention queue, and the notifier.
