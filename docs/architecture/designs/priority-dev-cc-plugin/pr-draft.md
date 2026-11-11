## Problem

The priority-dev interpreter improves only on recorded transcripts. The optimiser runs on old sessions no longer give useful feedback. The engineer does not remember those sessions well enough to judge a reading.

D1 beats the base prompt by 0.185 on 56 test stops, and D2 does not beat D1. The next gain needs readings of sessions that the engineer remembers.

## Why this approach

An opt-in plugin, cobuilder-priority, ships one hooks module. A per-session switch is off by default. With the switch on, a Stop hook on the main loop runs priority digest, then priority interpret with the D1 program, as a separate process, and returns at once. The module stores each reading. A pane shows one card per stop, with right, wrong, and note marks. The plugin carries out no step.

## Alternatives considered

- **A Stop command hook with async true, plus a mod pane** — rejected because one hooks module can start the process and draw the pane, so no file hand-off is necessary.
- **Interpret only** — rejected because the engineer wants the digest of the run in the brief.
- **Interpret first, then digest** — rejected because interpret would read the digest of the stop before.
- **Change the PREVIOUS RUN label in every command** — rejected because earlier compact-brief scores would no longer compare.
- **Read every session in every repo** — rejected because each transcript goes to an outside service.
- **A repo allowlist** — rejected because the engineer chose a per-session switch.
- **Ship the D1 program in the plugin** — rejected because the program folder is Git-ignored.
- **API keys only in userConfig** — rejected because the CLI already reads priority-dev/.env.
- **Write marks into the confirmed label files** — rejected because the labels stay local.
- **Add the plugin to the umbrella** — rejected because each turn costs two model calls.
- **A Claude Artifact page** — rejected because a page does not update beside the session.

## Out of scope

- Any step of a reading.
- An export of the marks into the labelled set.
- Subagent stops, headless sessions, and other harnesses.
- A change to D1, eval, replay, or the optimiser.

## Risks

- D1 was not scored on a brief with a CURRENT RUN digest.
- Each stop with the switch on costs two model calls.
- A reload or the end of the session can stop a reading.
- The transcript can lag behind the Stop event.

## Testing

`claude plugin test plugins/cobuilder-priority` drives the module through `classic.Stop`, `command.run`, and `ui.render`, with a stubbed `$.process.run`. pytest covers the `--digest current` flag in priority-dev and the packaging rule.

## Decision record

ADR-0049. It amends ADR-0025 and ADR-0039.
