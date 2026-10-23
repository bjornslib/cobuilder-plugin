# Slices: priority-dev-spike

Gate 4a for the whole program. The slices cover four epics, E1 to E4. Slice numbers run 1 to 13 across the program. The first batch to build is slices 1 to 5. Gate 4b and 4c stay pending until the engineer approves this plan.

Test command for each slice: `uv run pytest priority-dev/tests -q`. The command runs inside `priority-dev/`, which has its own `pyproject.toml`. The plugin tests never collect it.

Rubrics path: `.cobuilder/rubrics/priority-dev-spike/`.

## What makes a slice here

Each slice ends in one thing that a command prints or a file shows. A probe slice ends in a committed report that states a measured answer. A probe may refute its claim and still pass, because its rubric scores the honesty and completeness of the report, not the size of the number. The word stop brief names the interpreter input. The word slice names only a unit of build work.

## Program slices

| # | Epic | Slice | Ends with | Score | State |
|---|---|---|---|---|---|
| | **`priority-dev-spike/E1` — Probes.** A model probe, a hook probe, and a tmux probe. Each unknown gets a measured answer in a committed report. No database. | | | | |
| 1 | `priority-dev-spike/E1` | **Model probe** | `uv run python priority-dev/probes/model_probe.py <transcript>` runs Nemo on three redacted real transcripts and prints the five facts, an action kind, a quote, and whether the quote is in the text. `probes/model-probe.md` states the JSON validity and the rate-limit count | — | pending |
| 2 | `priority-dev-spike/E1` | **Hook probe** | In a scratch tmux session, Stop, PermissionRequest, and AskUserQuestion hooks append lines to a local file. `probes/hook-probe.md` states whether `$TMUX_PANE` is set, the fields seen, and the transcript lag. The report also states what the transcript holds when `/goal` clears. A failing hook exits 0 within 5 seconds, and the bypass file makes every hook a no-op | — | pending |
| 3 | `priority-dev-spike/E1` | **Tmux probe** | `probes/tmux-probe.md` states whether a paste is lost in an idle pane and in a busy pane, whether newlines survive, and whether the permission dialog shows while a PermissionRequest hook waits 20 seconds | — | pending |
| | **`priority-dev-spike/E2` — Interpreter.** The stop brief, Interpret, Digest, and the replay report, on recorded transcripts. | | | | |
| 4 | `priority-dev-spike/E2` | **Stop brief** | `uv run priority brief fixtures/run-3.jsonl --stop 2` prints a stop brief that equals the stored snapshot. Replies group by message id, results pair by id, a duplicate message id is handled, and a planted key is redacted | — | pending |
| 5 | `priority-dev-spike/E2` | **Interpret a stop** | `uv run priority interpret` runs Triage, Pick, Fill, and Card on Nemo through DSPy. It prints an Interpretation or an Abstain. Each call is stored with its model id, prompt hash, and raw reply | — | pending |
| 6 | `priority-dev-spike/E2` | **Digest a run** | `uv run priority digest` calls Inkling and prints a RunDigest that validates. The next stop brief of the same session carries it as `previous` | — | pending |
| 7 | `priority-dev-spike/E2` | **Replay report with failure drills** | `uv run priority replay fixtures/` writes `report.md` with the valid-output rate, the quote-found rate, the abstain reasons, the kinds picked, and the characters, seconds, and cost for each stage. A replay at the event rate of 5 sessions counts the free-tier limit errors. An injected 429, malformed JSON, empty quote, and timeout each end as an Abstain with a logged reason | — | pending |
| | **`priority-dev-spike/E3` — Event log.** Postgres 17 in Docker, and the interpreter service over it. | | | | |
| 8 | `priority-dev-spike/E3` | **Append and read** | `uv run priority log append` twice with one idempotency key stores one row, and `priority log read --from 0` lists rows in order | — | pending |
| 9 | `priority-dev-spike/E3` | **Ingest and follow** | `POST /events` stores an event. A reader that follows the log gets it within one second and resumes from its cursor after a restart | — | pending |
| 10 | `priority-dev-spike/E3` | **Interpret from the log** | A `run.stopped` event in the log leads to a `fact.run_digest` event and an `interpretation` event, written by the interpreter service | — | pending |
| | **`priority-dev-spike/E4` — Adapter to the log.** The adapter host feeds the log, receives a signed command, and answers from a held hook. | | | | |
| 11 | `priority-dev-spike/E4` | **Hooks and tail to the log** | A Stop hook in the scratch session leads to a `run.stopped` event in the log with `last_assistant_message` and the pane id. The tailer posts transcript records with `file:offset` keys, and a host restart adds no duplicate | — | pending |
| 12 | `priority-dev-spike/E4` | **Send a signed command** | A signed command pastes text into the scratch pane at an empty prompt, and `command.confirmed` follows. An unsigned command is refused, and a command for a changed prompt gives `command.unknown` | — | pending |
| 13 | `priority-dev-spike/E4` | **Answer from a held hook** | A PermissionRequest hook waits, a stub command returns allow, and the scratch session runs the tool with no dialog | — | pending |

## Notes for the gates

1. Order: E1 first, then E2 slices 4 to 7. Slices 1 to 5 form the first batch. E3 and E4 follow, and E4 uses what the probes measured.
2. Gate 4b: each epic holds more than one slice, so each needs an epic design. The prose exists in `priority-dev/docs/design/`: `dspy-modules.md` and `schemas.md` for E2, `components.md` section 3.3 for E3, and `adapter-host.md` for E1 and E4.
3. Gate 4c: each unknown in `adapter-host.md` section 7 and `schemas.md` section 2.1 becomes a rubric criterion with an observable answer.
4. Go or no-go: after slice 7, the engineer reads the replay report and decides against the `abort_if` conditions of `goal.json`. Slices 8 to 13 start only on a go. Every rubric of slices 1 to 7 carries one criterion that the report states the abort condition it informs.
5. Fixtures: real transcripts, redacted, kept local and ignored by Git, plus small made-up ones in the repository.
