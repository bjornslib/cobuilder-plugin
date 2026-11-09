# Optimiser report (slice 18)

Date: 27 October 2026. All optimisers train on the 67 train stops in 14 sessions only.
The held-out part is 30 stops in 6 sessions. Baselines from slice 16 rerun
(probes/eval-baseline-v2.md): train means 0.626, 0.633, 0.660, holdout mean
0.708. A gain counts only on the holdout, each arm run twice, past run-to-run
noise. The pre-fix bootstrap gain below is void: its demos were chosen under
the floored metric.

## BootstrapFewShot (cheap baseline)

- Budget 5, seed 7, recompiled on the fixed wrappers. The saved program holds 16 demos per predictor.
- Held-out duel after recompile: 0.665 then 0.705 (30 stops each). Run-to-run spread 0.040.
- The pre-fix 0.665 single-run gain is void. Demos chosen under the floored metric are near-random.
- Cost: the holdout scoring runs made about 80 calls each. The compile itself is not metered.
- Verdict: does not beat the base. The base repeats 0.700 and 0.702.

## GEPA

- Budget 10, seed 7, minibatch 14, one thread, valset of 3 sessions (15 stops), fixed wrappers. Ran 22 iterations to completion. Seven acceptances: pick (2), fill['reply'] (3), fill['continue'] (6), fill['snooze'] (10), card (13), plus two late Pareto additions (20, 22). Base valset 0.676, best program 0.776 from iteration 2, unmoved after. Saved as probes/programs/gepa-budget10-seed7.json: new pick instruction, no demos. Holdout duel finished: 0.713 then 0.685 against base 0.700 and 0.702. Does not beat the base.
- Before the wrapper fix, every proposed instruction tied the base at the exact same float and was skipped. That was the floored metric, not the gate: different wordings produced identical measured totals because every score was the 0.2 constant.
- Rate limits returned despite serial execution: the evaluator still bursts its rollouts, and poisoned rollouts starved one round of reflective traces.
- The broken-wrapper programs hold no demos and unchanged instructions. The fixed run's best program is above.
- Root cause of the valley, 27 October 2026: the runner flattens each Interpretation through to_prediction before score(), but gepa_feedback and plain_score passed the raw Interpretation. The metric reads top-level status, steps, quotes, and abstain, which a raw Interpretation does not hold, so every GEPA-path score floored at grounding 0.1 plus validity 0.1: a constant 0.2 whatever the instruction says. That is the exact-tie mechanism, and it also nulled BootstrapFewShot's metric. Fixed in 7b2db0e: both wrappers flatten through to_prediction, trainset examples carry final_text, and the proposer strips old guards plus caps drafts at 4,000 chars. RED cover in tests/test_optimise_flatten.py (4 tests, 401 pass). Smoke test after the fix on 3 train stops: base 0.92, 0.40, 0.52 against variant 0.92, 0.92, 0.60. The gate discriminates. The full budget-10 rerun finished with 7 acceptances and a best valset 0.776 (above).
- Manual A/B, 27 October 2026: base program file against the same file with only the triage instruction swapped for GEPA's 7,688-character proposal, full 14-session train split, back to back. The control log holds 18 rows that mention 429; all 18 parsed valid and caused no abstains, and the variant arm had none. First pass: control 0.661, variant 0.638. Control rerun through the runner path: 0.646. Each arm run once except the control, run twice. The gap sits inside run-to-run noise, so this is a null result, not proof the proposal is worse. Session means moved on 13 of 14 sessions and raw triage replies differed on 37 of 67 stops, so the evaluation does see instruction changes.
## MIPROv2

- Not run. The project env has no optuna, and nothing was installed for this spike. The constructor also needs prompt and task models wired. The report records this instead of a score.
## Comparison bar (corrected)

- Judge the GEPA program on the 6-session holdout against the base program on the holdout, each run twice for the noise check. The 0.626 to 0.661 train band is fitted and does not count.
- The BootstrapFewShot program's 0.665 holdout number was measured correctly, but its demos were selected under the floored metric, so they are near-random. Recompile it on the fixed wrappers before comparing it with GEPA or calling either the compiled artifact.
- Holdout duel, 27 October 2026, 6 sessions and 30 stops, each arm run twice, zero 429s and at most 2 invalid rows per arm. Base 0.700 and 0.702. Unseeded GEPA best 0.713 and 0.685. Recompiled bootstrap 0.665 and 0.705. No arm resolves a difference: spreads run 0.028 to 0.040, and a true +0.03 would read the same. The unseeded best file is superseded (overwritten by the seeded run; build output is gitignored); its numbers stand in this report and the run logs.
- Seeded duel, 27 October 2026 (mechanical metric, superseded file): tuned-instructions-plus-demos program, then saved over by the judge-metric run. Numbers 0.713 and 0.676 against relaxed base 0.697 and 0.712 stand in the logs. The file now holds the judge-metric program under a new name.

## Limits

The held-out part is 30 stops. The train part is 67. A gain on 30 stops with two runs per arm is the decision bar, and no arm cleared it.

This report informs the first condition in `goal.json`: "the interpreter model returns valid, grounded output on too few real stops to build on, and the digest model cannot digest either". This report speaks only to the interpreter clause. Result: the base chain scores 0.700 and 0.702 on the held-out stops, and no tuned program is proven better at the duel's power. Whether the base is enough to build on is a judgement call for the engineer.
The artifact is the base chain. GEPA tuned instructions and bootstrap added demos; neither is proven better on held-out sessions at this power. MIPROv2 did not run.
- Quote relaxation, 27 October 2026: base chain rescored under the relaxed rule, holdout twice: 0.697 and 0.712 against strict 0.700 and 0.702. Paired session means show no systematic shift; the strict pair itself spreads wider than any strict-relaxed gap. The rule fired once in 60 strict stops, so there is almost nothing to relax on this split. Seeded GEPA (bootstrap program as student, per-predictor feedback) is running.

## gepa (budget 3, seed 7)

- settings: candidates: 3 (max_full_evals); reflection model: openai/mercury-3 (same as the interpreter); seed 7
- train sessions (7): 1b3b2a95-562c-43cd-af92-b711a4c45f38, 36752881-735f-42c3-9c8b-50aa4ea3d829, 438c1bee-bcc0-4c64-a53f-a5aa6323514f, 44a2c88e-baaf-4dac-85d2-1512f19a862d, 46ffdc01-3599-48af-99d5-56994fe1d1b6, 5d2114e3-e7c4-41bd-8ed3-46446c37711a, da522ac2-ef34-4915-be26-50aa7ecc3892
- held-out sessions (3): 173ae36f-0371-42ea-8519-ed26b52a5389, 7ba9f3e6-f833-4232-b414-400803a73115, e924e1e7-394f-4599-9a47-9360cc6b1f19
- held-out score before: n/a in this run (no holdout scoring without model calls)
- held-out score after: n/a in this run (score the saved program with `priority eval --split holdout --program probes/programs/gepa-budget3-seed7.json`)
- spread over repeats: read each gain against the slice 16 baseline spread (probes/eval-baseline.md); a gain smaller than that spread is not a result
- cost: optimiser budget 3; model-call count is not metered by this command
- program: probes/programs/gepa-budget3-seed7.json (load it with `priority eval --program`)

## gepa (budget 10, seed 7)

- settings: candidates: 10 (max_full_evals); reflection model: openai/mercury-3 (same as the interpreter); reflection minibatch size: 50; schema-guarded instruction proposer; format failures as feedback; seed 7
- train sessions (14): 1b3b2a95-562c-43cd-af92-b711a4c45f38, 36752881-735f-42c3-9c8b-50aa4ea3d829, 438c1bee-bcc0-4c64-a53f-a5aa6323514f, 44a2c88e-baaf-4dac-85d2-1512f19a862d, 46ffdc01-3599-48af-99d5-56994fe1d1b6, 4e30e1cc-f5f6-4077-8f6b-541e9939a532, 5d2114e3-e7c4-41bd-8ed3-46446c37711a, 73eb1c54-f241-4495-a7cc-bc35cf1e7c23, 7b7b1107-c6c2-4fc3-b665-0316f8c24d70, 7ba9f3e6-f833-4232-b414-400803a73115, 99a61cfd-ceb8-4fd9-bab2-d1b82b958f4c, a03fc399-8633-4967-bc20-cdfc5b73e466, b61517c7-cce8-44fd-a8f8-2c6c18152858, da522ac2-ef34-4915-be26-50aa7ecc3892
- held-out sessions (6): 173ae36f-0371-42ea-8519-ed26b52a5389, 71a58b52-8c51-44ba-9222-9f64360b8751, 7f26f5b0-d0c6-4a24-9f54-9e43e1f3fc90, 7f58085f-7121-4ec1-a263-ec8a6fe7c321, a2f34209-85df-49db-a40d-f015a3da5348, e924e1e7-394f-4599-9a47-9360cc6b1f19
- held-out score before: n/a in this run (no holdout scoring without model calls)
- held-out score after: n/a in this run (score the saved program with `priority eval --split holdout --program probes/programs/gepa-budget10-seed7.json`)
- spread over repeats: read each gain against the slice 16 baseline spread (probes/eval-baseline.md); a gain smaller than that spread is not a result
- cost: optimiser budget 10; model-call count is not metered by this command
- program: probes/programs/gepa-budget10-seed7.json (superseded twice over; the file now holds the seeded program below)

