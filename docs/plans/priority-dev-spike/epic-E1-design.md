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
- `model_probe.run(transcript: Path, *, model=INTERPRETER_MODEL) -> ProbeResult` with the five facts, a kind, a quote, and `quote_in_text: bool`. `INTERPRETER_MODEL` is `openrouter/deepseek/deepseek-v4.1-flash-1017`. `DIGEST_MODEL` is `openrouter/thinkingmachines/inkling-small`.
- `model_probe.repeat(transcript, n, *, model) -> list[ProbeResult]` and `agreement(results) -> dict` (the share of results that hold the most common value, for each of the five facts and the kind).
- A model reply is a string or a dict with `text` and `reasoning_content`. Any other shape is an Abstain `invalid_output`.
- Each call record in `probes/logs/calls.jsonl` holds the model id, the prompt hash, the full prompt text, the reply text, and the reasoning text or null. Raw prompts hold redacted text only.

## Slice Decomposition

1. Slice 1: the model probe. It runs the interpreter model and the digest model on 3 redacted real transcripts, 3 calls each, and reports validity, quote-found rate, agreement, and the exact prompt. Both models get the same classification prompt. The digest model's run checks that it answers and how stable it is. It does not test Digest, which is slice 6. The brief gets three small fixes only: skip `<synthetic>` client records when it picks the stop, label the human line `HUMAN ASKED:`, and state the model's role. The full stop brief belongs to slice 4.
2. Slice 2: the hook command, its installer, and a scratch Claude Code session in a tmux pane. Claude Code runs the hooks. The pane only hosts the session and supplies `$TMUX_PANE`. Slice 2 also measures the held-hook dialog. Needs no slice 1.
3. Slice 3: the tmux paste probe. Needs only a scratch pane.

## Test Plan

Tests cover the hook command timeout and bypass. The reports are read by the validator against the rubric. Probes run only in a scratch session, and a test checks the target pane id.

## Risks & Open Questions

- Whether `$TMUX_PANE` reaches the hook. The report answers it.
- A hook installed in a live session may freeze it. Scratch only, with the bypass file first.
- Real transcripts hold secrets. Redaction runs before any model call.
- The first probe of slice 1 sent a near-empty brief. Its stop was a client error, and the label `ASK:` hid that the human spoke. The two models then disagreed. Slice 4 owns the fix (see its row). Slice 1 only reports the defect and the agreement.
- `inkling:free` refuses direct API calls (403, "only available on agentic harnesses"). The digest model is `inkling-small`, which costs money. The report states the cost.
