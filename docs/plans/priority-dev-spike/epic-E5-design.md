# Epic Technical Solution Design: E5 — Labelled prompts

Feature: priority-dev-spike
Epic ID: E5

## Scope and Intent

E2 showed that the interpreter runs end to end on real stops. It also showed wrong picks. The engineer reviewed the output on 26 October 2026 and found a `snooze` where a reply or a question was due, and a proposal that approved a design choice for the human. E5 measures the interpreter against labels, and then asks whether prompt optimisation improves it on stops that the optimiser never saw.

The engineer asked for about 10 real sessions, some with several stops, a held-out part, and a DSPy optimiser comparison between MIPROv2 and GEPA. The engineer also asked that a done session become a notice with the agent's reply as evidence, and asked whether Pick, Fill, and Card should run as one call.

E5 builds no policy and no actuator. It changes the interpreter only through the `notify` action, the combined variant, and compiled prompts.

## Files Touched

- `priority-dev/src/priority/interpreter/` (the `notify` action, the combined variant, loading a compiled program)
- `priority-dev/src/priority/evaluation/` (the label loader, the metric, the split, the runner)
- `priority-dev/src/priority/cli.py` (`fixtures check`, `eval`, `optimise`)
- `priority-dev/fixtures/real/` (sessions, briefs, drafts: Git ignores it), `priority-dev/fixtures/set-manifest.json`
- `priority-dev/tools/draft_fixtures.py` (picks stops and writes briefs)
- `priority-dev/docs/design/schemas.md` (the `notify` kind)
- `priority-dev/probes/eval-baseline.md`, `eval-variant.md`, `optimiser-report.md`


- Label of one stop: `status` (one value or a list of accepted values), `needs_human`, `answer_class`, `risk`, `priority_hint`, `steps` (an ordered list of 0 to 3 kinds, where a list at one position means any one of those kinds), `ambiguous`, `why`, `confirmed_by`, `confirmed_on`. An unconfirmed draft never counts.
- `Notify(ActionBase)`: `kind="notify"`, `excerpt: str`. Code sets `excerpt` from the final reply. The model writes nothing.
- `split(manifest) -> (train_sessions, holdout_sessions)`: by session, never by stop, so no stop of a held-out session trains the prompt. A fixed seed and the session id decide the part. About 30 percent of the sessions are held out.
- `score(example, prediction, trace=None, pred_name=None, pred_trace=None)`: it follows the GEPA signature. It returns a score from 0 to 1 and a feedback text for GEPA. Weights: facts 0.4 (each of the five fields counts the same), step kinds 0.4 (the first step 0.2, the whole ordered list 0.2), grounding 0.1 (every quote is in the brief), validity 0.1 (no Abstain from a model fault). Slice 16 fixes the weights and states them. A stop that the label calls ambiguous scores in the report both with and without it.
- `Interpreter(variant="chain"|"combined")`: the combined variant runs Triage, then one call that writes the steps, payloads, and card.
- `optimise(program, trainset, optimiser) -> compiled program`, saved as a file.

## Slice Decomposition
1. Slice 14: `notify`. A done stop gives one `notify` step built by code. The excerpt must state what the human has to do (for example, merge the PR), because no separate external action kind exists. A label may pair `notify` with `ask_human` when the work is done and a decision is still open. The interpreter chain stays Pick, Fill, and Card, and Fill runs once for each picked step. Slice 15 labels need this kind, so it comes first.
2. Slice 15: the fixture set. Ten sessions across projects, about 50 stops, with labels that a blind reader drafts and the engineer corrects and confirms. The split is by session.
3. Slice 16: the metric, the evaluation command, and the baseline report. The baseline records the spread over three repeats, so a later gain is read against the noise.
4. Slice 17: the combined variant against the chain, with the slice 16 metric on the same stops.
5. Slice 18: BootstrapFewShot, GEPA, and MIPROv2 on the train sessions only, scored on the held-out sessions.

Slices run in order. Each one needs the one before.

## Test Plan

- `DummyLM` tests for the `notify` step, the label loader, the split, the metric on made-up stops, and the combined variant.
- The metric tests use made-up fixtures in the repository, never real text.
- Real calls only in the baseline, the variant comparison, and the optimiser runs.
- `fixtures check` fails on an unconfirmed label, on a session in both parts, and on a real file that Git does not ignore.

## Risks & Open Questions

- About 50 labelled stops from 10 sessions is small. A held-out part of 3 sessions holds about 15 stops. A gain smaller than the spread over repeats is not a result. The reports must say so.
- A label is a judgement. Many drafted stops are ambiguous. The engineer's corrections are the ground truth, and the report counts ambiguous stops on their own.
- The model varies between runs on the same stop, so every figure needs repeats.
- Sampling the stops (spread over each session) puts many opening stops in the set. The engineer may ask for more mid-session stops.
- GEPA suits small data and a metric with text feedback. MIPROv2 usually needs more examples. The comparison may favour GEPA only because of the data size. The report states that.
- Optimiser runs cost model calls. Slice 18 records the cost of each run.
- The excerpt rule for `notify` (the first 600 characters of the final reply, cut at a sentence end) is a first guess. The engineer decides if the end of the reply is the better evidence.
- Real sessions and their labels hold private text. Git ignores them. The report quotes none.
