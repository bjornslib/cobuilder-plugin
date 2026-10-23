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

1. Slice 4: the stop brief and its snapshots.
2. Slice 5: Interpret, with call records.
3. Slice 6: Digest and `previous`.
4. Slice 7: the replay report with failure drills, then the go or no-go.

## Test Plan

Snapshots for the brief. `DummyLM` for the valid, quote-not-in-brief, kind-not-allowed, and done paths. Real calls only in the replay. Failure drills inject 429, malformed JSON, an empty quote, and a timeout.

## Risks & Open Questions

- Nemo validity on the 13 payloads is unknown. The split into small calls is a bet.
- `JSONAdapter` against `ChatAdapter` on Nemo is open. The replay compares both.
- The free Inkling tier may rate-limit. The replay counts the errors.
