# Rubric: Slice 5 — Interpret a stop

Feature: priority-dev-spike
Epic: E2
Slice goal: `uv run priority interpret` runs Triage, Pick, Fill, and Card on the interpreter model through DSPy, prints an Interpretation or an Abstain, and stores each call with its model id, prompt hash, and raw reply.
Test command: `uv run pytest priority-dev/tests -q`

## Criteria

### C1 — The valid path gives a proposal of one to three steps [CRITICAL]
**Must be true:** with a dummy model that answers correctly, the result is an Interpretation. A dummy that picks one step gives a proposal of one step. A dummy that picks three steps gives a proposal of three steps, in order, with one Fill call for each step. The result holds a question card when a human must answer. A dummy that picks four steps gives an Abstain.
**Evidence to check:**
- Run the module tests.
**Scoring:**
- 1.0 — the one-step, three-step, and four-step tests pass.
- 0.5 — the one-step test passes, but a multi-step test fails.
- 0.0 — the one-step test fails.

### C2 — A bad quote or a bad kind in any step gives an Abstain [CRITICAL]
**Must be true:** a quote that is not in the brief gives `quote_not_in_brief`, and a kind that is not allowed gives `kind_not_allowed`. The check applies to each step, so a fault in step 2 or 3 also gives an Abstain that names the step. None raises an exception.
**Evidence to check:**
- Run the tests for step 1 and for a later step.
**Scoring:**
- 1.0 — both faults give an Abstain in step 1 and in a later step.
- 0.5 — the faults give an Abstain in step 1 only.
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
