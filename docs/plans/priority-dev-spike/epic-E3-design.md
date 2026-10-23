# Epic Technical Solution Design: E3 — Event log

Feature: priority-dev-spike
Epic ID: E3

## Scope and Intent

Postgres 17 holds an append-only event log with an idempotency key and a cursor. A service reads `run.stopped` events and writes the digest and the interpretation. The source is `components.md` section 3.3.

## Files Touched

- `docker-compose.yml`, `migrations/0001_events.sql`, `src/priority/log/` (client, service), `tests/test_log_*.py`

## Types & Signatures

- `append(event) -> int` (returns `seq`; a repeat key returns the old `seq`)
- `follow(cursor) -> Iterator[Event]` over LISTEN and NOTIFY
- `POST /events`, `GET /events?cursor=N&wait=25`

## Slice Decomposition

1. Slice 8: append and read.
2. Slice 9: ingest and follow.
3. Slice 10: the interpreter service over the log.

## Test Plan

A contract test for the key and the cursor. A restart test for the follower. Slice 10 uses the fake model.

## Risks & Open Questions

- psycopg 3 async and `LISTEN` handling are as in `components.md`, and are not yet tested here.
- Docker must run on the development machine.
