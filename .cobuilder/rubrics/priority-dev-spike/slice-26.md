# Rubric: Slice 26 — Live smoke run

Feature: priority-dev-spike
Epic: E7
Slice goal: A live optimiser run with a valset of 1 or 2 sessions, a minibatch of 3 trainset stops that scored low on C2 (at least one a parse failure), and a `max_metric_calls` that covers the seed score on the valset plus two minibatch runs, with the brief form that slice 25 chose. The call logs show Mercury 3 as task model and judge, and at least one NVIDIA Mistral reflection call. The saved reflection prompt holds each stop with its score, and the failed stop with its error text. The proposal is saved whole. The run finishes with no model or judge failure.
Test command: `uv run --project priority-dev pytest priority-dev/tests -q`

## Criteria

### C1 — A reflection call happened on the right model [CRITICAL]
**Must be true:** The log dir holds at least one `reflection-<NNN>.json`, and the reflection model's own call record (or provider usage) shows the NVIDIA Mistral model id. Task and judge calls show Mercury 3.
**Evidence to check:**
- Read the log dir and the call logs of the run.
**Scoring:**
- 1.0 — reflection file present and all three model ids shown
- 0.5 — reflection present but one model id not shown
- 0.0 — no reflection call

### C2 — The reflection prompt carries complete evidence [CRITICAL]
**Must be true:** In a saved reflection file of the live run, each of the 3 minibatch stops appears with a feedback starting with its score. The failure evidence comes from one of two sources: a stop in the live run that failed to parse shows its raw reply and error text in the reflection file, or, when no live reply failed to parse, the stub-model tests show it. The stub tests are in `priority-dev/tests/test_e7_reflection_evidence.py`: a failed stop keeps `raw_reply` and `error` in the trace, the reflective dataset keeps it, and a full stub GEPA run reflects on it. (Amended 6 November 2026 by the engineer, option c: a live parse failure happens by chance.)
**Evidence to check:**
- Read the reflection files and `calls.jsonl` of the live run, and check whether any task-model row is invalid.
- If none is invalid, run the three named stub tests and read what they assert.
**Scoring:**
- 1.0 — 3 stops with scores, and the failure evidence from the live run or the passing stub tests
- 0.5 — the failure evidence is missing its raw reply or its error text
- 0.0 — fewer than 3 stops or no score

### C3 — The proposal is whole and the run is clean
**Must be true:** The proposal in the reflection file equals the candidate instruction (plus one guard), even above 4000 characters. The run output shows 0 model errors and 0 judge failures and ends with a saved program or a clean no-improvement end.
**Evidence to check:**
- Compare the proposal with `candidates.json`.
- Read the run output.
**Scoring:**
- 1.0 — whole and clean
- 0.5 — whole but a retried judge error shows
- 0.0 — cut, or the run failed

### C4 — The setup cannot pass vacuously
**Must be true:** The run used a valset of 1 or 2 sessions, the chosen 3 stops include a C2 parse failure, and the budget allowed at least one mutation.
**Evidence to check:**
- Read the command and the printed sizes.
**Scoring:**
- 1.0 — all three shown
- 0.5 — one not shown
- 0.0 — none shown

## Regression check
- All tests that passed before this slice still pass, apart from tests that this slice's RED role rewrote for the new contract.
- `uv run shared/habit_smells.py --repo priority-dev --branch HEAD` reports no new finding in a file this slice touched.
- Files outside the slice scope stay unchanged: the code (no change expected in this slice except a run script)

## Out of scope — do not penalise
- The C3 result (slice 27).
