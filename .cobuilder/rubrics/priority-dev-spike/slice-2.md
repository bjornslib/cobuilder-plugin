# Rubric: Slice 2 — Hook probe

Feature: priority-dev-spike
Epic: E1
Slice goal: In a scratch tmux session, Stop, PermissionRequest, and AskUserQuestion hooks append lines to a local file, with a timeout and a bypass file, and the report states what the hooks showed.
Test command: `uv run pytest priority-dev/tests -q`

## Criteria

### C1 — A failing hook exits 0 within 5 seconds, and the bypass file silences every hook [CRITICAL]
**Must be true:** a hook with a forced error exits 0 in 5 seconds or less. With `~/.priority-dev/bypass` present, each hook writes nothing and exits 0.
**Evidence to check:**
- Run the hook command tests.
- Force an error, time the exit, then create the bypass file and repeat.
**Scoring:**
- 1.0 — both behaviours hold on all three hook events.
- 0.5 — both hold on one or two events.
- 0.0 — a failing hook exits non-zero or waits longer than 5 seconds.

### C2 — Hooks run only in a scratch session, and the uninstall removes only marked entries [CRITICAL]
**Must be true:** the installer writes hook entries only into a scratch settings file, marks each entry, and the uninstall leaves unmarked entries intact.
**Evidence to check:**
- Run the installer on a copy of a settings file that holds unmarked entries.
- Diff before and after the uninstall.
**Scoring:**
- 1.0 — the diff is empty after the uninstall.
- 0.5 — the diff shows only whitespace changes.
- 0.0 — an unmarked entry is lost, or the installer touches the real settings file.

### C3 — The report states what the hooks showed, with numbers
**Must be true:** `probes/hook-probe.md` states whether `$TMUX_PANE` was set, the fields seen for each event, the transcript lag after Stop in seconds over at least 5 stops, and what the transcript holds when `/goal` clears.
**Evidence to check:**
- Read the report.
- Compare each number to the raw lines in `probes/logs/`.
**Scoring:**
- 1.0 — each item is stated and matches the logs.
- 0.5 — one item is missing or not measured, and the report says so.
- 0.0 — an item is missing and the report does not say so.

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
