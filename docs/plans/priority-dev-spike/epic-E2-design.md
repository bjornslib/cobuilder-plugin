# Epic Technical Solution Design: E2 — Interpreter

Feature: priority-dev-spike
Epic ID: E2

## Scope and Intent

The interpreter turns a recorded transcript into a stop brief, an Interpretation or an Abstain, and a RunDigest. The source is `schemas.md`, `dspy-modules.md`, and the two running sketches.

## Files Touched

- `src/priority/brief/` (builder, redactor), `src/priority/interpreter/` (signatures, modules, checks), `src/priority/cli.py`
- `fixtures/` (real ones ignored by Git), `tests/`, `reports/replay.md`

## Types & Signatures

- `build_brief(transcript, stop, previous) -> StopBrief`
- `Interpreter.forward(brief) -> Interpretation`; `DigestRun.forward(brief) -> RunDigest`
- Types as in `interpreter_schemas.py`, with `brief_id` for the id.

## Slice Decomposition

1. Slice 4: the stop brief and its snapshots. The brief picks the last non-`<synthetic>` assistant message as the stop. A client message after it goes in a `CLIENT MESSAGE:` section, and the stop source is `client_error`. A transcript with only synthetic assistant records is an Abstain `no_agent_reply`. The RUN section holds the last 40 lines before the stop, counted across ask boundaries, with human asks as `[human]` lines.
2. Slice 5: Interpret, with call records.
3. Slice 6: Digest and `previous`.
4. Slice 7: the replay report with failure drills, then the go or no-go.

## Test Plan

Snapshots for the brief. `DummyLM` for the valid, quote-not-in-brief, kind-not-allowed, and done paths. Real calls only in the replay. Failure drills inject 429, malformed JSON, an empty quote, and a timeout.

## Risks & Open Questions

- The interpreter model is `deepseek/deepseek-v4.1-flash-1017` and the digest model is `thinkingmachines/inkling-small`. Validity on the 13 payloads is unknown. The split into small calls is a bet.
- `JSONAdapter` against `ChatAdapter` on the interpreter model is open. The replay compares both.
- Slice 1 found that `inkling:free` refuses direct calls. The replay counts the rate-limit errors of the paid models instead.
