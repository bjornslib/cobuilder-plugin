---
# --- doc-gardener required frontmatter ---
title: "ADR-0050 — The priority reader answers an AskUserQuestion call from its pane"
status: active
type: architecture
last_verified: 2026-11-15
owner: bjornslib
# --- 42010 decision-record index (schema: references/decision-records.md §2) ---
id: ADR-0050
name: "The priority reader answers an AskUserQuestion call from its pane"
state: decided
groups: [workflow]
problem: "An AskUserQuestion call stops the agent until the person answers, but no Stop fires. So the reader of ADR-0049 stays silent at the point where the person needs a reading most, and the engine dialog shows the question with no reading beside it."
decision: "With the reader on, a tool.call hook catches each main-loop AskUserQuestion call and holds it open. The pane opens with a question card built from the call input at once. In the background, the reader runs priority digest, then priority interpret with the new --open-question input, and the reading fills in beside the questions. The person's choice in the pane answers the call as the tool's result, so the engine dialog does not open. If a live probe shows that a hook cannot hold the call open, or the pane cannot open, the hook passes the call on: the dialog opens, and the pane still reads that point. This amends ADR-0049, whose reader never holds the session."
alternatives:
  - option: "A classic.PreToolUse hook"
    rejected_because: "It can only allow, ask, or deny a call. It cannot answer one."
  - option: "Refuse the call, so the agent asks in its reply and ends its turn"
    rejected_because: "The engineer wants the pane to be the only place that shows the question. The reply text would show it in the transcript too."
  - option: "Read the point after the answer, in PostToolUse"
    rejected_because: "The reading would come after the person decided, so it could not help the decision."
  - option: "Let priority-dev find the open question in the transcript"
    rejected_because: "When the hook fires, the tool_use may not be in the transcript yet. The call input already holds the questions, so the plugin passes them in."
  - option: "Show the questions only when the reading arrives"
    rejected_because: "The agent waits during the two model calls. The person can answer from the call input at once, and the reading is extra help."
  - option: "Catch every AskUserQuestion call, subagents too"
    rejected_because: "The reader reads main-loop stops only. A subagent call passes on to the engine as before."
forces:
  - "Every hook runs under a time budget. The test kit names ten seconds. The types do not say if a hook that waits for a person is cut off."
  - "A tool.call hook may return { result } without next, and then no dialog opens."
  - "An AskUserQuestion call holds up to four questions, with multi-select and free text under Other."
  - "D1 was scored on turn-end stops only."
  - "ADR-0045 keeps priority-dev apart: the plugin calls its CLI only as a separate process."
related_decisions:
  - { type: amends, target: ADR-0049 }
  - { type: is-related-to, target: ADR-0045 }
related_concerns: []
history:
  - { state: decided, date: 2026-11-15, note: "Drafted by design mode for the priority-ask-question design. The engineer chose to hold the call open, the pane as the only place for the question, the dialog as the fallback, and agent-assisted authorship." }
maps_to:
  context: cobuilder-packaging
  modules: [plugins/cobuilder-priority, priority-dev/src/priority/cli.py, priority-dev/src/priority/brief]
  rule: "The plugin calls priority-dev only as a separate process."
delivers:
  capability: "At an AskUserQuestion call, the pane shows the question, its options, and a reading of that point, and the person answers there."
  benefit: "The person decides with a reading beside the question, and each answer becomes a label of a new kind of stop."
  beneficiary: [developer]
  enables: ["A comparison of readings at questions and at turn ends"]
  addresses_problem: P1
source_pr: null
related:
  - "docs/architecture/designs/priority-ask-question/contracts.md"
  - "docs/architecture/adr/ADR-0049-cobuilder-priority-reads-each-stop-of-a-live-session.md"
---

# ADR-0050 — The priority reader answers an AskUserQuestion call from its pane

## Context

ADR-0049 reads each main-loop Stop. A Stop fires at the end of a turn.
An AskUserQuestion call also stops the agent, but inside a turn, so no
Stop fires and the reader stays silent. The engine opens its own dialog,
and the person answers there with no reading.

## Options considered

The frontmatter lists each option with its reason. Two shaped the
decision most:

- **End the turn at the call.** It needs no change in priority-dev, but
  the question would also show in the transcript.
- **Find the question in the transcript.** The call input already holds
  the questions, and the transcript may lag behind the hook.

## Decision

**The catch.** With the reader on, a `tool.call` hook on
`AskUserQuestion` runs for the main loop only. A subagent call passes on.

**The question card.** The hook opens and focuses the pane. The card
shows each question and its options from the call input at once.

**The reading.** In the background, the reader runs `priority digest`,
then `priority interpret --open-question <file>`. The file holds the
questions. The brief marks the stop as an open question. The reading
records `stop_kind: question`, and its steps fill in beside the questions.

**The answer.** The person picks options or types under Other, then
presses Send. The hook returns the answers as the tool's result. The
agent goes on, and the dialog never opens.

**The fallback.** A live probe runs first. If a hook cannot hold the
call open, or the pane cannot open, the hook calls `next`. The dialog
opens, and the pane still reads that point.

## Consequences

- The reader now holds the session at a question, which ADR-0049 never
  did. Only a person's answer, or the fallback, releases it.
- `priority interpret` gets one new input. Eval, replay, and the
  optimiser do not use it.
- The marks can be split into turn-end stops and question stops.

## Value delivered

The person decides with a reading beside the question. The engineer
gets labels at the points where the agent needs the person most.