## gepa (budget 10, seed 7, unseeded, fixed wrappers)

- settings: candidates: 10 (max_full_evals); reflection model: openai/mercury-3 (same as the interpreter); reflection minibatch size: 14; threads (num_threads): 1; valset sessions: 3; schema-guarded instruction proposer; format failures as feedback; seed 7
- train sessions (14): 1b3b2a95-562c-43cd-af92-b711a4c45f38, 36752881-735f-42c3-9c8b-50aa4ea3d829, 438c1bee-bcc0-4c64-a53f-a5aa6323514f, 44a2c88e-baaf-4dac-85d2-1512f19a862d, 46ffdc01-3599-48af-99d5-56994fe1d1b6, 4e30e1cc-f5f6-4077-8f6b-541e9939a532, 5d2114e3-e7c4-41bd-8ed3-46446c37711a, 73eb1c54-f241-4495-a7cc-bc35cf1e7c23, 7b7b1107-c6c2-4fc3-b665-0316f8c24d70, 7ba9f3e6-f833-4232-b414-400803a73115, 99a61cfd-ceb8-4fd9-bab2-d1b82b958f4c, a03fc399-8633-4967-bc20-cdfc5b73e466, b61517c7-cce8-44fd-a8f8-2c6c18152858, da522ac2-ef34-4915-be26-50aa7ecc3892
- held-out sessions (6): 173ae36f-0371-42ea-8519-ed26b52a5389, 71a58b52-8c51-44ba-9222-9f64360b8751, 7f26f5b0-d0c6-4a24-9f54-9e43e1f3fc90, 7f58085f-7121-4ec1-a263-ec8a6fe7c321, a2f34209-85df-49db-a40d-f015a3da5348, e924e1e7-394f-4599-9a47-9360cc6b1f19
- held-out score after: 0.713 then 0.685 (30 stops each, holdout-twice duel; base 0.700 and 0.702; program file superseded by the seeded run, numbers stand)
- verdict: does not beat the base
- spread over repeats: read each gain against the slice 16 baseline spread (probes/eval-baseline.md); a gain smaller than that spread is not a result
- cost: optimiser budget 10; model-call count is not metered by this command
- program: probes/programs/gepa-budget10-seed7.json (superseded; load the seeded file below for the current best)

## bootstrap (budget 5, seed 7)

- settings: cheap baseline; bootstrapped demos: 4; seed 7
- train sessions (14): 1b3b2a95-562c-43cd-af92-b711a4c45f38, 36752881-735f-42c3-9c8b-50aa4ea3d829, 438c1bee-bcc0-4c64-a53f-a5aa6323514f, 44a2c88e-baaf-4dac-85d2-1512f19a862d, 46ffdc01-3599-48af-99d5-56994fe1d1b6, 4e30e1cc-f5f6-4077-8f6b-541e9939a532, 5d2114e3-e7c4-41bd-8ed3-46446c37711a, 73eb1c54-f241-4495-a7cc-bc35cf1e7c23, 7b7b1107-c6c2-4fc3-b665-0316f8c24d70, 7ba9f3e6-f833-4232-b414-400803a73115, 99a61cfd-ceb8-4fd9-bab2-d1b82b958f4c, a03fc399-8633-4967-bc20-cdfc5b73e466, b61517c7-cce8-44fd-a8f8-2c6c18152858, da522ac2-ef34-4915-be26-50aa7ecc3892
- held-out sessions (6): 173ae36f-0371-42ea-8519-ed26b52a5389, 71a58b52-8c51-44ba-9222-9f64360b8751, 7f26f5b0-d0c6-4a24-9f54-9e43e1f3fc90, 7f58085f-7121-4ec1-a263-ec8a6fe7c321, a2f34209-85df-49db-a40d-f015a3da5348, e924e1e7-394f-4599-9a47-9360cc6b1f19
- held-out score after: 0.665 then 0.705 (30 stops each, holdout-twice duel on the recompiled program; base 0.700 and 0.702)
- verdict: does not beat the base; the pre-fix single-run 0.665 gain is void
- spread over repeats: read each gain against the slice 16 baseline spread (probes/eval-baseline.md); a gain smaller than that spread is not a result
- cost: optimiser budget 5; model-call count is not metered by this command
- program: probes/programs/bootstrap-budget5-seed7.json (load it with `priority eval --program`)

## gepa seeded (budget 10, seed 7)

- settings: candidates: 10 (max_full_evals); seed program probes/programs/bootstrap-budget5-seed7.json; per-predictor feedback; reflection model: openai/mercury-3 (same as the interpreter); reflection minibatch size: 14; threads (num_threads): 1; valset sessions: 3; schema-guarded instruction proposer with guard dedupe and 4,000-char cap; seed 7; seed valset 0.735, best 0.848 (fill['pick_option'], iteration 5)
- train sessions (14): 1b3b2a95-562c-43cd-af92-b711a4c45f38, 36752881-735f-42c3-9c8b-50aa4ea3d829, 438c1bee-bcc0-4c64-a53f-a5aa6323514f, 44a2c88e-baaf-4dac-85d2-1512f19a862d, 46ffdc01-3599-48af-99d5-56994fe1d1b6, 4e30e1cc-f5f6-4077-8f6b-541e9939a532, 5d2114e3-e7c4-41bd-8ed3-46446c37711a, 73eb1c54-f241-4495-a7cc-bc35cf1e7c23, 7b7b1107-c6c2-4fc3-b665-0316f8c24d70, 7ba9f3e6-f833-4232-b414-400803a73115, 99a61cfd-ceb8-4fd9-bab2-d1b82b958f4c, a03fc399-8633-4967-bc20-cdfc5b73e466, b61517c7-cce8-44fd-a8f8-2c6c18152858, da522ac2-ef34-4915-be26-50aa7ecc3892
- held-out sessions (6): 173ae36f-0371-42ea-8519-ed26b52a5389, 71a58b52-8c51-44ba-9222-9f64360b8751, 7f26f5b0-d0c6-4a24-9f54-9e43e1f3fc90, 7f58085f-7121-4ec1-a263-ec8a6fe7c321, a2f34209-85df-49db-a40d-f015a3da5348, e924e1e7-394f-4599-9a47-9360cc6b1f19
- held-out score before: n/a in this run (no holdout scoring without model calls)
- held-out score after: 0.713 then 0.676 (30 stops each, paired against relaxed base 0.697 and 0.712)
- verdict: no resolved difference at this power; paired sessions show no systematic direction
- Transfer gap measured, 27 October 2026: seed program and winner rescored on all valset stops through the eval path, twice each. The runner re-splits a custom manifest, so the 10-stop runs missed 7ba9f3e6; rescored separately, seed 0.425 and 0.470, winner 0.520 and 0.525 on its 4 stops. Combined 14-stop means: seed 0.689 and 0.701, winner 0.719 and 0.753. The valset edge runs +0.018 to +0.05, smaller than GEPA's single-scored +0.11, and concentrated on the 4-stop hard session. The holdout duel cannot resolve a gain this size: its own spreads run 0.028 to 0.040, and a true +0.03 that transfers reads exactly like the observed 0.713 and 0.676 against 0.697 and 0.712. Undecided at this power, not disproven. Only a paired per-stop holdout comparison with more repeats would decide it. The 15th stop is ambiguous and unscored in all arms.
- Payload slice rule, decided 27 October 2026: multi-question schema. Decide holds questions, one Question per item, order free, at least one item and no empty default, since the current required question field rejects an empty decide. One ask_human step keeps all of a stop's questions. No step splitting. Readers of .question (card, to_prediction, tests) move to the list in the same slice.
- Payload slice models, 27 October 2026: every GEPA run so far reflected with openai/mercury-3, the same small model as the interpreter. The payload slice needs two separate choices written into its scope: a stronger reflection LM, and a judge model that is not the task model. Both need a metered cost per run before the slice starts, or the new flow inherits the weak-reflection limit unnoticed. Current per-run judge cost is unknown; enable usage tracking first.
- Judge-metric GEPA, 28 October 2026: seeded start, all stops through the judge, same budget and valset. Seed valset 0.367, best 0.600 on GEPA's single scoring. Eval-path rescore, twice per arm on all 14 scored stops: seed 0.657 and 0.707, winner 0.786 and 0.807. The winner's edge reproduces at +0.08 to +0.15, concentrated on the hard session (0.475 vs 0.675). Reproducible under the unvalidated judge only: the judge is the same Mercury model as the task, so self-preference is a live risk and GEPA may climb by writing what Mercury likes to read. The agreement bar has not run. A blind hand-grade of winner-vs-seed pairs must confirm the judge's direction before any duel result counts.
- Scope correction, 29 October 2026: since ef498bc the judge scores every stop against the facts and step-kind labels, and on 57 of 67 train stops that is the whole score. The judge-metric run therefore trained mostly against kind labels, which are not the target. Its +0.08 to +0.15 valset edge is mostly a facts-and-steps gain, not a payload gain. No further GEPA run on this metric until the judge scores payload against reference payloads.
- Second correction, 29 October 2026: `to_prediction` dropped the payloads, so in the eval-path rescore the judge never saw a predicted payload. On the 3 valset stops with a pilot reference, the stop fell back to the legacy facts-and-steps score. The eval-path figures (seed 0.657 and 0.707, winner 0.786 and 0.807) therefore measure facts and step kinds only. Slice 20 fixes the path.
- spread over repeats: read each gain against the slice 16 baseline spread (probes/eval-baseline.md); a gain smaller than that spread is not a result
- cost: optimiser budget 10; model-call count is not metered by this command
- program: probes/programs/gepa-seeded-budget10-seed7.json (load it with `priority eval --program`)

