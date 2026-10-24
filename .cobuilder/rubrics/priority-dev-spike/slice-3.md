# Rubric: Slice 3 — Tmux paste probe

Feature: priority-dev-spike
Epic: E1
Slice goal: `probes/tmux-probe.md` states, for 10 trials in an idle pane and 10 in a busy pane, whether a paste is lost and how newlines arrive, using `load-buffer` and `paste-buffer` on the scratch pane only.
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

### C2 — Only the scratch pane receives keys [CRITICAL]
**Must be true:** every send in the probe targets the scratch pane id, and a test refuses a pane id that is not the scratch pane.
**Evidence to check:**
- Run the test.
- Search the probe code for a tmux call that takes an id from outside the scratch session.
**Scoring:**
- 1.0 — the test passes and no other target exists.
- 0.5 — the test passes, but one call reads the id from a variable that is not checked.
- 0.0 — a call can reach another pane.

### C3 — The report names the abort condition it informs
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
- Whether the permission dialog shows while a hook waits, which slice 2 measures.
- The policy, the actuator, the attention queue, and the notifier.
