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

## 2. Which answer shape does the agent receive?

Not measured. The engine skips the hook before a person can press Send,
so no shape reaches the agent from a held call.

## 3. Is the tool_use in the transcript at the catch?

Not measured. No log line exists. E3 does not need the answer, because the
reading no longer runs inside the hook.

## 4. The dialog path

Not measured separately. After the skip, the engine handles the call on
its own path, so the dialog opens.

## 5. Decision for E3

Open. A hold on a plain promise fails at 10 seconds. The second probe
tests a hold that waits inside `$.process.run`. If that hold lasts two
minutes, E3 holds the call in the pane. If it fails, E3 uses the fallback:
the dialog stays, and the pane reads that point beside it.