## gepa (budget 10, seed 7)

- settings: candidates: 10 (max_full_evals); reflection model: openai/mercury-3 (same as the interpreter); reflection minibatch size: 14; threads (num_threads): 1; valset sessions: 3; schema-guarded instruction proposer; format failures as feedback; seed 7
- train sessions (14): 1b3b2a95-562c-43cd-af92-b711a4c45f38, 36752881-735f-42c3-9c8b-50aa4ea3d829, 438c1bee-bcc0-4c64-a53f-a5aa6323514f, 44a2c88e-baaf-4dac-85d2-1512f19a862d, 46ffdc01-3599-48af-99d5-56994fe1d1b6, 4e30e1cc-f5f6-4077-8f6b-541e9939a532, 5d2114e3-e7c4-41bd-8ed3-46446c37711a, 73eb1c54-f241-4495-a7cc-bc35cf1e7c23, 7b7b1107-c6c2-4fc3-b665-0316f8c24d70, 7ba9f3e6-f833-4232-b414-400803a73115, 99a61cfd-ceb8-4fd9-bab2-d1b82b958f4c, a03fc399-8633-4967-bc20-cdfc5b73e466, b61517c7-cce8-44fd-a8f8-2c6c18152858, da522ac2-ef34-4915-be26-50aa7ecc3892
- held-out sessions (6): 173ae36f-0371-42ea-8519-ed26b52a5389, 71a58b52-8c51-44ba-9222-9f64360b8751, 7f26f5b0-d0c6-4a24-9f54-9e43e1f3fc90, 7f58085f-7121-4ec1-a263-ec8a6fe7c321, a2f34209-85df-49db-a40d-f015a3da5348, e924e1e7-394f-4599-9a47-9360cc6b1f19
- held-out score before: n/a in this run (no holdout scoring without model calls)
- held-out score after: n/a in this run (score the saved program with `priority eval --split holdout --program probes/programs/gepa-seeded-budget10-seed7.json`)
- spread over repeats: read each gain against the slice 16 baseline spread (probes/eval-baseline.md); a gain smaller than that spread is not a result
- cost: optimiser budget 10; model-call count is not metered by this command
- program: probes/programs/gepa-seeded-budget10-seed7.json (load it with `priority eval --program`)

## labeled (budget 5, seed 7)

- settings: labelled demos: up to 4 train stops picked by pick_demos, no model call; seed unused
- train sessions (14): 1b3b2a95-562c-43cd-af92-b711a4c45f38, 36752881-735f-42c3-9c8b-50aa4ea3d829, 438c1bee-bcc0-4c64-a53f-a5aa6323514f, 44a2c88e-baaf-4dac-85d2-1512f19a862d, 46ffdc01-3599-48af-99d5-56994fe1d1b6, 4e30e1cc-f5f6-4077-8f6b-541e9939a532, 5d2114e3-e7c4-41bd-8ed3-46446c37711a, 73eb1c54-f241-4495-a7cc-bc35cf1e7c23, 7b7b1107-c6c2-4fc3-b665-0316f8c24d70, 7ba9f3e6-f833-4232-b414-400803a73115, 99a61cfd-ceb8-4fd9-bab2-d1b82b958f4c, a03fc399-8633-4967-bc20-cdfc5b73e466, b61517c7-cce8-44fd-a8f8-2c6c18152858, da522ac2-ef34-4915-be26-50aa7ecc3892
- held-out sessions (6): 173ae36f-0371-42ea-8519-ed26b52a5389, 71a58b52-8c51-44ba-9222-9f64360b8751, 7f26f5b0-d0c6-4a24-9f54-9e43e1f3fc90, 7f58085f-7121-4ec1-a263-ec8a6fe7c321, a2f34209-85df-49db-a40d-f015a3da5348, e924e1e7-394f-4599-9a47-9360cc6b1f19
- held-out score before: n/a in this run (no holdout scoring without model calls)
- held-out score after: n/a in this run (score the saved program with `priority eval --split holdout --program probes/programs/labeled-armB-budget5-seed7.json`)
- spread over repeats: read each gain against the slice 16 baseline spread (probes/eval-baseline.md); a gain smaller than that spread is not a result
- cost: optimiser budget 5; model-call count is not metered by this command
- program: probes/programs/labeled-armB-budget5-seed7.json (load it with `priority eval --program`)

## gepa (budget 5, seed 7)

- settings: candidates: 5 (max_full_evals); reflection model: openai/mercury-3 (same as the interpreter); reflection minibatch size: 3; threads (num_threads): 2; valset sessions: 3; one component (propose), no component selector; schema-guarded instruction proposer; format failures as feedback; seed 7
- train sessions (14): 1b3b2a95-562c-43cd-af92-b711a4c45f38, 36752881-735f-42c3-9c8b-50aa4ea3d829, 438c1bee-bcc0-4c64-a53f-a5aa6323514f, 44a2c88e-baaf-4dac-85d2-1512f19a862d, 46ffdc01-3599-48af-99d5-56994fe1d1b6, 4e30e1cc-f5f6-4077-8f6b-541e9939a532, 5d2114e3-e7c4-41bd-8ed3-46446c37711a, 73eb1c54-f241-4495-a7cc-bc35cf1e7c23, 7b7b1107-c6c2-4fc3-b665-0316f8c24d70, 7ba9f3e6-f833-4232-b414-400803a73115, 99a61cfd-ceb8-4fd9-bab2-d1b82b958f4c, a03fc399-8633-4967-bc20-cdfc5b73e466, b61517c7-cce8-44fd-a8f8-2c6c18152858, da522ac2-ef34-4915-be26-50aa7ecc3892
- held-out sessions (6): 173ae36f-0371-42ea-8519-ed26b52a5389, 71a58b52-8c51-44ba-9222-9f64360b8751, 7f26f5b0-d0c6-4a24-9f54-9e43e1f3fc90, 7f58085f-7121-4ec1-a263-ec8a6fe7c321, a2f34209-85df-49db-a40d-f015a3da5348, e924e1e7-394f-4599-9a47-9360cc6b1f19
- held-out score before: n/a in this run (no holdout scoring without model calls)
- held-out score after: n/a in this run (score the saved program with `priority eval --split holdout --program probes/programs/gepa-armC-budget5-seed7.json`)
- spread over repeats: read each gain against the slice 16 baseline spread (probes/eval-baseline.md); a gain smaller than that spread is not a result
- cost: optimiser budget 5; model-call count is not metered by this command
- program: probes/programs/gepa-armC-budget5-seed7.json (load it with `priority eval --program`)

## Slice 20: payload judge, arms A, B and C, and the holdout (3 November 2026)

Rule: if the agreement bar of the judge fails, no arm result counts. The bar passed at the line, so the results below count with the caveats that follow.

### The judge

- Judge and GEPA reflection model: Mercury 3 (`inception`), reasoning effort `high`, token cap 16000, three repeats and the median score. The NVIDIA Mistral judge hung on single calls (a call waited 15 minutes), so it was dropped.
- The scores of the cases with no steps, and the cases with steps against an empty reference, go to the judge. Code pins only an abstain, at 0 (scoring version `unpinned-v1`).
- Bar run on the 8 graded pairs, probe on the 8 pair stops:

| Bar | Result | Required | Outcome |
|---|---|---|---|
| Agreement with the engineer | 6 of 8 (0.75); 5 of 7 without pair 4 | 0.75 or more | pass at the line |
| Closed-field probe | 28 of 28 | 0.90 or more | pass |
| Repeat flips | 0 of 8 (old rule: 2 of 8) | 0.10 or less | pass |

- Pair 4 matches by setup: its reference is now the step of the side that the engineer picked. Pair 2 is a near tie. Pairs 1 and 3 differ in every run.

### Train runs, 63 stops (14 sessions, the 4 demo stops left out), one run per arm

| Arm | Mean | `invalid_output` | Judge errors | Model errors | Judge calls | Prompt tokens | Completion tokens |
|---|---|---|---|---|---|---|---|
| A, base | 0.475 | 2 | 0 | 0 | 63 | 446,671 | 238,704 |
| B, base and 4 demos | 0.420 | 15 | 0 | 0 | 63 | 459,756 | 279,736 |
| C, GEPA from A | 0.563 (tuned on these stops, not evidence) | | | | 450 (all of GEPA) | 3,534,312 | 1,805,425 |

- B minus A, paired per stop: -0.055, 95% session-cluster CI -0.139 to +0.039 over 14 sessions. It includes 0.
- Arm B had 2 rate-limit retries that recovered.
- GEPA: budget 5, seed 7, 3 validation sessions, minibatch 3, 2 threads. The instruction that it wrote names option labels of one train stop and a CoBuilder paragraph that stops mid-sentence.

