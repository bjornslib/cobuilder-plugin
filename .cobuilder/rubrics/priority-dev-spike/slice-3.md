# Rubric: Slice 3 — Tmux probe

Feature: priority-dev-spike
Epic: E1
Slice goal: `probes/tmux-probe.md` states whether a paste is lost in an idle pane and a busy pane, how newlines behave, and whether the permission dialog shows while a hook waits 20 seconds.
Test command: `uv run pytest priority-dev/tests -q`

## Criteria

### C1 — The paste trials have counts for an idle and a busy pane
**Must be true:** the report states at least 10 trials for each of the idle pane and the busy pane, the number lost, and how a newline arrived.
**Evidence to check:**
- Read the report and the raw logs.
- Recount the lost pastes from the logs.
**Scoring:**
- 1.0 — counts match the logs.
- 0.5 — counts exist for one pane only.
- 0.0 — no counts.

### C2 — The held-hook result has a pane capture as evidence [CRITICAL]
**Must be true:** the report states yes or no for whether the dialog showed while the hook waited 20 seconds, with a `tmux capture-pane` text taken during the wait.
**Evidence to check:**
- Read the report.
- Open the capture file named in the report.
**Scoring:**
- 1.0 — the answer and the capture agree.
- 0.5 — the answer exists, but the capture is missing.
- 0.0 — no answer.

### C3 — Only the scratch pane receives keys [CRITICAL]
**Must be true:** every send in the probe targets the scratch pane id, and a test refuses a pane id that is not the scratch pane.
**Evidence to check:**
- Run the test.
- Search the probe code for a tmux call that takes an id from outside the scratch session.
**Scoring:**
- 1.0 — the test passes and no other target exists.
- 0.5 — the test passes, but one call reads the id from a variable that is not checked.
- 0.0 — a call can reach another pane.

### C4 — The report names the abort condition it informs
**Must be true:** the report states which `abort_if` condition of `goal.json` it informs, and gives a plain result: held, refuted, or not measured.
**Evidence to check:**
- Read the report named in the slice goal.
- Find the sentence that names the condition and the result.
**Scoring:**
- 1.0 — the sentence exists and the result matches the raw logs.
- 0.5 — the sentence exists, but the result is vague or the logs are missing.
- 0.0 — no such sentence.

## Regression check
- All tests that passed before this slice must still pass.
- Files outside `priority-dev/` must remain unchanged, except the committed reports named in the slice.

## Out of scope — do not penalise
- Behaviour that belongs to a later slice of the plan.
- The policy, the actuator, the attention queue, and the notifier.
