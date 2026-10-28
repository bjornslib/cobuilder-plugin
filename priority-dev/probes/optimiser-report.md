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
- Seeded duel, 27 October 2026: tuned-instructions-plus-demos program (probes/programs/gepa-seeded-budget10-seed7.json) against the relaxed base, holdout twice, zero 429s, 1 and 4 invalid rows. Seeded 0.713 and 0.676, base 0.697 and 0.712. Paired sessions show no systematic direction. Unresolved at this power, same as above. The artifact stays the base chain because nothing is proven better, not because improvement is disproven. Rescored offline under the no-grounding weights (facts x 1.25): base 0.663 and 0.677, seeded 0.677 and 0.640. Same shape, still undecided.

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
- Judge-metric GEPA, 28 October 2026: seeded start, all stops through the judge, same budget and valset. Seed valset 0.367, best 0.600, nine acceptances across triage, pick, fill continue/reply/pick_option, and ask_human. Lower absolute scale than the mechanical runs: the judge grades harder. Saved as probes/programs/gepa-seeded-budget10-seed7.json under the seeded tag. Holdout duel waits on confirmed holdout payload labels.
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