### Holdout, first run, 30 stops (6 sessions)

| | Arm A | Arm C | C minus A |
|---|---|---|---|
| Mean | 0.478 | 0.615 | +0.137 (95% CI +0.035 to +0.237) |
| `invalid_output` | 3 | 5 | |
| Judge calls, prompt and completion tokens | 30, 107,748 and 125,686 | 30, 109,687 and 123,311 | |

- C wins 19 stops, A wins 6, 5 are equal. 5 of 6 sessions favour C.
- Stops with a CoBuilder, `bundle.json` or plugin command mention (21): +0.157 (+0.028 to +0.245). Stops with no mention (9, 4 sessions): +0.091 (-0.192 to +0.321), not separable from 0.
- C scored higher on the holdout (0.615) than on its train stops (0.563). This argues against memorising. One run is noisy.

### Holdout 2, first run, 36 stops, 21 sessions, 3 repositories (unconfirmed drafts)

| Subset | Stops | Sessions | Arm A | Arm C | C minus A | 95% CI |
|---|---|---|---|---|---|---|
| All | 36 | 21 | 0.369 | 0.498 | +0.129 | +0.011 to +0.261 |
| agencheck | 16 | 16 | 0.415 | 0.549 | +0.135 | -0.059 to +0.352 |
| story-writer | 8 | 2 | 0.519 | 0.638 | +0.120 | too few sessions |
| PreEmployment PoC | 12 | 3 | 0.208 | 0.336 | +0.128 | 0.000 to +0.267 |

- Judge calls: 36 per arm. Arm A used 391,389 prompt and 62,936 completion tokens. Arm C used 389,435 and 75,485. No judge or model errors. 1 bad reply for each arm.
- The 36 references are drafts written from the stop briefs only. The engineer has not confirmed them.

### Holdout 2 on the confirmed references, 26 stops, 18 sessions (4 November 2026)

| Subset | Stops | Sessions | Arm A | Arm C | C minus A | 95% CI |
|---|---|---|---|---|---|---|
| All | 26 | 18 | 0.555 | 0.641 | +0.086 | -0.051 to +0.251 |
| agencheck | 13 | 13 | 0.489 | 0.558 | +0.069 | -0.136 to +0.259 |
| story-writer | 7 | 2 | 0.596 | 0.743 | +0.147 | too few sessions |
| PreEmployment PoC | 6 | 3 | 0.649 | 0.703 | +0.054 | -0.128 to +0.500 |

- This set keeps only chats between the agent and the engineer. It replaces the earlier 36-stop run, which held 13 stops that were not chats. The engineer confirmed all 26 references.
- Judge calls: 26 per arm. Arm A used 299,163 prompt and 65,905 completion tokens. Arm C used 304,240 and 84,387. No judge or model errors.
- Holdout 1 without its 10 non-chat stops: C minus A +0.138 (CI -0.037 to +0.261, 20 stops). Both holdouts together: +0.109 (CI +0.001 to +0.215, 24 sessions). The pooled check was chosen after the results.

### Caveats

- One holdout run per arm. A second run is planned. The holdout is not used for tuning.
- Earlier numbers are void: the first four runs of arm A and three of arm B scored 45 of 63 stops, joined the log rows to the wrong stops, and counted judge errors as zeros. Earlier eval-path numbers measured facts only. No number from them is used here.
- 7 holdout stops gave an empty or cut task reply at a token cap of 3000 (3 on arm A, 4 on arm C). A rerun at 6000 is a diagnosis only. If the cap costs score, it is raised for both arms and all 30 holdout stops run again.
- Four judge replies in the bar run and some in the holdout run hit the token cap. How those calls scored is not known. The 15 `invalid_output` replies of arm B and the 5 of arm C were not read.
- The reflection model of GEPA is the task model (Mercury 3).
- Four `notify` excerpts in the references are drafts: 36752881/053, 44a2c88e/008, 46ffdc01/001, 46ffdc01/009. The last one is a demo stop of arm B.
- Reference 44a2c88e/006 changed from `[]` to a `continue_until` step on 2 November 2026.
- 20 tests of the old probe fail and are not yet updated.

## gepa (budget 5, seed 7)

- settings: candidates: 5 (max_full_evals); reflection model: openai/mercury-3 (same as the interpreter); reflection minibatch size: 3; threads (num_threads): 2; valset sessions: 7; one component (propose), no component selector; schema-guarded instruction proposer; format failures as feedback; seed 7
- train sessions (51): 00e065ba-9f5c-4a0d-b5a2-04cb87d900e1, 0ca12882-d6bc-4816-a6d7-2574d2a1b6c4, 0e21f94b-fcfc-4746-ad41-20d2de4cfe68, 17483c68-3d3c-4cfa-8854-70d521ac4213, 1b3b2a95-562c-43cd-af92-b711a4c45f38, 36752881-735f-42c3-9c8b-50aa4ea3d829, 438c1bee-bcc0-4c64-a53f-a5aa6323514f, 44a2c88e-baaf-4dac-85d2-1512f19a862d, 46ffdc01-3599-48af-99d5-56994fe1d1b6, 4e30e1cc-f5f6-4077-8f6b-541e9939a532, 5198d89b-b3b5-4890-b89e-ad1543d17ed7, 58059c5f-e542-4164-b50b-6639cfcff32a, 5cf52b8a-ed49-45ad-a519-3b6057d1c009, 5d2114e3-e7c4-41bd-8ed3-46446c37711a, 613ec40f-de62-488d-8c86-f939d6ccaf2a, 63067e7d-9848-4a79-9037-52e5f9f3930d, 69818bba-99bf-451e-8120-885a0c938534, 6c66a8e6-8e3e-4e03-a6c7-9c57fe0923e6, 70fc6134-35d9-4337-b4dc-e76b39d674dc, 73eb1c54-f241-4495-a7cc-bc35cf1e7c23, 75d7b82a-78c6-47eb-8f92-e230c52b51ab, 78eac374-b5f9-48cd-9c46-5abf40c1ac0f, 7916b528-cfaf-4f83-84c8-8e14b79afad5, 798d1008-0601-4cc4-939c-03f0ffeb790f, 7b308720-41b6-4ca8-a15c-b616e419720f, 7b7b1107-c6c2-4fc3-b665-0316f8c24d70, 7ba9f3e6-f833-4232-b414-400803a73115, 8464e59c-6d5c-4bac-a711-28d235ac8f41, 88456929-4465-408d-a159-afdf0c8d590d, 8b2f6da9-f8ac-443c-88cc-362ef0ce10b8, 8e643bdc-e8bd-4d49-9242-247aad494ef7, 91127c77-4785-4521-a9f7-61a21450b0e1, 99a61cfd-ceb8-4fd9-bab2-d1b82b958f4c, 9d5153d0-05cb-4b7f-b4e5-fb87a7e3d57e, 9f6c9b66-b839-4cb2-898b-9746b739d1d8, a03fc399-8633-4967-bc20-cdfc5b73e466, a23e1ecf-6d39-450b-a39c-2992ddd3d634, a43b3250-f80e-4d0f-8866-caa871a66a8b, b0e09c76-e730-4b28-9a03-a73418722772, b61517c7-cce8-44fd-a8f8-2c6c18152858, c5793367-b9ae-44bc-8027-c90fdce12b6b, c689a302-0241-4ee9-9a03-a2e0c3400e67, cc53f817-070e-4d8e-93ca-21ca50b1c69a, d3d83e74-e10d-46b1-9908-8fbcadb79761, da522ac2-ef34-4915-be26-50aa7ecc3892, e43c8d0b-b829-4b7b-9a45-1384771d2ec7, e5b286a8-f722-4a2e-b54e-4dbb939580c0, e8686885-fbcd-441a-9ec3-69523d84cb25, f4ea2d44-dd0c-4874-8673-a91df23f5406, fe9bb39f-de7f-4cc7-b08c-5b9376faf8db, fece50d8-2a98-4245-b3bb-be7afb1834a6
- held-out sessions (24): 16505e93-2137-4fb6-9acb-f9a721e80e32, 173ae36f-0371-42ea-8519-ed26b52a5389, 391d47b9-cc4c-483b-ac93-2cd127922aa1, 396b87e9-546a-4964-931b-5b053aaa1cc3, 3b3d87e3-2b06-4972-a53b-f4a9d6ec2ceb, 40711e5b-aeb2-4e5b-a852-06fbe6f0efb5, 43e055c1-5644-45f6-91b0-dfbf747bdab0, 5597ca26-c2e1-4e74-8519-341323592b12, 63996751-1e17-41db-84c6-0cd161355cf6, 71a58b52-8c51-44ba-9222-9f64360b8751, 7438c281-93ba-40a6-bcb9-dbbf5e9e8dfb, 7ce2f07b-a4ea-4364-a7dd-de12b245c455, 7f26f5b0-d0c6-4a24-9f54-9e43e1f3fc90, 7f58085f-7121-4ec1-a263-ec8a6fe7c321, a2f34209-85df-49db-a40d-f015a3da5348, a41510dd-422c-4d90-9338-1d82c677e5f4, a6060e50-a23f-4486-a766-92e66a7bb2fb, af644c7f-7f0d-4c5d-b1c7-360d2952e266, b8272515-c796-4e58-9b38-29f396606603, e5d71545-0948-4ceb-86bc-f2eb8ac70d0c, e924e1e7-394f-4599-9a47-9360cc6b1f19, e9ebcd88-5fb1-49c0-a567-45ef7b7d1246, f33925f0-e981-4d65-b686-766dba0b76ef, f6cdd6bb-e585-460d-902a-1cfcc40ccce2
- held-out score before: n/a in this run (no holdout scoring without model calls)
- held-out score after: n/a in this run (score the saved program with `priority eval --split holdout --program probes/programs/gepa-armC2-seeded-budget5-seed7.json`)
- spread over repeats: read each gain against the slice 16 baseline spread (probes/eval-baseline.md); a gain smaller than that spread is not a result
- cost: optimiser budget 5; model-call count is not metered by this command
- program: probes/programs/gepa-armC2-seeded-budget5-seed7.json (load it with `priority eval --program`)

