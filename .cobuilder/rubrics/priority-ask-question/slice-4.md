# Rubric: Slice 4 — Question in the reader

Feature: priority-ask-question
Epic: E3
Slice goal: with the reader on, a main-loop AskUserQuestion call opens the reader's pane with a question card, holds the call inside `$.process.spawn`, and Send returns `{ questions, answers }` as the tool result. A question job reads the stop with `--open-question`. The "What will be sent" block and the key row follow `question-card.svg` in every case.
Test command: `claude plugin test plugins/cobuilder-priority`

## Criteria

### C1 — Catch and hold [CRITICAL]
**Must be true:** with the reader on, a main-loop AskUserQuestion call opens the pane and waits inside `$.process.spawn` with the wait-loop argv, on two files under `<priority_dev_dir>/reports/logs/live/ask/` named by `tool_use_id`. A subagent call, or the reader off, calls `next(e)` with no pane and no spawn.
**Evidence to check:** tests that stub `process.spawn` beneath the plugin, and a mutation of the guard.
**Scoring:** 1.0 — all tested and true. 0.5 — the hold is tested, but a pass-on case is not. 0.0 — no hold test.

### C2 — The answer matches the tool schema [CRITICAL]
**Must be true:** Send writes the answer file, then the done file. The tool result is `{ questions, answers }`, with `answers` keyed by question text and a multi-select answer comma-joined. Other text replaces the picks of its question. A question with no answer blocks Send with a notice, and nothing is written.
**Evidence to check:** tests of the write order, the result, the multi-select join, the Other text, and the blocked Send.
**Scoring:** 1.0 — all tested. 0.5 — one case untested. 0.0 — the result shape is untested.

### C3 — Failure and Esc
**Must be true:** a child that ends with a non-zero code or a signal logs the cause and returns `next(e)`. An aborted hook makes no `$` call and returns a refusal.
**Scoring:** 1.0 — both tested or proven by reading the types and the code. 0.5 — one. 0.0 — neither.

### C4 — The question card
**Must be true:** the card shows each question with its number, text, and header chip, "(several)" for multi-select, each option with its description, and one Other input. `e Edit` is dim on a question card.
**Scoring:** 1.0 — a render test finds each part. 0.5 — some parts. 0.0 — none.

### C5 — The reading at the question
**Must be true:** a question job runs `priority digest`, then `priority interpret --open-question <file>`. The stored reading has `stop_kind: question` and the questions. The reading fills in under the card and does not change the picks. The mark stores the answers.
**Scoring:** 1.0 — tested. 0.5 — the argv is tested, but not the stored fields. 0.0 — untested.

### C6 — Draft block and key row in every case
**Must be true:** every draft shows the `▸ WHAT WILL BE SENT` title, the text in an inner box, and a Source footer. The block is lit when Send can act and dim when it cannot. The key row colours `s` cyan, `r` green, `w` red, and dims a key that cannot act. No `READY` tag, no length, and no target.
**Scoring:** 1.0 — tested for a question and a turn-end stop. 0.5 — one case. 0.0 — neither.

### C7 — Checks and hygiene
**Must be true:** the mod tests pass, `claude plugin validate` passes, the hooks type-check clean, the plugin version is bumped in both manifests, and each file stays near 200 lines.
**Scoring:** 1.0 — all. 0.5 — one gap. 0.0 — a failing check.
