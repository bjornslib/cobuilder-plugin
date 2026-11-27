# Rubric: Slice 16 — Metric and baseline

Feature: priority-dev-spike
Epic: E5
Slice goal: `uv run priority eval --split train` and `--split holdout` print a score for each fact, the step kinds, and the grounding, and an overall score. `probes/eval-baseline.md` states both scores, the spread over three repeats, and the cost.
Test command: `uv run --project priority-dev pytest priority-dev/tests -q`

## Criteria

### C1 — The metric scores made-up stops correctly [CRITICAL] [CRITICAL]
**Must be true:** on made-up fixtures with a known answer, a perfect prediction scores 1.0, a wrong status loses exactly its share, a wrong first step loses its share, an accepted alternative in a list counts as right, and a quote that is not in the brief loses the grounding share.
**Evidence to check:**
- Run the metric tests and read the stated weights.
**Scoring:**
- 1.0 — all five cases hold and the weights are stated
- 0.5 — four hold
- 0.0 — a wrong prediction scores 1.0

### C2 — The metric is compatible with GEPA [CRITICAL]
**Must be true:** it accepts the five-argument GEPA signature and returns a score and a feedback text that names which field or step was wrong and what the label says. It also works as a plain metric with `dspy.Evaluate`.
**Evidence to check:**
- Call it both ways in the tests.
**Scoring:**
- 1.0 — both ways work and the feedback names the wrong field
- 0.5 — both work, but the feedback is generic
- 0.0 — one way fails

### C3 — Train and held-out scores are reported apart
**Must be true:** `eval` prints the train score and the held-out score on their own, and a score for each session. It never mixes the parts.
**Evidence to check:**
- Run both splits and read the output.
**Scoring:**
- 1.0 — both print and no mixing
- 0.5 — both print, but no score for each session
- 0.0 — one split missing or mixed

### C4 — The baseline report holds the spread and the cost
**Must be true:** `eval-baseline.md` states the scores of three repeats on each split, the spread, the number of calls, the characters sent, and an estimated cost. Ambiguous stops are scored with and without.
**Evidence to check:**
- Read the report and compare it with the stored call rows.
**Scoring:**
- 1.0 — all stated and the figures match the rows
- 0.5 — one figure is missing or does not match
- 0.0 — several missing

### C5 — The report says what the baseline cannot show
**Must be true:** the report states the number of held-out stops, says whether a later gain smaller than the spread counts, and names the abort condition it informs with a result of held, refuted, or not measured.
**Evidence to check:**
- Read the report.
**Scoring:**
- 1.0 — all three present
- 0.5 — two present
- 0.0 — one or none

## Regression check
- All tests that passed before this slice must still pass.
- Files outside `priority-dev/` must remain unchanged, except the committed reports named in the slice.

## Out of scope — do not penalise
- Behaviour that belongs to a later slice of the plan.
- The policy, the actuator, the attention queue, and the notifier.
- Real transcript text is private. A report that quotes none of it is correct.
