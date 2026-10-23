# envisioned PR: priority-dev-spike

## Summary

A spike program for priority.dev (ADR-0045). It has 4 epics and 13 slices in `priority-dev/`, built with `/implement:start`. It measures what a small model, the Claude Code hooks, and tmux really do, before the policy and the actuator exist.

## Motivation

The design of priority.dev holds documents and no measurement. A wrong guess would reach the actuator, which sends text into live sessions.

## Changes

1. **E1 Probes.** A model probe (slice 1), a hook probe with a timeout and a bypass file (slice 2), and a tmux probe (slice 3).
2. **E2 Interpreter.** The stop brief, Interpret with DSPy on Nemo, Digest on Inkling, and a replay report with failure drills (slices 4 to 7).
3. **E3 Event log.** Postgres 17 with append, read, ingest, follow, and an interpreter service (slices 8 to 10).
4. **E4 Adapter to the log.** Hooks and tail through a spool, a signed send, and an answer from a held hook (slices 11 to 13).

## Out of scope

- Jev, the policy, the actuator, the attention queue, and the notifier.
- A second harness, and the launch of new sessions.
- A real `priority-dev-phase-a` program.

## Open and unverified

- No OpenRouter call has run. Nemo's validity on the 13 action payloads is unknown.
- `$TMUX_PANE` in hooks, the transcript lag after Stop, and whether the permission dialog shows while a hook waits are unknown.
- What the transcript holds when `/goal` clears is unknown.

## Test plan

- A blind rubric for each slice. Each unknown is a criterion with an observable answer.
- Module tests with a dummy model. A replay with the real models on local fixtures.
- Probes run in a scratch tmux session only.