### Arm C2 on the holdout (2026-11-04)

C2 is the GEPA run above, seeded from arm C. Holdout, 56 stops from 24 sessions, one run per arm: A 0.488, C2 0.677,
C2 − A +0.189 (95% interval +0.094 to +0.285, bootstrap over sessions). Holdout 1 gives +0.249 and holdout 2 gives
+0.119 (interval −0.006 to +0.247). Every GEPA proposal body sits at the 4000-character cap of `gepa_proposer`.
See `docs/plans/priority-dev-spike/slice20-c2-holdout.md`.

## gepa (budget 3, seed 7)

- settings: candidates: 3 (max_full_evals); reflection model: openai/muse-wonder-1.0; reflection minibatch size: 3; threads (num_threads): 2; valset sessions: 1; one component (propose), no component selector; schema-guarded instruction proposer; format failures as feedback; seed 7
- train sessions (4): 0e21f94b-fcfc-4746-ad41-20d2de4cfe68, 1b3b2a95-562c-43cd-af92-b711a4c45f38, 44a2c88e-baaf-4dac-85d2-1512f19a862d, 99a61cfd-ceb8-4fd9-bab2-d1b82b958f4c
- held-out sessions (24): 16505e93-2137-4fb6-9acb-f9a721e80e32, 173ae36f-0371-42ea-8519-ed26b52a5389, 391d47b9-cc4c-483b-ac93-2cd127922aa1, 396b87e9-546a-4964-931b-5b053aaa1cc3, 3b3d87e3-2b06-4972-a53b-f4a9d6ec2ceb, 40711e5b-aeb2-4e5b-a852-06fbe6f0efb5, 43e055c1-5644-45f6-91b0-dfbf747bdab0, 5597ca26-c2e1-4e74-8519-341323592b12, 63996751-1e17-41db-84c6-0cd161355cf6, 71a58b52-8c51-44ba-9222-9f64360b8751, 7438c281-93ba-40a6-bcb9-dbbf5e9e8dfb, 7ce2f07b-a4ea-4364-a7dd-de12b245c455, 7f26f5b0-d0c6-4a24-9f54-9e43e1f3fc90, 7f58085f-7121-4ec1-a263-ec8a6fe7c321, a2f34209-85df-49db-a40d-f015a3da5348, a41510dd-422c-4d90-9338-1d82c677e5f4, a6060e50-a23f-4486-a766-92e66a7bb2fb, af644c7f-7f0d-4c5d-b1c7-360d2952e266, b8272515-c796-4e58-9b38-29f396606603, e5d71545-0948-4ceb-86bc-f2eb8ac70d0c, e924e1e7-394f-4599-9a47-9360cc6b1f19, e9ebcd88-5fb1-49c0-a567-45ef7b7d1246, f33925f0-e981-4d65-b686-766dba0b76ef, f6cdd6bb-e585-460d-902a-1cfcc40ccce2
- held-out score before: n/a in this run (no holdout scoring without model calls)
- held-out score after: n/a in this run (score the saved program with `priority eval --split holdout --program probes/programs/gepa-smoke26-seeded-budget3-seed7.json`)
- spread over repeats: read each gain against the slice 16 baseline spread (probes/eval-baseline.md); a gain smaller than that spread is not a result
- cost: optimiser budget 3; model-call count is not metered by this command
- program: probes/programs/gepa-smoke26-seeded-budget3-seed7.json (load it with `priority eval --program`)

## gepa (budget 3, seed 7)

- settings: candidates: 3 (max_full_evals); reflection model: openai/muse-wonder-1.0; reflection minibatch size: 3; threads (num_threads): 2; valset sessions: 1; one component (propose), no component selector; schema-guarded instruction proposer; format failures as feedback; seed 7
- train sessions (4): 0e21f94b-fcfc-4746-ad41-20d2de4cfe68, 1b3b2a95-562c-43cd-af92-b711a4c45f38, 44a2c88e-baaf-4dac-85d2-1512f19a862d, 99a61cfd-ceb8-4fd9-bab2-d1b82b958f4c
- held-out sessions (24): 16505e93-2137-4fb6-9acb-f9a721e80e32, 173ae36f-0371-42ea-8519-ed26b52a5389, 391d47b9-cc4c-483b-ac93-2cd127922aa1, 396b87e9-546a-4964-931b-5b053aaa1cc3, 3b3d87e3-2b06-4972-a53b-f4a9d6ec2ceb, 40711e5b-aeb2-4e5b-a852-06fbe6f0efb5, 43e055c1-5644-45f6-91b0-dfbf747bdab0, 5597ca26-c2e1-4e74-8519-341323592b12, 63996751-1e17-41db-84c6-0cd161355cf6, 71a58b52-8c51-44ba-9222-9f64360b8751, 7438c281-93ba-40a6-bcb9-dbbf5e9e8dfb, 7ce2f07b-a4ea-4364-a7dd-de12b245c455, 7f26f5b0-d0c6-4a24-9f54-9e43e1f3fc90, 7f58085f-7121-4ec1-a263-ec8a6fe7c321, a2f34209-85df-49db-a40d-f015a3da5348, a41510dd-422c-4d90-9338-1d82c677e5f4, a6060e50-a23f-4486-a766-92e66a7bb2fb, af644c7f-7f0d-4c5d-b1c7-360d2952e266, b8272515-c796-4e58-9b38-29f396606603, e5d71545-0948-4ceb-86bc-f2eb8ac70d0c, e924e1e7-394f-4599-9a47-9360cc6b1f19, e9ebcd88-5fb1-49c0-a567-45ef7b7d1246, f33925f0-e981-4d65-b686-766dba0b76ef, f6cdd6bb-e585-460d-902a-1cfcc40ccce2
- held-out score before: n/a in this run (no holdout scoring without model calls)
- held-out score after: n/a in this run (score the saved program with `priority eval --split holdout --program probes/programs/gepa-smoke26-seeded-budget3-seed7.json`)
- spread over repeats: read each gain against the slice 16 baseline spread (probes/eval-baseline.md); a gain smaller than that spread is not a result
- cost: optimiser budget 3; model-call count is not metered by this command
- program: probes/programs/gepa-smoke26-seeded-budget3-seed7.json (load it with `priority eval --program`)

## gepa (budget 3, seed 7)

- settings: candidates: 3 (max_full_evals); reflection model: openai/muse-wonder-1.0; reflection minibatch size: 3; threads (num_threads): 2; valset sessions: 1; one component (propose), no component selector; schema-guarded instruction proposer; format failures as feedback; seed 7
- train sessions (4): 0e21f94b-fcfc-4746-ad41-20d2de4cfe68, 1b3b2a95-562c-43cd-af92-b711a4c45f38, 44a2c88e-baaf-4dac-85d2-1512f19a862d, 99a61cfd-ceb8-4fd9-bab2-d1b82b958f4c
- held-out sessions (24): 16505e93-2137-4fb6-9acb-f9a721e80e32, 173ae36f-0371-42ea-8519-ed26b52a5389, 391d47b9-cc4c-483b-ac93-2cd127922aa1, 396b87e9-546a-4964-931b-5b053aaa1cc3, 3b3d87e3-2b06-4972-a53b-f4a9d6ec2ceb, 40711e5b-aeb2-4e5b-a852-06fbe6f0efb5, 43e055c1-5644-45f6-91b0-dfbf747bdab0, 5597ca26-c2e1-4e74-8519-341323592b12, 63996751-1e17-41db-84c6-0cd161355cf6, 71a58b52-8c51-44ba-9222-9f64360b8751, 7438c281-93ba-40a6-bcb9-dbbf5e9e8dfb, 7ce2f07b-a4ea-4364-a7dd-de12b245c455, 7f26f5b0-d0c6-4a24-9f54-9e43e1f3fc90, 7f58085f-7121-4ec1-a263-ec8a6fe7c321, a2f34209-85df-49db-a40d-f015a3da5348, a41510dd-422c-4d90-9338-1d82c677e5f4, a6060e50-a23f-4486-a766-92e66a7bb2fb, af644c7f-7f0d-4c5d-b1c7-360d2952e266, b8272515-c796-4e58-9b38-29f396606603, e5d71545-0948-4ceb-86bc-f2eb8ac70d0c, e924e1e7-394f-4599-9a47-9360cc6b1f19, e9ebcd88-5fb1-49c0-a567-45ef7b7d1246, f33925f0-e981-4d65-b686-766dba0b76ef, f6cdd6bb-e585-460d-902a-1cfcc40ccce2
- held-out score before: n/a in this run (no holdout scoring without model calls)
- held-out score after: n/a in this run (score the saved program with `priority eval --split holdout --program probes/programs/gepa-smoke26-seeded-budget3-seed7.json`)
- spread over repeats: read each gain against the slice 16 baseline spread (probes/eval-baseline.md); a gain smaller than that spread is not a result
- cost: optimiser budget 3; model-call count is not metered by this command
- program: probes/programs/gepa-smoke26-seeded-budget3-seed7.json (load it with `priority eval --program`)

