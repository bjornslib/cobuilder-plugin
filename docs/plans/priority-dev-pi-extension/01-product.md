# Product: The priority reader runs in Pi and OMP, and a coding agent can read a session

Grounded in the design record `priority-dev-pi-extension`
(`docs/architecture/designs/priority-dev-pi-extension/intent.json`) and
ADR-0051.

## Problem

The engineer runs many coding agents at the same time. Nothing ranks or
filters what each agent needs, and no helper answers for the engineer when
the next step is obvious. The priority reader solves part of this: at the
end of each turn it says how urgent the session is and which steps the
engineer can take. But it works only in Claude Code, and the engineer now
runs most agents in Pi and OMP. Another agent also cannot ask the reader
about a session, so no helper can act on the readings.

## Success metric

In the first two weeks of use, the engineer switches the reader on in Pi
and OMP sessions, and at least eight of every ten turn ends in those
sessions get a reading card. The engineer marks at least 30 of those
readings right or wrong.

How we measure it: the reading history of each session holds every reading
and every mark. A count over the session files gives the turn ends, the
readings, and the marks. Before the host work starts, a scored sample of Pi
and OMP turn ends shows whether the readings are good enough to trust
(epic E4). A clearly lower score than the Claude Code reader's 0.654 stops
the work.

## Announcement — the blog post before the feature

The priority reader now works in Pi and OMP, the same way it works in
Claude Code. Type `/priority-on`, and each time the agent stops, a card
shows how urgent the session is and the steps you can take. Pick the steps,
read the exact text, and press Send. When the agent asks you a question in
Pi, you answer it in the same pane, with a reading beside it. Any coding
agent can now also ask for a reading of a session and get the cards back as
data. That is the first step towards a helper that answers the obvious
questions for you and calls you only when it matters.

## Screens

- `mockups/reader-pane.html`: the reader pane at the right of a Pi or OMP
  session. It shows a card, its steps, the draft of what Send submits, and
  the history.
- `mockups/question-card.html`: a question that the agent asks in Pi. The
  pane holds it until the engineer answers. In OMP, this screen exists only
  if the first probe shows that OMP's own question can be held.
- `mockups/running-and-closed.html`: a reading runs while the engineer keeps
  typing. With the pane closed, one summary line sits above the editor.

The agent mode has no screen. It returns the reading as data. The planned
orchestrator (epics E8 to E10) has no screen in this plan.
