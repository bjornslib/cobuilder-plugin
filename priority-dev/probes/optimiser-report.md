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

- Budget 5, seed 7 requested. The run used GEPA's default seed 0: the flag never reached the teleprompter. Fixed after the run, so a rerun would use seed 7. Reflection model: the interpreter model.
- The run completed 42 iterations and 162 rollouts and saved `probes/programs/gepa-budget5-seed0.json` (named seed7 at first, renamed after the seed fix).
- Held-out score after: not measured. Scoring the saved program failed on all 15 stops with OpenRouter 402: the account has insufficient credits. The failure is in billing, not in the program.
- Cost: the 162 rollouts are not metered. This was the most expensive run of the three by far.
- Verdict: compiled but unscored. Score it after a top-up with `priority eval --split holdout --program probes/programs/gepa-budget5-seed0.json`.
## MIPROv2

- Not run. The project env has no optuna, and nothing was installed for this spike. The constructor also needs prompt and task models wired. The report records this instead of a score.
## Limits

The held-out part is 15 stops. The train part is 33. A gain on 15 stops is suggestive, not solid. The bootstrap gain rests on one scoring run with no spread of its own.

This report informs the first condition in `goal.json`: "the interpreter model returns valid, grounded output on too few real stops to build on, and the digest model cannot digest either". This report speaks only to the interpreter clause. Result: **not measured**. No threshold defines too few. The bootstrap program scores 0.665 including and 0.661 excluding on the held-out stops, against a baseline mean of 0.609 and 0.603. Whether that is enough to build on is a judgement call for the engineer.
The chain stays, compiled with BootstrapFewShot demos, until GEPA is scored. If the GEPA holdout score beats 0.661 excluding ambiguous by more than the spread, GEPA replaces the baseline. If not, the bootstrap program is the first compiled interpreter, pending repeats.
