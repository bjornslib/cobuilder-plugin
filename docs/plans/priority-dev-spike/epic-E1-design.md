# Epic Technical Solution Design: E1 — Probes

Feature: priority-dev-spike
Epic ID: E1

## Scope and Intent

Three probes measure the model, the hooks (a Claude Code behaviour), and the tmux paste before any database exists. Each ends in a committed report. A probe may refute its claim. The design source is `priority-dev/docs/design/adapter-host.md` (sections 2, 3, and 7) and `dspy-modules.md`.

## Files Touched

- `priority-dev/probes/model_probe.py`, `hook_probe.py`, `tmux_probe.py`
- `priority-dev/probes/{model,hook,tmux}-probe.md` and `probes/logs/`
- `src/priority/host/hook_cli.py` (the hook command, with timeout and bypass)
- `src/priority/config.py` (the one reader of the key)

## Types & Signatures

- `hook_cli.main(event: str) -> int`: reads JSON on stdin, writes one line to the local file, exits 0 on any failure within 5 seconds, and does nothing when `~/.priority-dev/bypass` exists.
- `model_probe.run(transcript: Path) -> ProbeResult` with the five facts, a kind, a quote, and `quote_in_text: bool`.

## Slice Decomposition

1. Slice 1: the model probe on 3 redacted real transcripts.
2. Slice 2: the hook command, its installer, and a scratch Claude Code session in a tmux pane. Claude Code runs the hooks. The pane only hosts the session and supplies `$TMUX_PANE`. Slice 2 also measures the held-hook dialog. Needs no slice 1.
3. Slice 3: the tmux paste probe. Needs only a scratch pane.

## Test Plan

Tests cover the hook command timeout and bypass. The reports are read by the validator against the rubric. Probes run only in a scratch session, and a test checks the target pane id.

## Risks & Open Questions

- Whether `$TMUX_PANE` reaches the hook. The report answers it.
- A hook installed in a live session may freeze it. Scratch only, with the bypass file first.
- Real transcripts hold secrets. Redaction runs before any model call.
