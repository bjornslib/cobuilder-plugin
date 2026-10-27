# Optimiser report (slice 18)

Date: 26 October 2026. All optimisers train on the 33 train stops only.
The held-out part is 15 stops in 3 sessions. Baseline means from slice
16: holdout 0.609 including ambiguous and 0.603 excluding, with spreads
of 0.044 and 0.028 over three repeats. A gain counts only past those
spreads. One scoring run per program: no spread is measured for the
compiled programs, so a small gain is weak evidence.

## BootstrapFewShot (cheap baseline)

- Budget 5, seed 7. The saved program holds 16 demos per predictor.
- Held-out score after: 0.665 including, 0.661 excluding (15 and 14 stops).
- Gain over baseline: +0.056 including, +0.058 excluding. Both clear the spreads.
- Cost: the holdout scoring run made 44 calls and sent 692,761 characters (about USD 0.03). The compile itself ran 4 traces; its calls are not metered.
- Verdict: a real gain on one run, but one run only. It needs repeats before it counts as a result.

## GEPA

- Budget 10, seed 7, minibatch 14, one thread, valset of 3 sessions (15 stops), fixed wrappers. Ran 22 iterations to completion. Seven acceptances: pick (2), fill['reply'] (3), fill['continue'] (6), fill['snooze'] (10), card (13), plus two late Pareto additions (20, 22). Base valset 0.676, best program 0.776 from iteration 2, unmoved after. Saved as probes/programs/gepa-budget10-seed7.json: new pick instruction, no demos. Holdout-twice duel against base and a recompiled bootstrap is running.
- Before the wrapper fix, every proposed instruction tied the base at the exact same float and was skipped. That was the floored metric, not the gate: different wordings produced identical measured totals because every score was the 0.2 constant.
- Rate limits returned despite serial execution: the evaluator still bursts its rollouts, and poisoned rollouts starved one round of reflective traces.
- The broken-wrapper programs hold no demos and unchanged instructions. The fixed run's best program is above.
- Root cause of the valley, 27 October 2026: the runner flattens each Interpretation through to_prediction before score(), but gepa_feedback and plain_score passed the raw Interpretation. The metric reads top-level status, steps, quotes, and abstain, which a raw Interpretation does not hold, so every GEPA-path score floored at grounding 0.1 plus validity 0.1: a constant 0.2 whatever the instruction says. That is the exact-tie mechanism, and it also nulled BootstrapFewShot's metric. Fixed in 7b2db0e: both wrappers flatten through to_prediction, trainset examples carry final_text, and the proposer strips old guards plus caps drafts at 4,000 chars. RED cover in tests/test_optimise_flatten.py (4 tests, 401 pass). Smoke test after the fix on 3 train stops: base 0.92, 0.40, 0.52 against variant 0.92, 0.92, 0.60. The gate discriminates. Full budget-10 rerun going from the working gate.
- Manual A/B, 27 October 2026: base program file against the same file with only the triage instruction swapped for GEPA's 7,688-character proposal, full 14-session train split, back to back. The control log holds 18 rows that mention 429; all 18 parsed valid and caused no abstains, and the variant arm had none. First pass: control 0.661, variant 0.638. Control rerun through the runner path: 0.646. Each arm run once except the control, run twice. The gap sits inside run-to-run noise, so this is a null result, not proof the proposal is worse. Session means moved on 13 of 14 sessions and raw triage replies differed on 37 of 67 stops, so the evaluation does see instruction changes.
## MIPROv2

- Not run. The project env has no optuna, and nothing was installed for this spike. The constructor also needs prompt and task models wired. The report records this instead of a score.
## Comparison bar (corrected)

- Judge the GEPA program on the 6-session holdout against the base program on the holdout, each run twice for the noise check. The 0.626 to 0.661 train band is fitted and does not count.
- The BootstrapFewShot program's 0.665 holdout number was measured correctly, but its demos were selected under the floored metric, so they are near-random. Recompile it on the fixed wrappers before comparing it with GEPA or calling either the compiled artifact.

## Limits

The held-out part is 15 stops. The train part is 33. A gain on 15 stops is suggestive, not solid. The bootstrap gain rests on one scoring run with no spread of its own.

This report informs the first condition in `goal.json`: "the interpreter model returns valid, grounded output on too few real stops to build on, and the digest model cannot digest either". This report speaks only to the interpreter clause. Result: **not measured**. No threshold defines too few. The bootstrap program scores 0.665 including and 0.661 excluding on the held-out stops, against a baseline mean of 0.609 and 0.603. Whether that is enough to build on is a judgement call for the engineer.
The chain stays, compiled with BootstrapFewShot demos. GEPA proposed no change on NVIDIA, and MIPROv2 did not run. The bootstrap program is the first compiled interpreter, pending repeats of its holdout score.

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
- program: probes/programs/gepa-budget10-seed7.json (load it with `priority eval --program`)

