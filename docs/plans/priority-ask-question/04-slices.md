# Slices: priority-ask-question

Gate 4a for E1 and E2. E3 joins as an addendum after the probe record
exists. Slice numbers run across the program.

Test commands: `claude plugin test priority-dev/probes/ask-hold` for E1,
and `uv run pytest priority-dev/tests -q` for E2.

Rubrics path: `.cobuilder/rubrics/priority-ask-question/`.

## Program slices

| # | Epic | Slice | Ends with | Score | State |
|---|---|---|---|---|---|
| | **`priority-ask-question/E1` — Probe.** A probe mod that holds an AskUserQuestion call, and a record of what the engine does. | | | | |
| 1 | `priority-ask-question/E1` | **Probe mod** | `claude --plugin-dir priority-dev/probes/ask-hold` loads a mod. `/ask-probe hold` and `/ask-probe pass` set the mode. In hold mode, a main-loop AskUserQuestion call opens a pane with each question, its options, a shape choice, and Send, and Send returns that shape as the tool's result. Each event writes one line to `probe.jsonl`. The mod tests pass | 0.917 (attempt 1) | done |
| 2 | `priority-ask-question/E1` | **Probe record** | `probe-record.md` states, from a live run: if the call stayed open for two minutes, which answer shape the agent received, what a refused shape showed, and if the transcript held the `tool_use` at the catch. Each answer quotes its `probe.jsonl` line | — | skipped |
| | **`priority-ask-question/E2` — Open question.** priority-dev reads the open questions and marks the stop. | | | | |
| 3 | `priority-ask-question/E2` | **Open-question input** | `uv run priority interpret <transcript> --open-question q.json` builds a brief with an `OPEN QUESTION` section and prints a reading with `stop_kind: question`. Without the flag, the brief equals the stored snapshot and `stop_kind` is `turn_end` | 1 (attempt 1) | done |
| | **`priority-ask-question/E3` — Hold in the pane.** The reader holds a main-loop AskUserQuestion call in its pane and answers it. Approved 2026-11-16. | | | | |
| 4 | `priority-ask-question/E3` | **Question in the reader** | The probe's hold, card, and answer move into `cobuilder-priority`. With the reader on, a main-loop AskUserQuestion call opens the pane with each question, its options, and one Other input. Send returns `{ questions, answers }`. A question job runs `priority interpret --open-question`, and the reading fills in under the card with `stop_kind: question`. The "What will be sent" block of `question-card.svg` frames every draft in the pane. The mark stores the answers. Esc refuses with no `$` call, and a failed child opens the dialog. `claude plugin test plugins/cobuilder-priority` passes | 0.929 (attempt 1) | done |
