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

- Budget 5, seed 7 (the flag reaches the teleprompter since the seed fix; the earlier DeepSeek run used seed 0). Reflection model: the interpreter model. Ran on NVIDIA.
- GEPA warned that no valset was provided, so it used the trainset as its valset. A rerun should split a valset off the train sessions.
- Iterations 1 to 3 each proposed a new instruction text (triage, pick, one fill). Each scored 0.6000 on the subsample, exactly tied with the old text, and GEPA keeps a proposal only when it scores strictly higher. All three were skipped.
- Iterations 4 and 5 failed to build a reflective dataset ("no valid predictions found") and proposed nothing. The run ended with executor shutdown errors after the program saved; those errors are cleanup noise, not a failed compile.
- The saved program `probes/programs/gepa-budget5-seed7.json` holds no demos and the base instructions. GEPA found no improvement. Scoring it would only rescore the baseline, so no holdout scoring run was spent on it.
- Cost: not metered. About 109 minutes of model calls.
- Verdict: no change proposed. This is a measured zero, not a missing result. The next step is a rerun with a separate valset, or accepting the bootstrap program.
## MIPROv2

- Not run. The project env has no optuna, and nothing was installed for this spike. The constructor also needs prompt and task models wired. The report records this instead of a score.
## Limits

The held-out part is 15 stops. The train part is 33. A gain on 15 stops is suggestive, not solid. The bootstrap gain rests on one scoring run with no spread of its own.

This report informs the first condition in `goal.json`: "the interpreter model returns valid, grounded output on too few real stops to build on, and the digest model cannot digest either". This report speaks only to the interpreter clause. Result: **not measured**. No threshold defines too few. The bootstrap program scores 0.665 including and 0.661 excluding on the held-out stops, against a baseline mean of 0.609 and 0.603. Whether that is enough to build on is a judgement call for the engineer.
The chain stays, compiled with BootstrapFewShot demos. GEPA proposed no change on NVIDIA, and MIPROv2 did not run. The bootstrap program is the first compiled interpreter, pending repeats of its holdout score.