## gepa (budget 5, seed 7)

- settings: candidates: 5 (max_full_evals); reflection model: openai/muse-wonder-1.0; reflection minibatch size: 6; threads (num_threads): 2; valset sessions: 12; one component (propose), no component selector; schema-guarded instruction proposer; format failures as feedback; seed 7
- train sessions (51): 00e065ba-9f5c-4a0d-b5a2-04cb87d900e1, 0ca12882-d6bc-4816-a6d7-2574d2a1b6c4, 0e21f94b-fcfc-4746-ad41-20d2de4cfe68, 17483c68-3d3c-4cfa-8854-70d521ac4213, 1b3b2a95-562c-43cd-af92-b711a4c45f38, 36752881-735f-42c3-9c8b-50aa4ea3d829, 438c1bee-bcc0-4c64-a53f-a5aa6323514f, 44a2c88e-baaf-4dac-85d2-1512f19a862d, 46ffdc01-3599-48af-99d5-56994fe1d1b6, 4e30e1cc-f5f6-4077-8f6b-541e9939a532, 5198d89b-b3b5-4890-b89e-ad1543d17ed7, 58059c5f-e542-4164-b50b-6639cfcff32a, 5cf52b8a-ed49-45ad-a519-3b6057d1c009, 5d2114e3-e7c4-41bd-8ed3-46446c37711a, 613ec40f-de62-488d-8c86-f939d6ccaf2a, 63067e7d-9848-4a79-9037-52e5f9f3930d, 69818bba-99bf-451e-8120-885a0c938534, 6c66a8e6-8e3e-4e03-a6c7-9c57fe0923e6, 70fc6134-35d9-4337-b4dc-e76b39d674dc, 73eb1c54-f241-4495-a7cc-bc35cf1e7c23, 75d7b82a-78c6-47eb-8f92-e230c52b51ab, 78eac374-b5f9-48cd-9c46-5abf40c1ac0f, 7916b528-cfaf-4f83-84c8-8e14b79afad5, 798d1008-0601-4cc4-939c-03f0ffeb790f, 7b308720-41b6-4ca8-a15c-b616e419720f, 7b7b1107-c6c2-4fc3-b665-0316f8c24d70, 7ba9f3e6-f833-4232-b414-400803a73115, 8464e59c-6d5c-4bac-a711-28d235ac8f41, 88456929-4465-408d-a159-afdf0c8d590d, 8b2f6da9-f8ac-443c-88cc-362ef0ce10b8, 8e643bdc-e8bd-4d49-9242-247aad494ef7, 91127c77-4785-4521-a9f7-61a21450b0e1, 99a61cfd-ceb8-4fd9-bab2-d1b82b958f4c, 9d5153d0-05cb-4b7f-b4e5-fb87a7e3d57e, 9f6c9b66-b839-4cb2-898b-9746b739d1d8, a03fc399-8633-4967-bc20-cdfc5b73e466, a23e1ecf-6d39-450b-a39c-2992ddd3d634, a43b3250-f80e-4d0f-8866-caa871a66a8b, b0e09c76-e730-4b28-9a03-a73418722772, b61517c7-cce8-44fd-a8f8-2c6c18152858, c5793367-b9ae-44bc-8027-c90fdce12b6b, c689a302-0241-4ee9-9a03-a2e0c3400e67, cc53f817-070e-4d8e-93ca-21ca50b1c69a, d3d83e74-e10d-46b1-9908-8fbcadb79761, da522ac2-ef34-4915-be26-50aa7ecc3892, e43c8d0b-b829-4b7b-9a45-1384771d2ec7, e5b286a8-f722-4a2e-b54e-4dbb939580c0, e8686885-fbcd-441a-9ec3-69523d84cb25, f4ea2d44-dd0c-4874-8673-a91df23f5406, fe9bb39f-de7f-4cc7-b08c-5b9376faf8db, fece50d8-2a98-4245-b3bb-be7afb1834a6
- held-out sessions (24): 16505e93-2137-4fb6-9acb-f9a721e80e32, 173ae36f-0371-42ea-8519-ed26b52a5389, 391d47b9-cc4c-483b-ac93-2cd127922aa1, 396b87e9-546a-4964-931b-5b053aaa1cc3, 3b3d87e3-2b06-4972-a53b-f4a9d6ec2ceb, 40711e5b-aeb2-4e5b-a852-06fbe6f0efb5, 43e055c1-5644-45f6-91b0-dfbf747bdab0, 5597ca26-c2e1-4e74-8519-341323592b12, 63996751-1e17-41db-84c6-0cd161355cf6, 71a58b52-8c51-44ba-9222-9f64360b8751, 7438c281-93ba-40a6-bcb9-dbbf5e9e8dfb, 7ce2f07b-a4ea-4364-a7dd-de12b245c455, 7f26f5b0-d0c6-4a24-9f54-9e43e1f3fc90, 7f58085f-7121-4ec1-a263-ec8a6fe7c321, a2f34209-85df-49db-a40d-f015a3da5348, a41510dd-422c-4d90-9338-1d82c677e5f4, a6060e50-a23f-4486-a766-92e66a7bb2fb, af644c7f-7f0d-4c5d-b1c7-360d2952e266, b8272515-c796-4e58-9b38-29f396606603, e5d71545-0948-4ceb-86bc-f2eb8ac70d0c, e924e1e7-394f-4599-9a47-9360cc6b1f19, e9ebcd88-5fb1-49c0-a567-45ef7b7d1246, f33925f0-e981-4d65-b686-766dba0b76ef, f6cdd6bb-e585-460d-902a-1cfcc40ccce2
- held-out score before: n/a in this run (no holdout scoring without model calls)
- held-out score after: n/a in this run (score the saved program with `priority eval --split holdout --program probes/programs/gepa-armC3-seeded-budget5-seed7.json`)
- spread over repeats: read each gain against the slice 16 baseline spread (probes/eval-baseline.md); a gain smaller than that spread is not a result
- cost: optimiser budget 5; model-call count is not metered by this command
- program: probes/programs/gepa-armC3-seeded-budget5-seed7.json (load it with `priority eval --program`)

## gepa (budget 5, seed 7)

