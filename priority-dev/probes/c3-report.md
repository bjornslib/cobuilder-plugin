# Optimiser run C3 report (slice 27, E7)

Numbers and 8-character session prefixes only. The run folder `fixtures/real/runs/slice27/` holds the run output, the call logs, the reflection files and the eval outputs. Git ignores it, because it holds real session text. Settings: task model and judge `openai/mercury-3` (`JUDGE_PROVIDER=inception JUDGE_MODEL=mercury-3 JUDGE_REASONING_EFFORT=high`), reflection model `openai/muse-wonder-1.0`, full brief (slice 25 choice). Script: `fixtures/real/scripts/run_slice27.sh`.

## Result

C3 scored 0.652 on the 56 test-set stops. Arm A, run again after the slice 24 prompt change, scored 0.472. C3 − A is +0.180 (interval +0.115 to +0.251). Each interval for a group with 5 or more sessions is above zero, except agencheck, whose lower end is −0.002.

For reference, C2 scored 0.677 on the same 56 stops in slice 20, against an arm A of 0.488 then. The two runs used other A prompts and other run days, so this report does not compare C3 with C2.

## 1. The seed

`probes/programs/seed-armC3-from-C2.json` is a copy of `probes/programs/gepa-armC2-seeded-budget5-seed7.json` with 2 changes in the `propose` instructions (4,422 to 4,371 characters):

- The cut sentence "For ask_human questions, set free_text false when" is removed.
- The `ask_human` example has `"agent_recommendation": "A"` in place of `null`. "A" is the label of the example's one option.

The C2 file is unchanged (SHA-1 `cbb2ec66…` before and after). Git ignores both files.

## 2. The optimiser run

Command: `priority optimise --optimiser gepa --budget 5 --seed 7 --minibatch 6 --threads 2 --val-sessions 12 --seed-program probes/programs/seed-armC3-from-C2.json --tag armC3`. The run printed:

- `trainset: 90 stops (39 sessions); valset: 25 stops (12 sessions); minibatch: 6`
- `reflection model: openai/muse-wonder-1.0`

|Item|Value|
|---|---|
|Metric calls (budget)|575 (5 full evaluations of 115 stops)|
|Seed score on the valset|0.716|
|Best candidate on the valset|0.741 (candidate 3, found at iteration 3)|
|Candidates|16, valset scores 0.624 to 0.741|
|Reflection calls|15, all `openai/muse-wonder-1.0`; proposals 8,173 to 18,151 characters; 0 rejected by the trainset-detail check|
|Task-model rows in the run call log|695|
|Judge calls|785; 7,675,335 prompt tokens and 2,873,082 completion tokens|
|Model errors, judge failures|0, 0|
|Train score of the saved program|0.723 (115 stops)|

Each of iterations 4 to 15 passed its minibatch, but no candidate after iteration 3 beat 0.741 on the valset.

## 3. Arm A and C3 on the test set

Commands: `priority eval --split holdout --threads 3` for arm A, and the same with `--program probes/programs/gepa-armC3-seeded-budget5-seed7.json` for C3. Both runs: 56 stops, 0 judge errors, 0 model errors. Difference = C3 − A. Interval: 95 percent, bootstrap over sessions (`probes/digest_report.py`, 2,000 draws, fixed seed). A group with fewer than 5 sessions gets no interval.

| Group | Stops | Sessions | A | C3 | C3 − A | Interval |
|---|---|---|---|---|---|---|
| all | 56 | 24 | 0.472 | 0.652 | +0.180 | +0.115 to +0.251 |
| test set 1 | 30 | 6 | 0.459 | 0.652 | +0.193 | +0.139 to +0.263 |
| test set 2 | 26 | 18 | 0.488 | 0.653 | +0.165 | +0.048 to +0.308 |
| CoBuilder | 30 | 6 | 0.459 | 0.652 | +0.193 | +0.139 to +0.263 |
| DSPY_PreEmploymentDirectory_PoC | 6 | 3 | 0.658 | 0.769 | +0.111 | none (under 5 sessions) |
| agencheck | 13 | 13 | 0.413 | 0.591 | +0.178 | -0.002 to +0.360 |
| story-writer | 7 | 2 | 0.481 | 0.668 | +0.187 | none (under 5 sessions) |

Other lines: arm A sent 2,039,189 characters in 56 task calls; C3 sent 2,535,853. Fact status: A 0.714, C3 0.679. Fact needs_human: A 0.839, C3 0.804. Steps: A 0.446, C3 0.464.

