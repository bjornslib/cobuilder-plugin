# Epic Technical Solution Design: E6 — Judge-scored payload flow

Feature: priority-dev-spike
Epic ID: E6

## Scope and Intent

E5 showed that instruction tuning and demos move train and valset numbers but prove nothing on held-out stops, and that the metric cannot see payload quality: `to_prediction` keeps only step kinds, pick's evidence quote, and the card question, while labels carry no payload fields. A fill rewrite can therefore only move the score through parse success. E6 gives the scorer eyes: labels record the expected payload, and a judge model grades meaning.

The flow is fixed: build input data, run TriageLM, PickStep, FILL, and WriteCard, pass the label-free mechanical gate, then judge the raw payload against the expected payload. The judge returns the final score with one note per part. The metric only clamps the score and wraps it in `dspy.Prediction`. A gate failure scores 0 with feedback naming the failed check, so reflection still sees format failures.

E6 builds no policy and no actuator. It changes the interpreter schema, the metric, and the labels. It does not change the brief or the chain order.

## Files Touched

- `priority-dev/src/priority/interpreter/models.py` (`Decide.questions`, non-empty, order free)
- `priority-dev/src/priority/interpreter/checks.py` (label-free gate: parse, fields, enums, kinds, step count, non-empty questions)
- `priority-dev/src/priority/interpreter/signatures.py` (ask_human fill emits the questions list)
- `priority-dev/src/priority/evaluation/judge.py` (new: the judge module, brief plus raw payload plus expected payload in, score plus per-part notes out)
- `priority-dev/src/priority/evaluation/metric.py` (calls the judge, clamps the score, wraps `Prediction`; per-predictor feedback stays; closed fields compare exactly inside the judge rubric)
- `priority-dev/src/priority/evaluation/runner.py` (readers of `.question` move to the list, per-stop rows carry facts, steps, validity, payload score)
- `priority-dev/src/priority/optimise.py` (judge-backed `gepa_feedback`, seeded runs keep working)
- `priority-dev/fixtures/real/labels-confirmed.json` (payloads per ask_human step, Git-ignored like the rest)
- `priority-dev/probes/schema-flow.html`, `schema-flow-current.svg`, `schema-flow-target.svg` (review aid, already in the repo)

## Key Structures

- `Decide.questions: tuple[Question, ...]` with at least one item and no empty default. One `ask_human` step holds all of a stop's questions. Order does not count. Readers of `.question` (card, `to_prediction`, tests) move to the list in the same slice.
- Label-free gate: the output must parse, fields and enums must be valid, kinds must be allowed, the step count must sit in range, and an `ask_human` step must hold at least one question. "The model should have asked here" belongs to the judge, which can give partial credit. The gate runs at inference time with no label.
- `judge(brief_text, model_payload, expected_payload) -> (score, notes)`: raw payloads in, never flattened. Closed parts compare exactly inside the rubric. Open parts compare by meaning.
- `gepa_feedback` keeps the five-argument GEPA signature and forwards `pred_name` and `pred_trace`, so each predictor gets its own notes. The metric clamps the judge score and returns `dspy.Prediction(score, feedback)`.
- Model separation: a stronger reflection LM and a judge model that is not the task model, each with a metered cost per run, decided before the slice scores anything.

## Slice Decomposition

1. Slice 19: the code flow. Label-free gate, `Decide.questions`, ask_human fill emits the list, readers move to the list, judge module with a stub judge for tests, metric calls the judge then clamps and wraps with closed fields exact inside the rubric, per-stop rows carry the payload score, `gepa_feedback` calls the judge. Made-up fixtures only, no live calls. A pilot set of 10 labelled stops with payloads proves the path end to end.
2. Slice 20: payload labels and judge validation. Payloads for the busy kinds first, one `ask_human` step per stop with all its questions, engineer-confirmed. The judge needs an agreement bar against human grades before it scores anything. Then rescore every arm under the new metric.

Slices run in order. Slice 20 needs slice 19.

## Test Plan

- `DummyLM` tests for the gate (each fault abstains with a named 0-score note), the questions list (multi accepted, empty rejected), and the readers move.
- `optimise` writes per-stop rows for its own evaluations, in the runner format, so GEPA runs leave an auditable record instead of only the GEPA log.
- The metric tests use made-up fixtures in the repository, never real text.
- Real calls only in the agreement bar and the rescore.

## Risks & Open Questions

- Judging exact fields with a model adds run-to-run noise. The agreement bar must cover the exact fields too, not just the open ones.
- The judge costs one model call per stop. Meter it before the slice scores anything, or the rescore bill arrives unseen.
- Relabelling adds payloads to the existing steps. Step lists do not split: one `ask_human` step keeps all its questions.
- Payload labels are a judgement. The engineer's confirmation is the ground truth, as with the existing labels.
- The judge returns the final score, so there is no payload-share weight to set. The metric only clamps and wraps.
