# Rubric: Slice 13 — Answer from a held hook

Feature: priority-dev-spike
Epic: E4
Slice goal: A PermissionRequest hook waits, a stub command returns allow, and the scratch session runs the tool with no dialog.
Test command: `uv run pytest priority-dev/tests -q`

## Criteria

### C1 — An allow from the stub runs the tool with no dialog [CRITICAL]
**Must be true:** the hook returns the decision, and the scratch session runs the tool without a dialog.
**Evidence to check:**
- Run the scratch test and capture the pane.
**Scoring:**
- 1.0 — the tool runs, with no dialog in the capture.
- 0.5 — the tool runs, and the capture is missing.
- 0.0 — a dialog shows.

### C2 — A timeout leaves the normal dialog [CRITICAL]
**Must be true:** if no verdict arrives in the hold time, the hook returns no decision, and the dialog shows.
**Evidence to check:**
- Run the timeout test.
**Scoring:**
- 1.0 — the dialog shows.
- 0.5 — the dialog shows after a delay beyond the hold time.
- 0.0 — the tool is blocked or allowed.

### C3 — The bypass file skips the wait [CRITICAL]
**Must be true:** with the bypass file, the hook returns at once with no decision.
**Evidence to check:**
- Run the bypass test.
**Scoring:**
- 1.0 — returns at once.
- 0.5 — returns within the timeout.
- 0.0 — waits.

## Regression check
- All tests that passed before this slice must still pass.
- Files outside `priority-dev/` must remain unchanged, except the committed reports named in the slice.

## Out of scope — do not penalise
- Behaviour that belongs to a later slice of the plan.
- The policy, the actuator, the attention queue, and the notifier.