## 4. Per stop

| Session | Stop | Test set | A | C3 |
|---|---|---|---|---|
| 16505e93 | 2 | 2 | 0.500 | 1.000 |
| 16505e93 | 3 | 2 | 0.667 | 1.000 |
| 173ae36f | 1 | 1 | 0.400 | 0.500 |
| 173ae36f | 5 | 1 | 0.500 | 1.000 |
| 173ae36f | 8 | 1 | 0.500 | 0.500 |
| 173ae36f | 12 | 1 | 0.500 | 0.500 |
| 173ae36f | 16 | 1 | 0.500 | 0.500 |
| 391d47b9 | 1 | 2 | 0.500 | 0.330 |
| 396b87e9 | 1 | 2 | 0.000 | 0.000 |
| 3b3d87e3 | 1 | 2 | 0.500 | 0.500 |
| 40711e5b | 6 | 2 | 0.500 | 0.000 |
| 43e055c1 | 2 | 2 | 0.333 | 1.000 |
| 5597ca26 | 1 | 2 | 1.000 | 0.429 |
| 5597ca26 | 7 | 2 | 0.000 | 0.000 |
| 5597ca26 | 13 | 2 | 0.700 | 0.500 |
| 5597ca26 | 19 | 2 | 0.000 | 0.750 |
| 5597ca26 | 25 | 2 | 0.500 | 1.000 |
| 63996751 | 18 | 2 | 0.667 | 0.750 |
| 71a58b52 | 1 | 1 | 0.500 | 1.000 |
| 71a58b52 | 3 | 1 | 0.670 | 1.000 |
| 71a58b52 | 6 | 1 | 0.600 | 0.500 |
| 71a58b52 | 8 | 1 | 0.500 | 1.000 |
| 71a58b52 | 10 | 1 | 0.500 | 1.000 |
| 7438c281 | 1 | 2 | 0.170 | 0.500 |
| 7ce2f07b | 4 | 2 | 0.500 | 0.500 |
| 7f26f5b0 | 1 | 1 | 0.300 | 0.790 |
| 7f26f5b0 | 3 | 1 | 0.500 | 0.000 |
| 7f26f5b0 | 4 | 1 | 0.400 | 0.800 |
| 7f26f5b0 | 6 | 1 | 0.500 | 0.667 |
| 7f26f5b0 | 8 | 1 | 0.500 | 1.000 |
| 7f58085f | 1 | 1 | 0.500 | 0.900 |
| 7f58085f | 8 | 1 | 0.400 | 0.250 |
| 7f58085f | 15 | 1 | 0.727 | 0.800 |
| 7f58085f | 22 | 1 | 0.500 | 0.667 |
| 7f58085f | 29 | 1 | 0.500 | 0.667 |
| a2f34209 | 1 | 1 | 0.500 | 0.750 |
| a2f34209 | 5 | 1 | 0.500 | 0.667 |
| a2f34209 | 8 | 1 | 0.000 | 0.667 |
| a2f34209 | 12 | 1 | 0.500 | 0.750 |
| a2f34209 | 16 | 1 | 0.800 | 0.500 |
| a41510dd | 10 | 2 | 0.250 | 0.667 |
| a6060e50 | 2 | 2 | 0.300 | 0.750 |
| af644c7f | 49 | 2 | 1.000 | 1.000 |
| b8272515 | 5 | 2 | 0.400 | 0.600 |
| e5d71545 | 1 | 2 | 0.500 | 1.000 |
| e924e1e7 | 1 | 1 | 0.500 | 0.000 |
| e924e1e7 | 37 | 1 | 0.000 | 0.750 |
| e924e1e7 | 72 | 1 | 0.500 | 0.500 |
| e924e1e7 | 108 | 1 | 0.470 | 0.600 |
| e924e1e7 | 144 | 1 | 0.000 | 0.333 |
| e9ebcd88 | 2 | 2 | 0.000 | 0.750 |
| f33925f0 | 1 | 2 | 0.800 | 0.800 |
| f33925f0 | 6 | 2 | 0.800 | 0.800 |
| f33925f0 | 8 | 2 | 0.800 | 0.600 |
| f33925f0 | 12 | 2 | 0.800 | 0.750 |
| f6cdd6bb | 4 | 2 | 0.500 | 1.000 |
