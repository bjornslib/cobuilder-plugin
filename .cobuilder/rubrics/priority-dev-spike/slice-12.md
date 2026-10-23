# Rubric: Slice 12 — Send a signed command

Feature: priority-dev-spike
Epic: E4
Slice goal: A signed command pastes text into the scratch pane at an empty prompt and is confirmed. An unsigned command is refused. A command for a changed prompt gives `command.unknown`.
Test command: `uv run pytest priority-dev/tests -q`

## Criteria

### C1 — An unsigned or wrongly signed command is refused [CRITICAL]
**Must be true:** the host sends nothing for a command without a valid HMAC, and logs the refusal.
**Evidence to check:**
- Run the signature tests.
**Scoring:**
- 1.0 — both refused.
- 0.5 — one refused.
- 0.0 — a command is sent.

### C2 — A signed command reaches the scratch pane and is confirmed [CRITICAL]
**Must be true:** at an empty prompt, the text arrives and `command.confirmed` follows within the timeout, from a transcript user record.
**Evidence to check:**
- Run the scratch test.
**Scoring:**
- 1.0 — arrives and is confirmed.
- 0.5 — arrives, with no confirmation.
- 0.0 — does not arrive.

### C3 — A changed prompt gives command.unknown and no send [CRITICAL]
**Must be true:** when the pending prompt id differs, nothing is sent and `command.unknown` is logged.
**Evidence to check:**
- Run the changed-prompt test.
**Scoring:**
- 1.0 — nothing sent, event logged.
- 0.5 — nothing sent, no event.
- 0.0 — text sent.

### C4 — Only the tmux module calls tmux
**Must be true:** a test searches the repository for tmux calls outside `src/priority/host/tmux.py` and finds none.
**Evidence to check:**
- Run the search test.
**Scoring:**
- 1.0 — none found.
- 0.5 — one in a test file.
- 0.0 — one in code.

## Regression check
- All tests that passed before this slice must still pass.
- Files outside `priority-dev/` must remain unchanged, except the committed reports named in the slice.

## Out of scope — do not penalise
- Behaviour that belongs to a later slice of the plan.
- The policy, the actuator, the attention queue, and the notifier.
