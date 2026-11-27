# Epic Technical Solution Design: E4 — Adapter to the log

Feature: priority-dev-spike
Epic ID: E4

## Scope and Intent

The adapter host sends hook events and transcript records to the log through a spool, receives a signed command, and answers from a held hook. The source is `adapter-host.md`.

## Files Touched

- `src/priority/host/` (spool, tailer, puller, tmux module, installer), `tests/test_host_*.py`

## Types & Signatures

- `spool.write(event)`, `spool.flush(post)`; `tmux.send(pane, text) -> SendResult` as the only tmux caller; `verify(command, key) -> bool` over an HMAC.

## Slice Decomposition

1. Slice 11: hooks and tail to the log.
2. Slice 12: a signed send with confirmation.
3. Slice 13: an answer from a held hook.

## Test Plan

A test searches the repository for tmux calls outside the tmux module. Scratch session tests for the send and the held hook. A restart test for the tailer keys.

## Risks & Open Questions

- Pane state, newlines, and a lost paste (measured in slice 3).
- Whether the dialog shows while a hook waits (slice 3). Slice 13 depends on it.
