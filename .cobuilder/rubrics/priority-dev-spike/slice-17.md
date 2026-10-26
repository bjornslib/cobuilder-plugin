# Rubric: Slice 17 — One-call variant

Feature: priority-dev-spike
Epic: E5
Slice goal: `uv run priority eval --variant combined` runs Triage and one call that writes the steps, the payloads, and the card, and `probes/eval-variant.md` compares it with the split chain on the same stops.
Test command: `uv run --project priority-dev pytest priority-dev/tests -q`

## Criteria

### C1 — The combined variant returns the same types [CRITICAL] [CRITICAL]
**Must be true:** with a dummy model, the variant returns an Interpretation with the same `Proposal`, `Question`, and Abstain types as the chain. Code still sets the session, author, and confidence, and still checks every kind and quote. A bad quote in any step gives an Abstain that names the step.
**Evidence to check:**
- Run the variant tests, including four steps and a bad quote in step 2.
**Scoring:**
- 1.0 — all hold
- 0.5 — the types match but one check is missing
- 0.0 — a different output type or an unchecked quote

### C2 — The comparison uses the same stops and the same metric [CRITICAL]
**Must be true:** the report scores the chain and the variant on the same held-in and held-out stops, with the slice 16 metric and the same number of repeats.
**Evidence to check:**
- Read the report and the call rows.
**Scoring:**
- 1.0 — same stops, metric, and repeats
- 0.5 — same stops, but a different repeat count
- 0.0 — different stops or metric

### C3 — Calls, characters, seconds, and cost are compared
**Must be true:** the report gives the calls, the characters sent, the seconds, and the estimated cost of each, and the score difference against the spread.
**Evidence to check:**
- Recompute two figures from the rows.
**Scoring:**
- 1.0 — all stated and two recomputed figures match
- 0.5 — one missing or one mismatch
- 0.0 — several missing

### C4 — A contradiction check is reported
**Must be true:** the report counts the proposals where the card and the first step disagree, for both the chain and the variant, for example a `snooze` beside a question card.
**Evidence to check:**
- Recompute the count from the rows.
**Scoring:**
- 1.0 — stated and it matches the rows
- 0.5 — stated but not checkable
- 0.0 — absent

### C5 — The decision is stated
**Must be true:** the report names which one the next slice uses and the reason, and says plainly when the difference is inside the spread.
**Evidence to check:**
- Read the last section.
**Scoring:**
- 1.0 — named with a reason
- 0.5 — named without a reason
- 0.0 — absent

## Regression check
- All tests that passed before this slice must still pass.
- Files outside `priority-dev/` must remain unchanged, except the committed reports named in the slice.

## Out of scope — do not penalise
- Behaviour that belongs to a later slice of the plan.
- The policy, the actuator, the attention queue, and the notifier.
- Real transcript text is private. A report that quotes none of it is correct.