- settings: candidates: 5 (max_full_evals); reflection model: openai/muse-wonder-1.0; reflection minibatch size: 6; threads (num_threads): 2; valset: stratified, sized by stops (target 40); one component (propose), no component selector; schema-guarded instruction proposer; format failures as feedback; seed 7
- train sessions (51): 00e065ba-9f5c-4a0d-b5a2-04cb87d900e1, 0ca12882-d6bc-4816-a6d7-2574d2a1b6c4, 0e21f94b-fcfc-4746-ad41-20d2de4cfe68, 17483c68-3d3c-4cfa-8854-70d521ac4213, 1b3b2a95-562c-43cd-af92-b711a4c45f38, 36752881-735f-42c3-9c8b-50aa4ea3d829, 438c1bee-bcc0-4c64-a53f-a5aa6323514f, 44a2c88e-baaf-4dac-85d2-1512f19a862d, 46ffdc01-3599-48af-99d5-56994fe1d1b6, 4e30e1cc-f5f6-4077-8f6b-541e9939a532, 5198d89b-b3b5-4890-b89e-ad1543d17ed7, 58059c5f-e542-4164-b50b-6639cfcff32a, 5cf52b8a-ed49-45ad-a519-3b6057d1c009, 5d2114e3-e7c4-41bd-8ed3-46446c37711a, 613ec40f-de62-488d-8c86-f939d6ccaf2a, 63067e7d-9848-4a79-9037-52e5f9f3930d, 69818bba-99bf-451e-8120-885a0c938534, 6c66a8e6-8e3e-4e03-a6c7-9c57fe0923e6, 70fc6134-35d9-4337-b4dc-e76b39d674dc, 73eb1c54-f241-4495-a7cc-bc35cf1e7c23, 75d7b82a-78c6-47eb-8f92-e230c52b51ab, 78eac374-b5f9-48cd-9c46-5abf40c1ac0f, 7916b528-cfaf-4f83-84c8-8e14b79afad5, 798d1008-0601-4cc4-939c-03f0ffeb790f, 7b308720-41b6-4ca8-a15c-b616e419720f, 7b7b1107-c6c2-4fc3-b665-0316f8c24d70, 7ba9f3e6-f833-4232-b414-400803a73115, 8464e59c-6d5c-4bac-a711-28d235ac8f41, 88456929-4465-408d-a159-afdf0c8d590d, 8b2f6da9-f8ac-443c-88cc-362ef0ce10b8, 8e643bdc-e8bd-4d49-9242-247aad494ef7, 91127c77-4785-4521-a9f7-61a21450b0e1, 99a61cfd-ceb8-4fd9-bab2-d1b82b958f4c, 9d5153d0-05cb-4b7f-b4e5-fb87a7e3d57e, 9f6c9b66-b839-4cb2-898b-9746b739d1d8, a03fc399-8633-4967-bc20-cdfc5b73e466, a23e1ecf-6d39-450b-a39c-2992ddd3d634, a43b3250-f80e-4d0f-8866-caa871a66a8b, b0e09c76-e730-4b28-9a03-a73418722772, b61517c7-cce8-44fd-a8f8-2c6c18152858, c5793367-b9ae-44bc-8027-c90fdce12b6b, c689a302-0241-4ee9-9a03-a2e0c3400e67, cc53f817-070e-4d8e-93ca-21ca50b1c69a, d3d83e74-e10d-46b1-9908-8fbcadb79761, da522ac2-ef34-4915-be26-50aa7ecc3892, e43c8d0b-b829-4b7b-9a45-1384771d2ec7, e5b286a8-f722-4a2e-b54e-4dbb939580c0, e8686885-fbcd-441a-9ec3-69523d84cb25, f4ea2d44-dd0c-4874-8673-a91df23f5406, fe9bb39f-de7f-4cc7-b08c-5b9376faf8db, fece50d8-2a98-4245-b3bb-be7afb1834a6
- held-out sessions (24): 16505e93-2137-4fb6-9acb-f9a721e80e32, 173ae36f-0371-42ea-8519-ed26b52a5389, 391d47b9-cc4c-483b-ac93-2cd127922aa1, 396b87e9-546a-4964-931b-5b053aaa1cc3, 3b3d87e3-2b06-4972-a53b-f4a9d6ec2ceb, 40711e5b-aeb2-4e5b-a852-06fbe6f0efb5, 43e055c1-5644-45f6-91b0-dfbf747bdab0, 5597ca26-c2e1-4e74-8519-341323592b12, 63996751-1e17-41db-84c6-0cd161355cf6, 71a58b52-8c51-44ba-9222-9f64360b8751, 7438c281-93ba-40a6-bcb9-dbbf5e9e8dfb, 7ce2f07b-a4ea-4364-a7dd-de12b245c455, 7f26f5b0-d0c6-4a24-9f54-9e43e1f3fc90, 7f58085f-7121-4ec1-a263-ec8a6fe7c321, a2f34209-85df-49db-a40d-f015a3da5348, a41510dd-422c-4d90-9338-1d82c677e5f4, a6060e50-a23f-4486-a766-92e66a7bb2fb, af644c7f-7f0d-4c5d-b1c7-360d2952e266, b8272515-c796-4e58-9b38-29f396606603, e5d71545-0948-4ceb-86bc-f2eb8ac70d0c, e924e1e7-394f-4599-9a47-9360cc6b1f19, e9ebcd88-5fb1-49c0-a567-45ef7b7d1246, f33925f0-e981-4d65-b686-766dba0b76ef, f6cdd6bb-e585-460d-902a-1cfcc40ccce2
- held-out score before: n/a in this run (no holdout scoring without model calls)
- held-out score after: n/a in this run (score the saved program with `priority eval --split holdout --program probes/programs/gepa-armC3s-seeded-budget5-seed7.json`)
- spread over repeats: read each gain against the slice 16 baseline spread (probes/eval-baseline.md); a gain smaller than that spread is not a result
- cost: optimiser budget 5; model-call count is not metered by this command
- program: probes/programs/gepa-armC3s-seeded-budget5-seed7.json (load it with `priority eval --program`)

## gepa (budget 3, seed 7)

- settings: candidates: 3 (max_full_evals); reflection model: openai/muse-wonder-1.0; reflection minibatch size: 3; threads (num_threads): 2; valset: stratified, sized by sessions (1); one component (propose), no component selector; schema-guarded instruction proposer; format failures as feedback; seed 7
- train sessions (4): 0e21f94b-fcfc-4746-ad41-20d2de4cfe68, 1b3b2a95-562c-43cd-af92-b711a4c45f38, 44a2c88e-baaf-4dac-85d2-1512f19a862d, 99a61cfd-ceb8-4fd9-bab2-d1b82b958f4c
- held-out sessions (24): 16505e93-2137-4fb6-9acb-f9a721e80e32, 173ae36f-0371-42ea-8519-ed26b52a5389, 391d47b9-cc4c-483b-ac93-2cd127922aa1, 396b87e9-546a-4964-931b-5b053aaa1cc3, 3b3d87e3-2b06-4972-a53b-f4a9d6ec2ceb, 40711e5b-aeb2-4e5b-a852-06fbe6f0efb5, 43e055c1-5644-45f6-91b0-dfbf747bdab0, 5597ca26-c2e1-4e74-8519-341323592b12, 63996751-1e17-41db-84c6-0cd161355cf6, 71a58b52-8c51-44ba-9222-9f64360b8751, 7438c281-93ba-40a6-bcb9-dbbf5e9e8dfb, 7ce2f07b-a4ea-4364-a7dd-de12b245c455, 7f26f5b0-d0c6-4a24-9f54-9e43e1f3fc90, 7f58085f-7121-4ec1-a263-ec8a6fe7c321, a2f34209-85df-49db-a40d-f015a3da5348, a41510dd-422c-4d90-9338-1d82c677e5f4, a6060e50-a23f-4486-a766-92e66a7bb2fb, af644c7f-7f0d-4c5d-b1c7-360d2952e266, b8272515-c796-4e58-9b38-29f396606603, e5d71545-0948-4ceb-86bc-f2eb8ac70d0c, e924e1e7-394f-4599-9a47-9360cc6b1f19, e9ebcd88-5fb1-49c0-a567-45ef7b7d1246, f33925f0-e981-4d65-b686-766dba0b76ef, f6cdd6bb-e585-460d-902a-1cfcc40ccce2
- held-out score before: n/a in this run (no holdout scoring without model calls)
- held-out score after: n/a in this run (score the saved program with `priority eval --split holdout --program probes/programs/gepa-smoke30-seeded-budget3-seed7.json`)
- spread over repeats: read each gain against the slice 16 baseline spread (probes/eval-baseline.md); a gain smaller than that spread is not a result
- cost: optimiser budget 3; model-call count is not metered by this command
- program: probes/programs/gepa-smoke30-seeded-budget3-seed7.json (load it with `priority eval --program`)

## gepa (budget 5, seed 7)