## gepa (budget 10, seed 7)

- settings: candidates: 10 (max_full_evals); reflection model: openai/mercury-3 (same as the interpreter); reflection minibatch size: 14; threads (num_threads): 1; valset sessions: 3; schema-guarded instruction proposer; format failures as feedback; seed 7
- train sessions (14): 1b3b2a95-562c-43cd-af92-b711a4c45f38, 36752881-735f-42c3-9c8b-50aa4ea3d829, 438c1bee-bcc0-4c64-a53f-a5aa6323514f, 44a2c88e-baaf-4dac-85d2-1512f19a862d, 46ffdc01-3599-48af-99d5-56994fe1d1b6, 4e30e1cc-f5f6-4077-8f6b-541e9939a532, 5d2114e3-e7c4-41bd-8ed3-46446c37711a, 73eb1c54-f241-4495-a7cc-bc35cf1e7c23, 7b7b1107-c6c2-4fc3-b665-0316f8c24d70, 7ba9f3e6-f833-4232-b414-400803a73115, 99a61cfd-ceb8-4fd9-bab2-d1b82b958f4c, a03fc399-8633-4967-bc20-cdfc5b73e466, b61517c7-cce8-44fd-a8f8-2c6c18152858, da522ac2-ef34-4915-be26-50aa7ecc3892
- held-out sessions (6): 173ae36f-0371-42ea-8519-ed26b52a5389, 71a58b52-8c51-44ba-9222-9f64360b8751, 7f26f5b0-d0c6-4a24-9f54-9e43e1f3fc90, 7f58085f-7121-4ec1-a263-ec8a6fe7c321, a2f34209-85df-49db-a40d-f015a3da5348, e924e1e7-394f-4599-9a47-9360cc6b1f19
- held-out score before: n/a in this run (no holdout scoring without model calls)
- held-out score after: n/a in this run (score the saved program with `priority eval --split holdout --program probes/programs/gepa-budget10-seed7.json`)
- spread over repeats: read each gain against the slice 16 baseline spread (probes/eval-baseline.md); a gain smaller than that spread is not a result
- cost: optimiser budget 10; model-call count is not metered by this command
- program: probes/programs/gepa-budget10-seed7.json (load it with `priority eval --program`)

## bootstrap (budget 5, seed 7)

- settings: cheap baseline; bootstrapped demos: 4; seed 7
- train sessions (14): 1b3b2a95-562c-43cd-af92-b711a4c45f38, 36752881-735f-42c3-9c8b-50aa4ea3d829, 438c1bee-bcc0-4c64-a53f-a5aa6323514f, 44a2c88e-baaf-4dac-85d2-1512f19a862d, 46ffdc01-3599-48af-99d5-56994fe1d1b6, 4e30e1cc-f5f6-4077-8f6b-541e9939a532, 5d2114e3-e7c4-41bd-8ed3-46446c37711a, 73eb1c54-f241-4495-a7cc-bc35cf1e7c23, 7b7b1107-c6c2-4fc3-b665-0316f8c24d70, 7ba9f3e6-f833-4232-b414-400803a73115, 99a61cfd-ceb8-4fd9-bab2-d1b82b958f4c, a03fc399-8633-4967-bc20-cdfc5b73e466, b61517c7-cce8-44fd-a8f8-2c6c18152858, da522ac2-ef34-4915-be26-50aa7ecc3892
- held-out sessions (6): 173ae36f-0371-42ea-8519-ed26b52a5389, 71a58b52-8c51-44ba-9222-9f64360b8751, 7f26f5b0-d0c6-4a24-9f54-9e43e1f3fc90, 7f58085f-7121-4ec1-a263-ec8a6fe7c321, a2f34209-85df-49db-a40d-f015a3da5348, e924e1e7-394f-4599-9a47-9360cc6b1f19
- held-out score before: n/a in this run (no holdout scoring without model calls)
- held-out score after: n/a in this run (score the saved program with `priority eval --split holdout --program probes/programs/bootstrap-budget5-seed7.json`)
- spread over repeats: read each gain against the slice 16 baseline spread (probes/eval-baseline.md); a gain smaller than that spread is not a result
- cost: optimiser budget 5; model-call count is not metered by this command
- program: probes/programs/bootstrap-budget5-seed7.json (load it with `priority eval --program`)
