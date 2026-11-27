# Contracts: priority-dev-spike

Every entry is a prediction. The wire and data shapes live in `priority-dev/docs/design/schemas.md` and `adapter-host.md`. This file names only what the spike fixes.

## Endpoints

- `POST /events` on the event log service. The body is one event with an idempotency key. A repeat key stores one row. The adapter host posts; it never reads the database.
- `GET /events?cursor=N&wait=25` follows the log. The interpreter service uses it, and it resumes from its cursor after a restart.

## Data models

- `events(seq, event_id, idem_key unique, kind, session_id, payload jsonb, created_at)`. Append only.
- `interpreter_call(call_id, stop_brief_id, stage, model_id, prompt_hash, rendered_input, raw_reply, output_json, latency_ms)`. One row for each model call.
- Event kinds that the spike adds: `run.stopped`, `prompt.permission`, `prompt.question`, `transcript.records`, `fact.run_digest`, `interpretation`, `abstain`.
