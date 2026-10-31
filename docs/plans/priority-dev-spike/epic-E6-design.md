# Epic Technical Solution Design: E6 — Judge-scored payload flow

Feature: priority-dev-spike
Epic ID: E6

## Scope and Intent

E5 showed that instruction tuning and demos move train and valset numbers but prove nothing on held-out stops, and that the metric cannot see payload quality: `to_prediction` keeps only step kinds, pick's evidence quote, and the card question, while labels carry no payload fields. A fill rewrite can therefore only move the score through parse success. E6 gives the scorer eyes: labels record the expected payload, and a judge model grades meaning.

The flow is fixed: build input data, run TriageLM, PickStep, FILL, and WriteCard, pass the label-free mechanical gate, then judge the raw payload against the expected payload. The judge returns the final score with one note per part. The metric only clamps the score and wraps it in `dspy.Prediction`. A gate failure scores 0 with feedback naming the failed check, so reflection still sees format failures. The target diagram in `priority-dev/probes/schema-flow-target.svg` draws this contract. Code that disagrees with either is wrong.

E6 builds no policy and no actuator. It changes the interpreter schema, the metric, and the labels. It does not change the brief. Slice 21 changes the routing after triage, at the engineer's direction on 30 October 2026.

## Files Touched

- `priority-dev/src/priority/interpreter/models.py` (`Decide.questions`, non-empty, order free)
- `priority-dev/src/priority/interpreter/module.py` (slice 21: every stop reaches Pick and Fill, Fill sees the facts and the earlier steps)
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
2. Slice 20: reference payloads and judge validation. The judge scores the payload only, against a reference payload in the model's own shape. Facts and step kinds are no longer judge inputs. A stop with no reference does not count until it has one. The drafter writes each reference from the stop brief only and never sees a seed or candidate payload, as for the pilot set. The engineer corrects and confirms each draft. Seed outputs serve only as a regression check, never as a draft or a reference. Target: every stop of the fixture set, 67 train and 30 holdout, with no stop skipped. Done and continuing stops get a reference too, even when it is short. One `ask_human` step per stop holds all its questions. The judge needs an agreement bar against human grades before it scores anything. Then rescore every arm under the new metric.
   Two rules cover a missing payload, and a RED test pins each one. First, when a stop has a reference payload but the candidate's triage says done or continuing and writes no payload, the stop scores 0 with a note that names the triage status. A skip would let GEPA raise its score by triaging asking stops away. Second, a reference may state that no payload is due. When the candidate writes a payload on such a stop, the stop scores 0 with a note that names the payload kind. This rule stops GEPA from raising its score by asking on every stop.
   The payload is the list of steps that the system emits for the stop, as the model shape dumps it. A reference is a label field `payloads`: the target proposal of 1 to 3 steps, drawn from the full action set (reply, continue, snooze, notify with its excerpt, set_priority_hint, ask_human with the decide, do, or review role, and the others). `[]` means that no step helps, and it is rare. On 30 October the engineer rejected a first draft that used only ask_human, notify, and `[]`. When both lists are empty, the stop scores 1. Any abstain scores 0 with a note that names its reason. Code-set fields (`session_id`, `author`, `confidence`, `evidence_quote`) never reach the judge, and the judge grades only the fields that the reference states. With no judge model, a stop scores 0 with the stub note. The legacy facts-and-steps score no longer runs as a fallback. Facts and step kinds stay in the report as diagnostics only.
   Routing: the old chain sent a done stop to a notify built by code and a continuing stop to no step, so a reference such as continue then notify was out of reach for every arm. Slice 21 removes that routing. The live runs of slice 20 wait for slice 21.
   `to_prediction` must carry the payloads. Today it drops them, so every eval-path judge call so far saw no predicted payload. The runner and optimise exclude each stop without a reference and print the count.
   The agreement bar is one command, `priority judge-check`. It reads a local pairs file with two payload lists per stop and the human pick, and it judges each side twice. Three bars, fixed before the run: the judge direction matches the human on at least 75% of the picked pairs, with at least 6 pairs. On code-made copies of each reference with one closed field changed (priority, multi_select, role, one option label), the judge scores the copy lower than the unchanged reference at least 90% of the time. The judge direction flips between repeats on at most 10% of the pairs. The command prints each bar, then `agreement bar: pass` or `agreement bar: fail`, and exits 1 on a fail.
   Metering: the judge counts its calls and its prompt and completion tokens. `eval`, `optimise`, and `judge-check` print the totals. The price per token is not known, so the report states tokens, not dollars. The judge stays the Mercury task model by the engineer's choice, and self-preference stays a named risk.
3. Slice 21: one typed call. The design is `priority-dev/probes/program-flow-v2.svg`, and code that disagrees with it is wrong. The engineer chose this on 31 October 2026, after the analysis showed that the code between the signatures and the judge lost payloads, hid 33 references behind routing, and spread GEPA over 18 predictors with the same notes.
   Program: `Interpreter(dspy.Module)` holds one predictor, `propose = dspy.Predict(ProposeStop)`. `ProposeStop` takes `brief_text` (the stop brief, which already ends with the final reply) and returns `status`, `needs_human`, `steps` (0 to 3 steps, a list discriminated on `kind` over the payload models of the 14 action kinds), and `priority` (`P1` disturb now with an alert, `P2` show in the inbox now, `P3` batch into the next digest), one priority for the whole payload. The model writes no `session_id`, `author`, `confidence`, or `evidence_quote`. Code sets `session_id` and `author`.
   Gate: the adapter parse and the pydantic validation of the output are the only gate. A failure is an Abstain with `invalid_output` and the validator's error text, which reaches GEPA as feedback. `forward` returns one `dspy.Prediction(status, needs_human, priority, steps, abstain)`, and the eval path and the GEPA path score that same object.
   Reference: the label fields `priority` and `payloads`. The judge compares `{priority, steps}` on both sides, with priority as a closed field. The payload rules of slice 20 stay. `status` and `needs_human` stay as report diagnostics and are never scored.
   Removed: TriageLM, PickStep, the 14 Fill predictors, WriteCard, WriteCombined, the routing by status, `done_outcome`, `check_steps`, `check_fill_payload`, `to_prediction` on the scoring path, `BusyComponentSelector`, and the variant flag. The chain programs in `probes/programs/` cannot load into the new program. On the engineer's instruction, no chain baseline runs before the removal.
   Demos: a demo picker chooses up to 4 train stops with short briefs, one for each main payload shape, and gives each one its brief as input and its full reference as output. It prints the stops by name. Those stops are excluded from the GEPA valset and from the train rescore. Holdout stops never appear in a prompt.
   Arms for the slice 20 rescore: A, the base program with no demos. B, the base program with the reference demos. C, GEPA from the better of A and B. The holdout duel pairs the better base arm with C.

Slices run in order. Slice 20 needs slice 19. The live runs of slice 20 need slice 21.

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
- A reference drafted from a seed output anchors the reviewer to seed wording, so the score drifts back to closeness to the seed. Drafts come from the brief only.
- Open, raised by the engineer on 30 October: the interface needs a digest of the human message and the final agent reply. The current `RunDigest` sums up a run for the next stop brief and is not shown to users. This is an architecture change outside slice 20, and it needs a design decision first.
- Open: the question card from `WriteCard` is not part of the payload, so no score grades it.
