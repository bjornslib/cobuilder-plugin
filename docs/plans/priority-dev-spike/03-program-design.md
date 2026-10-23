# Program Design: priority-dev-spike

The sketches `priority-dev/docs/design/schemas/interpreter_schemas.py` and `dspy_modules.py` run today and hold the types. They are the starting point, not the layout.

## Files

- `priority-dev/pyproject.toml`: Python 3.11 or later, `uv`, `pytest`, `dspy`, `pydantic`, `psycopg`, `fastapi`, `watchfiles`.
- `src/priority/config.py`: the only module that reads `OPENROUTER_API_KEY` and other settings.
- `src/priority/brief/`: the brief builder and the redactor (E2).
- `src/priority/interpreter/`: the signatures, the `Interpreter` and `DigestRun` modules, and the checks (E2).
- `src/priority/log/`: the event log client and service (E3).
- `src/priority/host/`: the hook command, the spool, the tailer, the tmux module, and the puller (E1 probes first, then E4).
- `probes/`: three probe scripts and their committed reports (E1).
- `tests/` and `fixtures/` (real ones ignored by Git).

## Types & signatures

- `StopBrief`, `RunItem`, `RunDigest`, `Facts`, `Question`, `Proposal`, `Action` and its 13 kinds, `Abstain`, `Interpretation`, `InterpreterCall` as in `interpreter_schemas.py`.
- `build_brief(transcript: Path, stop: int, previous: RunDigest | None) -> StopBrief`
- `Interpreter.forward(brief: StopBrief) -> Interpretation`
- `DigestRun.forward(brief: StopBrief) -> RunDigest`
- `append(event: Event) -> int`, and `follow(cursor: int) -> Iterator[Event]`.

## Call stack

`priority interpret` calls `build_brief`, then `Interpreter.forward`. That runs Triage, then Pick, then Fill, then Card, each through one `dspy.Predict`. Code checks the kind and the quote, builds the `Action`, and stores each call in `interpreter_call`.

## Test plan

- Modules run with `DummyLM` for the valid path, the quote-not-in-brief path, and the done path (already in the sketch).
- The brief builder compares to stored snapshots of the fixtures, and a planted key must be redacted.
- Failure drills inject 429, malformed JSON, an empty quote, and a timeout. Each must end as an Abstain with a reason.
- The log has a contract test for the idempotency key and the cursor.
- A test searches `priority-dev/` for imports from `plugins/` or `shared/`, and the plugin test run must not collect `priority-dev/`.
- The probes run in a scratch tmux session only.

## Least confident decisions

- Whether Nemo returns valid payloads for most of the 13 kinds. The split into small calls is a bet.
- Whether `JSONAdapter` or `ChatAdapter` works better on Nemo. The replay compares both.
- Whether the free Inkling tier sustains the event rate.
- Whether a held hook leaves the dialog visible. Slice 3 measures it.
- Whether the transcript lag after Stop is short enough for the brief builder.
