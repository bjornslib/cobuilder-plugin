# Probe record: priority-ask-question, E1

Slice 2. The engineer fills this record from a live run of the probe
`priority-dev/probes/ask-hold`. Its README gives the steps. Quote each
answer from `probe.jsonl`.

Claude Code version: _(run `claude --version`)_
Date: _

## What the test kit already showed

The mod tests run in `claude plugin test`, not in a live session. There:

- The kit cut off a held `tool.call` hook at 10000 ms, and the `.catch`
  handler logged `cut-off` with the kind `timeout`.
- While a call was held, each find or press in the kit took about 500 ms.

A live session may use another budget. The questions below need the
live answer.

## 1. Does the call stay open for two minutes?

Answer: held | cut off at _ seconds | not measured
Log line:

```
```

## 2. Which answer shape does the agent receive?

| Shape | What the agent received | Log line |
|---|---|---|
| answers-by-question | | |
| answers-list | | |
| text | | |

Engine error text for a refused shape:

```
```

## 3. Is the tool_use in the transcript at the catch?

Answer: `inTranscript` = _
Log line:

```
```

## 4. The dialog path

With `/ask-probe pass`, did the dialog open, and did a `passed` line
appear?

Answer: _

## 5. Decision for E3

Hold | fallback. Reason: _
