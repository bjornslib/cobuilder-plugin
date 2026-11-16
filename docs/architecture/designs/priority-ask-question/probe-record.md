# Probe record: priority-ask-question, E1

Slice 2. The engineer ran the probe `priority-dev/probes/ask-hold` in a
live session with `/ask-probe hold`.

Claude Code version: 2.1.325
Date: 2026-11-16

## What the test kit already showed

- The kit cut off a held `tool.call` hook at 10000 ms, and the `.catch`
  handler logged `cut-off` with the kind `timeout`.
- While a call was held, each find or press in the kit took about 500 ms.

## 1. Does the call stay open for two minutes?

Answer: cut off at 10 seconds.

The live session showed this engine message:

```
ask-hold-probe: tool.call hook skipped: ran past its 10s budget
```

A live session uses the same 10-second budget as the test kit. The engine
skips the hook when the budget runs out. The budget is a fixed engine value
(`HookBudget.ms: 10_000`), so a plugin cannot raise it.

The budget counts only the hook's own time. The probe waited on a plain
promise, which counts. A wait inside a `$` call does not count, so a second
probe tests a hold that waits inside `$.process.run`.

`probe.jsonl` holds no lines. The probe writes its log only when the
`priority_dev_dir` setting is set, and the engine message alone settles
this question.

### Second run: `hold-spawn` (2026-11-16)

Answer: held. The hook waited inside `$.process.spawn`, and the engine did
not cut it.

```
{"at":"2026-11-15T21:11:36.500Z","kind":"caught","inTranscript":true}
{"at":"2026-11-15T21:12:17.623Z","kind":"answered","elapsedMs":41131,"shape":"answers-by-question","via":"spawn"}
```

The hold lasted 41 seconds, four times the budget.

### Third run: the schema fix (2026-11-16)

```
{"at":"2026-11-15T21:16:28.340Z","kind":"caught","inTranscript":true}
{"at":"2026-11-15T21:16:43.055Z","kind":"answered","elapsedMs":14722,"shape":"answers-by-question","via":"spawn"}
```

The agent received the answers with no schema error. The engineer
reported that the run worked. The log holds no hold of three minutes. Esc
writes no line by design, because the hook makes no `$` call after an
abort. E3 tests both again.

## 2. Which answer shape does the agent receive?

The engine checks a hook's result against the tool's output schema. The
first Send failed that check:

```
tool.call step resolved AskUserQuestion with a result that does not match its output shape:
"path": ["questions"], "message": "Invalid input: expected array, received undefined"
```

The schema, from the engine's tool types, is
`{ questions: [...], answers: { "<question text>": "<answer>" } }`, with a
multi-select answer comma-joined. `response`, `annotations`, and
`followUp` are optional. `answers-by-question` now returns the asked
questions with the answers. `answers-list` and `text` do not fit the
schema, so E3 uses only the first shape.

Not measured. The engine skips the hook before a person can press Send,
so no shape reaches the agent from a held call.

## 3. Is the tool_use in the transcript at the catch?

Answer: yes. Each `caught` line in both runs has `"inTranscript":true`, so
the reader can find the open question in the transcript at the catch.

## 4. The dialog path

Not measured separately. After the skip, the engine handles the call on
its own path, so the dialog opens.

## 5. Decision for E3

Hold, with the wait inside `$.process.spawn`. A hold on a plain promise
fails at 10 seconds, and a hold inside a `$` call lasted 41 seconds. The
answer must match the tool's output schema. E3 checks a hold of three
minutes and Esc during a hold again, with the reader's own pane.
