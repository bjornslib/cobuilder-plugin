# Slice plan (draft): priority.dev first spikes

Status: draft, round 10. I read `plugins/implement/skills/build/SKILL.md` and wrote only Gate 4a in its format. I did not run `/implement:start`, and I did not touch the tracker. No gate is approved.

The goal of the spikes is to find out whether the design holds. Each slice ends in a state that a command or a file shows. The first four slices need no database and no running session. They retire the biggest risk first: does a small model give valid, grounded output on real transcripts?

| # | Epic | Slice | Ends with | Score | State |
|---|---|---|---|---|---|
| | **`priority-dev/E1` — The interpreter works on a recorded transcript.** No Jev, no database, no live session. Nemo and Inkling through OpenRouter. | | | | |
| 1 | `priority-dev/E1` | Slice a recorded run | `uv run priority slice fixtures/run-3.jsonl --stop 2` prints a slice that equals the stored snapshot. Replies group by `message.id`, results pair by id, and a planted key is redacted | — | pending |
| 2 | `priority-dev/E1` | Digest a run | `priority digest` calls Inkling and prints a `RunDigest` that validates. The call row with the exact input is saved as a file | — | pending |
| 3 | `priority-dev/E1` | Interpret a stop | `priority interpret` runs Triage, Pick, Fill, and Card on Nemo. It prints an `Interpretation` or an `Abstain`. The call rows are saved | — | pending |
| 4 | `priority-dev/E1` | Replay many stops | `priority replay fixtures/` writes `report.md` with the valid-output rate, the quote-found rate, the abstain reasons, the kinds picked, the characters sent, the seconds, and the cost, for both adapters | — | pending |
| | **`priority-dev/E2` — The event log keeps what the other parts send.** Postgres 17 in Docker. | | | | |
| 5 | `priority-dev/E2` | Append and read | `priority log append` twice with one idempotency key stores one row. `priority log read --from 0` lists rows in order | — | pending |
| 6 | `priority-dev/E2` | Ingest and follow | `POST /events` stores an event. A reader that follows the log gets it within one second and resumes from its cursor after a restart | — | pending |
| 7 | `priority-dev/E2` | Interpret from the log | A `run.stopped` event in the log leads to a `fact.run_digest` event and an `interpretation` event, written by the interpreter process | — | pending |
| | **`priority-dev/E3` — The session adapter watches and answers a real session.** A scratch Claude Code session in tmux. | | | | |
| 8 | `priority-dev/E3` | Stop hook to the log | A `Stop` hook in the scratch session leads to a `run.stopped` event in the log. It holds `last_assistant_message` and the tmux pane id | — | pending |
| 9 | `priority-dev/E3` | Prompt hooks to the log | A permission dialog and an `AskUserQuestion` in the scratch session lead to a `prompt.permission` event and a `prompt.question` event with the exact options | — | pending |
| 10 | `priority-dev/E3` | Tail the transcript | The tailer adds transcript records with `file:offset` keys. A host restart adds no duplicate. The report states the transcript lag after a stop | — | pending |
| 11 | `priority-dev/E3` | Send a signed command | A signed command pastes text into the scratch pane at an empty prompt, and `command.confirmed` follows. An unsigned command is refused. A command for a changed prompt gives `command.unknown` | — | pending |
| 12 | `priority-dev/E3` | Answer from a held hook | A `PermissionRequest` hook holds, a stub command returns allow, and the scratch session runs the tool with no dialog. The report states whether the dialog shows while the hook waits | — | pending |

## Notes for the gates

1. **Order.** Build E1 first, slices 1 to 4. Then E2 slices 5 and 6, then E3 slice 8. Slice 7 joins E1 and E2. Slices 9 to 12 come last, because each tests one unknown of `adapter-host.md` section 7.
2. **Gate 4b.** Each epic holds more than one slice, so each needs a technical solution design. The designs exist as prose in `schemas.md` (E1), `dspy-modules.md` (E1), `components.md` section 3.3 (E2), and `adapter-host.md` (E3). They are not yet in the `epic-<id>-design.md` form.
3. **Gate 4c.** No blind rubric exists. The unknowns in `adapter-host.md` section 7 are good rubric criteria, because each one has an observable answer.
4. **Fixtures.** Slice 1 needs recorded transcripts, redacted. I measured two transcripts of this repo. The fixtures need your approval before they enter a repository, because a transcript holds your prompts.
5. **Test command and place.** The spike code needs a folder, a `pyproject.toml`, and a test command. I propose `priority-dev/` on this branch, and `uv run pytest`. This is an open decision.
6. **The tracker.** `/implement:start` stores slice state in the beads tracker of the repo that runs it. Running it here would add priority.dev programs to the cobuilder-plugin tracker. This is an open decision.
