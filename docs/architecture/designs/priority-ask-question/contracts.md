# Contracts: priority-ask-question

These contracts add to the contracts of `priority-dev-cc-plugin`
(ADR-0051). ADR-0052 holds the decision.

## Epic E1: Probe

E1 runs first. Its record decides if E3 holds the call, or uses the
fallback.

- **E1.1 Hold the call.** A probe mod registers a `tool.call` hook on
  `AskUserQuestion` for the main loop. The hook waits for a pane press
  before it returns `{ result }`. The probe records if the engine keeps
  the call open for two minutes, or cuts the hook off and opens the dialog.
- **E1.2 The answer shape.** The probe returns a result and records what
  the agent receives. It covers one answer, a multi-select answer, and
  text under Other. The record names the exact shape that the engine
  accepts.
- **E1.3 The transcript.** The probe records if the `tool_use` of the
  call is in the transcript file when the hook fires.

Evidence: a probe record at
`docs/architecture/designs/priority-ask-question/probe-record.md`, with
each answer and the session version.

## Epic E2: priority-dev

- `priority interpret --open-question <file>` reads a JSON list of
  questions in the AskUserQuestion input shape: `question`, `header`,
  `options` with `label` and `description`, and `multiSelect`.
- With the flag, the brief marks the stop `stop_kind: question` and
  shows the questions as the agent's open ask. Without the flag, the
  brief does not change.
- The printed reading carries `stop_kind`, `turn_end` or `question`.
- Eval, replay, and the optimiser do not use the flag.

## Epic E3: Answer

- **The catch.** A `tool.call` hook on `AskUserQuestion`. It acts only
  when the reader is on and `agentId` is absent. Otherwise it calls `next`.
- **The card.** The hook opens and focuses the pane. The card shows each
  question, its options as Buttons, a multi-select mark, and an Other
  input. It shows at once, from the call input.
- **The reading.** The hook writes the questions to a file and queues a
  reading with `--open-question`. The reading fills in beside the
  questions when it arrives, as `stop_kind: question`.
- **The answer.** Send stays dim until each question has an answer.
  Send returns the answers as the tool's result, in the shape that E1
  recorded. The mark records the answers.
- **The fallback.** If E1 shows that the hook is cut off, or the pane
  cannot open, the hook calls `next`. The dialog opens, and the reading
  still runs.