- settings: candidates: 5 (max_full_evals); reflection model: openai/muse-wonder-1.0; reflection minibatch size: 6; threads (num_threads): 2; valset: stratified, sized by stops (target 40); one component (propose), no component selector; schema-guarded instruction proposer; format failures as feedback; seed 7
- train sessions (51): 00e065ba-9f5c-4a0d-b5a2-04cb87d900e1, 0ca12882-d6bc-4816-a6d7-2574d2a1b6c4, 0e21f94b-fcfc-4746-ad41-20d2de4cfe68, 17483c68-3d3c-4cfa-8854-70d521ac4213, 1b3b2a95-562c-43cd-af92-b711a4c45f38, 36752881-735f-42c3-9c8b-50aa4ea3d829, 438c1bee-bcc0-4c64-a53f-a5aa6323514f, 44a2c88e-baaf-4dac-85d2-1512f19a862d, 46ffdc01-3599-48af-99d5-56994fe1d1b6, 4e30e1cc-f5f6-4077-8f6b-541e9939a532, 5198d89b-b3b5-4890-b89e-ad1543d17ed7, 58059c5f-e542-4164-b50b-6639cfcff32a, 5cf52b8a-ed49-45ad-a519-3b6057d1c009, 5d2114e3-e7c4-41bd-8ed3-46446c37711a, 613ec40f-de62-488d-8c86-f939d6ccaf2a, 63067e7d-9848-4a79-9037-52e5f9f3930d, 69818bba-99bf-451e-8120-885a0c938534, 6c66a8e6-8e3e-4e03-a6c7-9c57fe0923e6, 70fc6134-35d9-4337-b4dc-e76b39d674dc, 73eb1c54-f241-4495-a7cc-bc35cf1e7c23, 75d7b82a-78c6-47eb-8f92-e230c52b51ab, 78eac374-b5f9-48cd-9c46-5abf40c1ac0f, 7916b528-cfaf-4f83-84c8-8e14b79afad5, 798d1008-0601-4cc4-939c-03f0ffeb790f, 7b308720-41b6-4ca8-a15c-b616e419720f, 7b7b1107-c6c2-4fc3-b665-0316f8c24d70, 7ba9f3e6-f833-4232-b414-400803a73115, 8464e59c-6d5c-4bac-a711-28d235ac8f41, 88456929-4465-408d-a159-afdf0c8d590d, 8b2f6da9-f8ac-443c-88cc-362ef0ce10b8, 8e643bdc-e8bd-4d49-9242-247aad494ef7, 91127c77-4785-4521-a9f7-61a21450b0e1, 99a61cfd-ceb8-4fd9-bab2-d1b82b958f4c, 9d5153d0-05cb-4b7f-b4e5-fb87a7e3d57e, 9f6c9b66-b839-4cb2-898b-9746b739d1d8, a03fc399-8633-4967-bc20-cdfc5b73e466, a23e1ecf-6d39-450b-a39c-2992ddd3d634, a43b3250-f80e-4d0f-8866-caa871a66a8b, b0e09c76-e730-4b28-9a03-a73418722772, b61517c7-cce8-44fd-a8f8-2c6c18152858, c5793367-b9ae-44bc-8027-c90fdce12b6b, c689a302-0241-4ee9-9a03-a2e0c3400e67, cc53f817-070e-4d8e-93ca-21ca50b1c69a, d3d83e74-e10d-46b1-9908-8fbcadb79761, da522ac2-ef34-4915-be26-50aa7ecc3892, e43c8d0b-b829-4b7b-9a45-1384771d2ec7, e5b286a8-f722-4a2e-b54e-4dbb939580c0, e8686885-fbcd-441a-9ec3-69523d84cb25, f4ea2d44-dd0c-4874-8673-a91df23f5406, fe9bb39f-de7f-4cc7-b08c-5b9376faf8db, fece50d8-2a98-4245-b3bb-be7afb1834a6
- held-out sessions (24): 16505e93-2137-4fb6-9acb-f9a721e80e32, 173ae36f-0371-42ea-8519-ed26b52a5389, 391d47b9-cc4c-483b-ac93-2cd127922aa1, 396b87e9-546a-4964-931b-5b053aaa1cc3, 3b3d87e3-2b06-4972-a53b-f4a9d6ec2ceb, 40711e5b-aeb2-4e5b-a852-06fbe6f0efb5, 43e055c1-5644-45f6-91b0-dfbf747bdab0, 5597ca26-c2e1-4e74-8519-341323592b12, 63996751-1e17-41db-84c6-0cd161355cf6, 71a58b52-8c51-44ba-9222-9f64360b8751, 7438c281-93ba-40a6-bcb9-dbbf5e9e8dfb, 7ce2f07b-a4ea-4364-a7dd-de12b245c455, 7f26f5b0-d0c6-4a24-9f54-9e43e1f3fc90, 7f58085f-7121-4ec1-a263-ec8a6fe7c321, a2f34209-85df-49db-a40d-f015a3da5348, a41510dd-422c-4d90-9338-1d82c677e5f4, a6060e50-a23f-4486-a766-92e66a7bb2fb, af644c7f-7f0d-4c5d-b1c7-360d2952e266, b8272515-c796-4e58-9b38-29f396606603, e5d71545-0948-4ceb-86bc-f2eb8ac70d0c, e924e1e7-394f-4599-9a47-9360cc6b1f19, e9ebcd88-5fb1-49c0-a567-45ef7b7d1246, f33925f0-e981-4d65-b686-766dba0b76ef, f6cdd6bb-e585-460d-902a-1cfcc40ccce2
- held-out score before: n/a in this run (no holdout scoring without model calls)
- held-out score after: n/a in this run (score the saved program with `priority eval --split holdout --program probes/programs/gepa-armD2-seeded-budget5-seed7.json`)
- spread over repeats: read each gain against the slice 16 baseline spread (probes/eval-baseline.md); a gain smaller than that spread is not a result
- cost: optimiser budget 5; model-call count is not metered by this command
- program: probes/programs/gepa-armD2-seeded-budget5-seed7.json (load it with `priority eval --program`)

## gepa (budget 5, seed 7)

- settings: candidates: 5 (max_full_evals); reflection model: openrouter/openai/gpt-6.1-terra; reflection minibatch size: 6; threads (num_threads): 2; valset: stratified, sized by stops (target 40); one component (propose), no component selector; schema-guarded instruction proposer; format failures as feedback; seed 7
- train sessions (51): 00e065ba-9f5c-4a0d-b5a2-04cb87d900e1, 0ca12882-d6bc-4816-a6d7-2574d2a1b6c4, 0e21f94b-fcfc-4746-ad41-20d2de4cfe68, 17483c68-3d3c-4cfa-8854-70d521ac4213, 1b3b2a95-562c-43cd-af92-b711a4c45f38, 36752881-735f-42c3-9c8b-50aa4ea3d829, 438c1bee-bcc0-4c64-a53f-a5aa6323514f, 44a2c88e-baaf-4dac-85d2-1512f19a862d, 46ffdc01-3599-48af-99d5-56994fe1d1b6, 4e30e1cc-f5f6-4077-8f6b-541e9939a532, 5198d89b-b3b5-4890-b89e-ad1543d17ed7, 58059c5f-e542-4164-b50b-6639cfcff32a, 5cf52b8a-ed49-45ad-a519-3b6057d1c009, 5d2114e3-e7c4-41bd-8ed3-46446c37711a, 613ec40f-de62-488d-8c86-f939d6ccaf2a, 63067e7d-9848-4a79-9037-52e5f9f3930d, 69818bba-99bf-451e-8120-885a0c938534, 6c66a8e6-8e3e-4e03-a6c7-9c57fe0923e6, 70fc6134-35d9-4337-b4dc-e76b39d674dc, 73eb1c54-f241-4495-a7cc-bc35cf1e7c23, 75d7b82a-78c6-47eb-8f92-e230c52b51ab, 78eac374-b5f9-48cd-9c46-5abf40c1ac0f, 7916b528-cfaf-4f83-84c8-8e14b79afad5, 798d1008-0601-4cc4-939c-03f0ffeb790f, 7b308720-41b6-4ca8-a15c-b616e419720f, 7b7b1107-c6c2-4fc3-b665-0316f8c24d70, 7ba9f3e6-f833-4232-b414-400803a73115, 8464e59c-6d5c-4bac-a711-28d235ac8f41, 88456929-4465-408d-a159-afdf0c8d590d, 8b2f6da9-f8ac-443c-88cc-362ef0ce10b8, 8e643bdc-e8bd-4d49-9242-247aad494ef7, 91127c77-4785-4521-a9f7-61a21450b0e1, 99a61cfd-ceb8-4fd9-bab2-d1b82b958f4c, 9d5153d0-05cb-4b7f-b4e5-fb87a7e3d57e, 9f6c9b66-b839-4cb2-898b-9746b739d1d8, a03fc399-8633-4967-bc20-cdfc5b73e466, a23e1ecf-6d39-450b-a39c-2992ddd3d634, a43b3250-f80e-4d0f-8866-caa871a66a8b, b0e09c76-e730-4b28-9a03-a73418722772, b61517c7-cce8-44fd-a8f8-2c6c18152858, c5793367-b9ae-44bc-8027-c90fdce12b6b, c689a302-0241-4ee9-9a03-a2e0c3400e67, cc53f817-070e-4d8e-93ca-21ca50b1c69a, d3d83e74-e10d-46b1-9908-8fbcadb79761, da522ac2-ef34-4915-be26-50aa7ecc3892, e43c8d0b-b829-4b7b-9a45-1384771d2ec7, e5b286a8-f722-4a2e-b54e-4dbb939580c0, e8686885-fbcd-441a-9ec3-69523d84cb25, f4ea2d44-dd0c-4874-8673-a91df23f5406, fe9bb39f-de7f-4cc7-b08c-5b9376faf8db, fece50d8-2a98-4245-b3bb-be7afb1834a6
- held-out sessions (24): 16505e93-2137-4fb6-9acb-f9a721e80e32, 173ae36f-0371-42ea-8519-ed26b52a5389, 391d47b9-cc4c-483b-ac93-2cd127922aa1, 396b87e9-546a-4964-931b-5b053aaa1cc3, 3b3d87e3-2b06-4972-a53b-f4a9d6ec2ceb, 40711e5b-aeb2-4e5b-a852-06fbe6f0efb5, 43e055c1-5644-45f6-91b0-dfbf747bdab0, 5597ca26-c2e1-4e74-8519-341323592b12, 63996751-1e17-41db-84c6-0cd161355cf6, 71a58b52-8c51-44ba-9222-9f64360b8751, 7438c281-93ba-40a6-bcb9-dbbf5e9e8dfb, 7ce2f07b-a4ea-4364-a7dd-de12b245c455, 7f26f5b0-d0c6-4a24-9f54-9e43e1f3fc90, 7f58085f-7121-4ec1-a263-ec8a6fe7c321, a2f34209-85df-49db-a40d-f015a3da5348, a41510dd-422c-4d90-9338-1d82c677e5f4, a6060e50-a23f-4486-a766-92e66a7bb2fb, af644c7f-7f0d-4c5d-b1c7-360d2952e266, b8272515-c796-4e58-9b38-29f396606603, e5d71545-0948-4ceb-86bc-f2eb8ac70d0c, e924e1e7-394f-4599-9a47-9360cc6b1f19, e9ebcd88-5fb1-49c0-a567-45ef7b7d1246, f33925f0-e981-4d65-b686-766dba0b76ef, f6cdd6bb-e585-460d-902a-1cfcc40ccce2
- held-out score before: n/a in this run (no holdout scoring without model calls)
- held-out score after: n/a in this run (score the saved program with `priority eval --split holdout --program probes/programs/gepa-armD2terra-seeded-budget5-seed7.json`)
- spread over repeats: read each gain against the slice 16 baseline spread (probes/eval-baseline.md); a gain smaller than that spread is not a result
- cost: optimiser budget 5; model-call count is not metered by this command
- program: probes/programs/gepa-armD2terra-seeded-budget5-seed7.json (load it with `priority eval --program`)
