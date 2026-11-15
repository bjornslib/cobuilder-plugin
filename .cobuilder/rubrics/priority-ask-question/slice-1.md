# Rubric: Slice 1 — Probe mod

Feature: priority-ask-question
Epic: E1
Slice goal: `claude --plugin-dir priority-dev/probes/ask-hold` loads a mod. `/ask-probe hold` and `/ask-probe pass` set the mode. In hold mode, a main-loop AskUserQuestion call opens a pane with each question, its options, a shape choice, and Send, and Send returns that shape as the tool's result. Each event writes one line to `probe.jsonl`. The mod tests pass.
Test command: `claude plugin test priority-dev/probes/ask-hold`

## Criteria

### C1 — The mod loads and its tests pass [CRITICAL]
**Must be true:** `claude plugin validate priority-dev/probes/ask-hold` passes, and `claude plugin test priority-dev/probes/ask-hold` passes with 0 failures and at least 6 tests.
**Evidence to check:** run both commands from the repo root.
**Scoring:**
- 1.0 — validate passes, and the tests pass with 6 or more tests.
- 0.5 — the tests pass with fewer than 6 tests, or validate passes only with an error-class warning.
- 0.0 — a test fails, or validate fails.

### C2 — Pass mode, the off state, and subagent calls never hold the call [CRITICAL]
**Must be true:** a test drives `tool.call` for AskUserQuestion with a stub beneath the plugin. In pass mode, before any command, and with `agentId` set, the stub receives the call, and the result is the stub's.
**Evidence to check:** read the hook and the tests. Change the hook so it holds every call, run the tests, and confirm one fails. Restore the hook.
**Scoring:**
- 1.0 — all three cases are tested, and the mutation fails a test.
- 0.5 — two of three cases are tested.
- 0.0 — no such test, or the mutation passes.

### C3 — Hold mode opens the pane and returns the chosen shape after Send [CRITICAL]
**Must be true:** in hold mode, a main-loop call opens the pane `ask-hold`, which shows each question and each option. After option presses, a shape choice and Send, the call resolves to `{ result }` with the value of `answerOf` for that shape. The stub beneath is not called.
**Evidence to check:** read the test that drives the call to its result. Check that the asserted result equals the shape function's output for the same picks.
**Scoring:**
- 1.0 — the test asserts the pane contents, the result value, and that the stub was not called.
- 0.5 — the result is asserted, but the pane contents or the stub check are missing.
- 0.0 — no test drives a hold to a result.

### C4 — Three shape functions, multi-select and Other covered
**Must be true:** `shapes.ts` exports `answerOf` for `answers-by-question`, `answers-list` and `text`. Tests cover one answer, a multi-select answer, and free text under Other.
**Evidence to check:** read `shapes.ts` and its tests.
**Scoring:**
- 1.0 — three shapes, each with the three cases tested.
- 0.5 — three shapes, but a case is missing.
- 0.0 — fewer than three shapes.

### C5 — Each event writes one log line with the probe facts
**Must be true:** `caught`, `passed`, `answered` and `refused` each append one JSON line with `at` and `kind`. `caught` carries `inTranscript`. `answered` carries `elapsedMs` and `shape`. A `.catch` handler logs `cut-off`. The README names the log path and the probe steps.
**Evidence to check:** read the log code, the `.catch` registration, a test that reads the log lines, and the README.
**Scoring:**
- 1.0 — all fields are present and a test reads at least `caught` and `answered`.
- 0.5 — the lines exist, but a field or the test is missing.
- 0.0 — no log.

### C6 — The probe stays test equipment
**Must be true:** no marketplace entry and no file under `plugins/` names the probe. The probe imports nothing from `plugins/` or `shared/`. Each file has about 200 lines or fewer.
**Evidence to check:** `grep -rn ask-hold .claude-plugin plugins`, and read the imports.
**Scoring:**
- 1.0 — all hold.
- 0.5 — one file is over 200 lines.
- 0.0 — a marketplace entry, or an import from `plugins/` or `shared/`.
