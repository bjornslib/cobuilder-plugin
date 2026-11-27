# Epic Technical Solution Design: E1 — Probe

Feature: priority-ask-question
Epic ID: E1

## Scope and Intent

E1 answers three engine questions before any product code holds a call.
Can a `tool.call` hook hold an AskUserQuestion call open while a person
decides? Which answer shape does the engine accept? Is the `tool_use` in
the transcript when the hook fires? The probe mod is test equipment. It
lives under `priority-dev/probes/`, and no marketplace entry names it.

## Files Touched

- `priority-dev/probes/ask-hold/.claude-plugin/plugin.json`
- `priority-dev/probes/ask-hold/hooks/hooks.json`
- `priority-dev/probes/ask-hold/hooks/register.tsx`
- `priority-dev/probes/ask-hold/hooks/shapes.ts`
- `priority-dev/probes/ask-hold/tests/` (mod tests)
- `priority-dev/probes/ask-hold/README.md` (how to run the probe)
- `docs/architecture/designs/priority-ask-question/probe-record.md`
  (slice 2, filled from the live run)

## Types & Signatures

`03-program-design.md` holds the types. The probe contract:

- **Mode.** An atom, `hold` by default after `/ask-probe hold`, and `off`
  until a person runs a command. `/ask-probe pass` sets `pass`.
  `/ask-probe off` stops the probe.
- **The hook.** `on('tool.call', { tool: 'AskUserQuestion' }, ...)`. It
  calls `next(e)` when the mode is not `hold`, or when `agentId` is set.
  In hold mode it logs `caught`, opens the pane, and awaits a promise that
  the pane's Send resolves. It returns `{ result: answerOf(shape, ...) }`.
- **The pane.** Id `ask-hold`. It shows the elapsed seconds, each
  question with its options as toggle Buttons, an Other input for each
  question, a shape choice (`answers-by-question`, `answers-list`,
  `text`), and Send. A redraw each second shows the elapsed time.
- **The log.** One JSON line for each event, appended to
  `<priority_dev_dir>/reports/logs/ask-hold/probe.jsonl`, or to the
  plugin data folder when no folder is set. `inTranscript` is true when
  the transcript text holds the `tool_use_id` at the catch.
- **The cut-off.** A `.catch` handler on the hook logs `cut-off` with the
  failure kind and the budget.

## Slice Decomposition

1. **Probe mod.** The mod, its commands, the hook, the pane, the shapes,
   the log, and its tests. Ends with passing mod tests and a README.
2. **Probe record.** The person runs the probe live. The record states
   each answer and quotes its log line. Depends on slice 1.

## Test Plan

- `tests/shapes.test.ts`: each shape function gives its documented
  value for one, multi-select, and Other answers.
- `tests/hook.test.tsx`: with a stub beneath the plugin for `tool.call`,
  a pass-mode call and a subagent call reach the stub; a hold-mode call
  opens the pane, a press of Send returns `{ result }` with the chosen
  shape, and the log gets `caught` then `answered`.
- Slice 2 has no automated test. Its rubric scores the record.

## Risks & Open Questions

- The test kit may cut off a held hook after ten seconds. The tests
  press Send before that.
- A `.catch` handler may not fire for a cut-off in a live session. The
  person then reports that the dialog opened.
- The engine may refuse each candidate shape. The record then holds the
  error text, which names the schema.
