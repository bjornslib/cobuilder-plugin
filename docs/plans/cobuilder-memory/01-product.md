# Product: cobuilder-memory

Grounded in the design record `docs/architecture/designs/cobuilder-memory/`
(`intent.json`, `goal.json`), approved 2026-10-15, round 7.

## Problem

A developer who designs or builds a change in CoBuilder works with an
agent that forgets what earlier sessions decided. The project's memory
holds those decisions, but the agent asks it only when it thinks to, with
its own guess as the question. Its answers then come back as raw chat from
the current session. Design work never asks memory at all, and build work
asks only when the developer opts in. So the agent argues settled
questions again, or it misses a rule that someone already set.

## Success metric

In live runs on one design question in each of two repos (this repo and
think-with-ai), the agent receives a dated past record that it did not have,
and it uses or rejects that record with a stated reason.

Measurement: the evidence file of slice 6 holds both run transcripts, and
the developer marks each run "used", "rejected with a reason", or "no
value". The metric passes when both runs are "used" or "rejected with a
reason".

## Announcement — the blog post before the feature

CoBuilder now has a memory. Install the optional cobuilder-memory plugin,
and the agent can consult the project's Hindsight memory before it makes a
design or build decision. A small model reads what you asked for in the
session and writes the questions, so the agent no longer guesses what to
search for. Design and build consult memory on their own at the start, and
a side pane shows each consultation as it runs. The agent tells you which
past decisions it used, which it set aside, and why.

## Screens

- `mockups/memory-pane.html` — the memory pane, titled
  `🧠 Hindsight: CoBuilder Memory Run`, in two states: a run in progress,
  and a finished run. The developer approved this mockup on 2026-10-15.

## Prior art

H1 ran on 2026-10-15 through the spike's own tool (now named consult).

- Recall returned 26 results, and 19 came from this session. The kept
  records were mostly repo facts.
- Two of the three reflects timed out at 170 s while consolidation ran on
  the same model. A timed-out step must not hide the other answers.
- One reflect lead: the 2026-09-26 rename to cobuilder-architect needed a
  version bump and retitled commands. Moving a plugin is not only a file
  move.
