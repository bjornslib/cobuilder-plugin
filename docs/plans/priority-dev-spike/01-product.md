# Product: priority-dev-spike

Grounded in `docs/architecture/designs/priority-dev-spike/intent.json` and ADR-0045.

## Problem

A developer who runs many Claude Code sessions at once cannot tell which session needs them. The design of priority.dev answers that, but it rests on guesses. No one has measured whether a small model can read a session that has stopped and say what is needed. No one has measured what the Claude Code hooks and the terminal pane really do. A wrong guess would reach the part that answers sessions for the developer.

## Success metric

Every unknown in the design has a measured answer in a committed report. The measure is a count: of the 6 listed unknowns, how many have a report that states a result. The target is 6 of 6, and "refuted" counts as a result. A replay report over local transcripts also states the valid-output rate and the quote-found rate of the small model.

## Announcement — the blog post before the feature

We ran the first spikes of priority.dev. A small model read recorded Claude Code sessions and said what each stopped session needed. Every answer carried an exact quote from the session, and code rejected any quote that was not there. We also learned what the hooks and the terminal pane do, before we built anything that depends on them. Each failure of the model ended in a clear refusal with a reason, never in silence. The next phase now starts from facts.

## Screens

No UI. The spike prints reports and JSON in a terminal.
