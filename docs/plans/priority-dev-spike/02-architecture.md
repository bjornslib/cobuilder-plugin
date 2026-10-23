# Architecture: priority-dev-spike

Grounded in `contracts.md`, `intent.json`, and ADR-0045 of the design. Detail lives in `priority-dev/docs/design/`.

## Fit

The code lives in `priority-dev/`, a folder with its own `pyproject.toml`. It imports nothing from `plugins/` or `shared/`, and the plugin tests never collect it. The repository is a plugin marketplace and not an app, so this isolation is the boundary (ADR-0025, ADR-0045). The workflow state goes through the tracker port (ADR-0040, ADR-0031).

## Endpoints

- `POST /events`: append one event with an idempotency key (epic E3).
- `GET /events?cursor=N&wait=25`: follow the log from a cursor (epic E3).
- A command line, `priority`, with `brief`, `interpret`, `digest`, `replay`, and `log` subcommands (epics E2 and E3).

## Data

- `events`: append only, with a unique idempotency key and a `seq` cursor.
- `interpreter_call`: one row for each model call, with the model id, prompt hash, rendered input, raw reply, and output.
- Local files: redacted fixtures (ignored by Git for real ones), probe reports, and a replay report.

## Flow

A transcript becomes a stop brief. The stop brief goes to Triage, Pick, Fill, and Card on Nemo, and to Digest on Inkling. Code checks that each quote is in the stop brief. The result is an Interpretation or an Abstain, stored with its call records. In later epics a Stop hook feeds the log, and the interpreter service reads it.

## External

- OpenRouter: `mistralai/mistral-nemo` and `thinkingmachines/inkling:free`. The key is `OPENROUTER_API_KEY`, read by one module from `priority-dev/.env`.
- Claude Code hooks: `Stop`, `PermissionRequest`, and `PreToolUse` on `AskUserQuestion`.
- tmux, Postgres 17 in Docker, and a scratch Claude Code session.
