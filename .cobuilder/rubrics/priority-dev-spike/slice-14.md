# Rubric: Slice 14 — Notify for a done stop

Feature: priority-dev-spike
Epic: E5
Slice goal: `notify` is an action kind. For a stop that Triage calls done, `priority interpret` prints an Interpretation with one `notify` step that code builds from the final reply, with no Pick or Fill call.
Test command: `uv run --project priority-dev pytest priority-dev/tests -q`

## Criteria

### C1 — A done stop gives one notify step and no model call after Triage [CRITICAL]
**Must be true:** with a dummy model that says `done`, the result holds exactly one step of kind `notify`. The model received one call (Triage) and no Pick, Fill, or Card call.
**Evidence to check:**
- Run the module tests.
- Count the calls the dummy model received.
**Scoring:**
- 1.0 — both hold
- 0.5 — the step is there, but a Pick or Fill call also ran
- 0.0 — no notify step

### C2 — The excerpt is an exact part of the final reply [CRITICAL]
**Must be true:** `excerpt` is a substring of the FINAL REPLY of the brief, is not empty, and is at most 600 characters. A brief with an empty final reply gives an Abstain with a stated reason, not an empty excerpt.
**Evidence to check:**
- Run the tests for a short reply, a long reply, a reply with several paragraphs, and an empty reply.
- Check the substring by script.
**Scoring:**
- 1.0 — all four cases hold
- 0.5 — the excerpt is a substring in three cases
- 0.0 — an excerpt that is not in the reply

### C3 — The new kind is wired into the schema and the checks
**Must be true:** `notify` is in the action kinds, in `schemas.md`, and in the allowed kinds that Pick receives. A Pick step of kind `notify` on a stop that is not done is allowed by the schema but is reported in the output.
**Evidence to check:**
- Read the schema tests and `schemas.md`.
- Run the kind-list test.
**Scoring:**
- 1.0 — all three places hold it
- 0.5 — two of three
- 0.0 — one place or none

### C4 — A real run prints the notice
**Must be true:** with the real model on one finished real stop, `priority interpret` prints an Interpretation with a `notify` step and an excerpt that is in the reply.
**Evidence to check:**
- Run it once on a finished real session.
**Scoring:**
- 1.0 — it prints and the excerpt is in the reply
- 0.5 — it prints after a retry by hand
- 0.0 — a crash, or no notify step

### C5 — Nothing else changed
**Must be true:** stops that Triage calls waiting or continuing still go to stage 2 as before.
**Evidence to check:**
- Run the full suite and read the stage 2 gate tests.
**Scoring:**
- 1.0 — all earlier tests pass and the gate tests are unchanged
- 0.5 — one earlier test was edited to pass
- 0.0 — a gate test fails

## Regression check
- All tests that passed before this slice must still pass.
- Files outside `priority-dev/` must remain unchanged, except the committed reports named in the slice.

## Out of scope — do not penalise
- Behaviour that belongs to a later slice of the plan.
- The policy, the actuator, the attention queue, and the notifier.
- Real transcript text is private. A report that quotes none of it is correct.
