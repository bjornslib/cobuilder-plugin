# Rubric: Slice 5 — Interpret a stop

Feature: priority-dev-spike
Epic: E2
Slice goal: `uv run priority interpret` runs Triage, Pick, Fill, and Card on Nemo through DSPy, prints an Interpretation or an Abstain, and stores each call with its model id, prompt hash, and raw reply.
Test command: `uv run pytest priority-dev/tests -q`

## Criteria

### C1 — The valid path gives a one-step proposal [CRITICAL]
**Must be true:** with a dummy model that answers correctly, the result is an Interpretation with one step and a question card when a human must answer.
**Evidence to check:**
- Run the module tests.
**Scoring:**
- 1.0 — the test passes.
- 0.5 — the proposal is built, but the card is missing.
- 0.0 — the test fails.

### C2 — A quote that is not in the brief gives an Abstain, and so does a kind that is not allowed [CRITICAL]
**Must be true:** the reasons are `quote_not_in_brief` and `kind_not_allowed`. Neither raises an exception.
**Evidence to check:**
- Run the two tests.
**Scoring:**
- 1.0 — both pass.
- 0.5 — one passes.
- 0.0 — either raises or proposes.

### C3 — Each call is stored with its model id, prompt hash, and raw reply
**Must be true:** after one run, the store holds one row for each model call with the three fields, and the rendered input.
**Evidence to check:**
- Run `priority interpret` on one fixture, then read the store.
**Scoring:**
- 1.0 — every call has all fields.
- 0.5 — one call lacks a field.
- 0.0 — no rows.

### C4 — A real run on one fixture prints a result
**Must be true:** with the real model on one local fixture, the command prints an Interpretation or an Abstain and does not crash.
**Evidence to check:**
- Run it on one fixture.
**Scoring:**
- 1.0 — a result prints.
- 0.5 — a result prints after a retry by hand.
- 0.0 — a crash or no output.

### C5 — The report names the abort condition it informs
**Must be true:** the report states which `abort_if` condition of `goal.json` it informs, and gives a plain result: held, refuted, or not measured.
**Evidence to check:**
- Read the report named in the slice goal.
- Find the sentence that names the condition and the result.
**Scoring:**
- 1.0 — the sentence exists and the result matches the raw logs.
- 0.5 — the sentence exists, but the result is vague or the logs are missing.
- 0.0 — no such sentence.

## Regression check
- All tests that passed before this slice must still pass.
- Files outside `priority-dev/` must remain unchanged, except the committed reports named in the slice.

## Out of scope — do not penalise
- Behaviour that belongs to a later slice of the plan.
- The policy, the actuator, the attention queue, and the notifier.
