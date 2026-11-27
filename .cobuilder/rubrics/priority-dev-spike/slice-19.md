# Rubric: Slice 19 — Judge-scored payload flow

Feature: priority-dev-spike
Epic: E6
Slice goal: The label-free gate, `Decide.questions`, the judge module, and the metric wiring run end to end on made-up fixtures with a stub judge: each gate fault abstains with a named 0-score note, a multi-question payload parses, readers use the list, the judge returns the final score with per-part notes, and per-stop rows carry the parts.
Test command: `uv run pytest priority-dev/tests -q`

## Criteria

### C1 — Label-free gate faults abstain with named notes and score 0 [CRITICAL]
**Must be true:** each gate fault (unparsable output, bad enum value, disallowed kind, step count out of range, `ask_human` with an empty questions list) ends as an Abstain whose reason names the failed check, scores 0.00, and carries feedback naming the check. No label is consulted. The gate runs with no label present.
**Evidence to check:**
- Run the gate tests on made-up inputs.
- Feed one faulty input per fault through the interpreter with the stub model and read the Abstain reason, the score, and the feedback.
**Scoring:**
- 1.0 — all five faults abstain with named reasons, score 0, and named feedback, label-free.
- 0.5 — faults abstain but a reason or note is missing or generic.
- 0.0 — any fault crashes, scores non-zero, or needs a label.

### C2 — Multi-question payload parses; empty list rejected; readers use the list [CRITICAL]
**Must be true:** a `Decide` with two or more questions parses and flows through pick, fill, and card. An empty questions list is rejected. No code path reads the old single `.question` field: card, `to_prediction`, and the runner address the list.
**Evidence to check:**
- Run the schema and reader tests.
- Grep the source for `.question` reads outside tests and migration notes.
**Scoring:**
- 1.0 — multi parses, empty rejected, zero stale single-question reads in source.
- 0.5 — parses but one reader still uses the single field.
- 0.0 — multi fails or empty passes.

### C3 — Judge contract: raw payloads in, clamped score with per-part notes out [CRITICAL]
**Must be true:** the judge receives the raw predicted payloads (never a flattened dict), the brief text, and the expected payloads, and returns a score within 0.00 to 1.00 with one note per scored part. The metric clamps an out-of-range judge score and wraps the result as a `Prediction` with `score` and `feedback`. A stub judge stands in for tests; no test makes a model call.
**Evidence to check:**
- Run the judge contract tests with the stub judge.
- Feed the judge an out-of-range score and a malformed note; check clamping and fallback.
- Grep the tests for live model calls.
**Scoring:**
- 1.0 — raw in, clamped score plus per-part notes out, `Prediction` shape, stub only.
- 0.5 — contract holds but clamping or a note is missing.
- 0.0 — judge sees flattened input, or a test calls a live model.

### C4 — Per-stop rows carry the judge parts; aggregation unchanged
**Must be true:** each per-stop line carries the judge score with its per-part notes and the gate outcome. Session means and arm means aggregate exactly as before.
**Evidence to check:**
- Run eval on made-up fixtures and parse the per-stop lines.
- Run the optimiser stub run and check one row per stop.
- Recompute one session mean by hand from its stop lines.
**Scoring:**
- 1.0 — every stop line carries the score, the parts, and the gate outcome, and the means recompute exactly.
- 0.5 — numbers present but a mean does not recompute.
- 0.0 — lines missing or means changed.
### C5 — Predictor feedback names its target
**Must be true:** with a predictor name given, the feedback names that predictor and speaks to its own fields, while the score stays the program-level number.
**Evidence to check:**
- Run the feedback tests for triage, pick, and one fill.
**Scoring:**
- 1.0 — all three name their target with field-specific notes and unchanged scores.
- 0.5 — names the target but notes stay generic.
- 0.0 — feedback ignores the target.

## Regression check
- All tests that passed before this slice must still pass.
- No test makes a live model call.
- Files outside `priority-dev/` must remain unchanged, except the committed reports named in the slice.

## Out of scope — do not penalise
- Behaviour that belongs to slice 20 (payload labels, agreement bar, rescore).
- The policy, the actuator, the attention queue, and the notifier.
