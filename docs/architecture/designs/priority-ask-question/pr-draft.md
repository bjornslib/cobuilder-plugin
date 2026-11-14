# The priority reader answers an AskUserQuestion call from its pane

## Why

An AskUserQuestion call stops the agent until the person answers, but no
Stop fires. The reader of ADR-0049 stays silent there, and the engine
dialog shows the question with no reading.

## What changes

- A probe records if a hook can hold the call open, and the answer shape
  (E1).
- `priority interpret --open-question` reads the open questions, and each
  reading records `stop_kind` (E2).
- The mod catches a main-loop call, shows a question card at once, reads
  that point in the background, and answers the call from the pane (E3).
- The engine dialog stays as the fallback.

## Decision

ADR-0050 amends ADR-0049.

## Checks

- `claude plugin test plugins/cobuilder-priority`
- `uv run pytest` in `priority-dev`
- The probe record and a live question in a session
