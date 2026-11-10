# Same-day test set at the 64,000-token limit (10 November 2026)

Numbers only. Run folder `fixtures/real/runs/limit64k/` and script `fixtures/real/scripts/run_limit64k.sh` are Git-ignored.

## Setup

- The Mercury 3 output limit is 64,000 tokens for the task model, the digest model and the judge (commit `e26e472`; it was 16,000). The limit goes out as `max_completion_tokens`, so reasoning and reply share it.
- Three `priority eval --split holdout` runs, one after another, on one day: D1 (`probes/programs/gepa-armC3s-seeded-budget5-seed7.json`), D2 (`probes/programs/gepa-armD2terra-seeded-budget5-seed7.json`), then arm A (the base prompt). 3 threads, judge Mercury 3 with reasoning effort high. The three runs took 670 seconds in total.
- Test set: 56 stops, 24 sessions (test set 1: 30 stops, 6 sessions; test set 2: 26 stops, 18 sessions).
- No program changed: D1 and D2 are the saved programs of 7 and 9 November.

## Scores

Difference = second − first. Interval: 95 percent, paired, bootstrap over sessions; none under 5 sessions.

|Comparison|Group|Stops / sessions|First|Second|Difference|Interval|
|---|---|---|---|---|---|---|
|D2 − D1|all|56 / 24|0.654|0.639|−0.014|−0.063 to +0.032|
||test set 1|30 / 6|0.696|0.692|−0.003|−0.078 to +0.074|
||test set 2|26 / 18|0.605|0.578|−0.027|−0.096 to +0.018|
||agencheck|13 / 13|0.521|0.445|−0.076|−0.173 to −0.003|
||DSPY_PreEmploymentDirectory_PoC|6 / 3|0.728|0.707|−0.021|none|
||story-writer|7 / 2|0.657|0.715|+0.058|none|
|D1 − A|all|56 / 24|0.469|0.654|+0.185|+0.101 to +0.266|
||test set 1|30 / 6|0.455|0.696|+0.241|+0.127 to +0.357|
||test set 2|26 / 18|0.485|0.605|+0.121|+0.025 to +0.222|
||agencheck|13 / 13|0.460|0.521|+0.060|−0.094 to +0.201|
||DSPY_PreEmploymentDirectory_PoC|6 / 3|0.576|0.728|+0.152|none|
||story-writer|7 / 2|0.451|0.657|+0.206|none|
|D2 − A|all|56 / 24|0.469|0.639|+0.171|+0.090 to +0.239|
||test set 1|30 / 6|0.455|0.692|+0.237|+0.171 to +0.318|
||test set 2|26 / 18|0.485|0.578|+0.094|−0.025 to +0.195|
||agencheck|13 / 13|0.460|0.445|−0.015|−0.159 to +0.118|
||DSPY_PreEmploymentDirectory_PoC|6 / 3|0.576|0.707|+0.131|none|
||story-writer|7 / 2|0.451|0.715|+0.264|none|

## Against the earlier runs at 16,000 tokens

Each arm against its own earlier run. The day and the limit both changed, so these rows cannot separate the two.

|Arm|Earlier run|Earlier|Today|Difference|Interval|
|---|---|---|---|---|---|
|D1|7 November|0.660|0.654|−0.007|−0.069 to +0.033|
|D2|9 November|0.605|0.639|+0.034|−0.041 to +0.120|
|A|9 November|0.521|0.469|−0.052|−0.119 to +0.012|

## Truncation and failed replies

|Run|"LM response was truncated" warnings|Task-model rows cut at `length`|Replies that did not parse|Largest reasoning count|
|---|---|---|---|---|
|D1, 7 November (16,000)|1|not recorded|1|not recorded|
|D2, 9 November (16,000)|1|not recorded|2|not recorded|
|A, 9 November (16,000)|0|not recorded|0|not recorded|
|D1 today (64,000)|0|0|0|7,125|
|D2 today (64,000)|0|0|1|5,445|
|A today (64,000)|0|0|1|3,368|

- The warning counts cover both the task model and the judge, because dspy prints the warning for any call. The call rows record only the task model.
- Today no call reached the limit. No task-model call used more than 7,125 reasoning tokens; the median was 624 to 858 per arm.
- The 2 replies that did not parse today are a second failure mode. Both ended with `finish_reason=stop`, after 579 and 862 reasoning tokens, with an empty reply. dspy raised "The LM returned an empty or null response". The limit does not cause these. Each scored 0 for its stop.
- Most of the 22 earlier truncation warnings came from the optimiser runs (15 in D2, 7 in D1), not from these test-set runs.

## Reading

- D1 and D2 now score within 0.015 of each other, and the interval spans zero. On the same day, neither proposer is better. The gap of −0.055 on 9 November came mostly from the day.
- Both GEPA prompts beat the base prompt by a clear margin: D1 by +0.185 and D2 by +0.171, both intervals above zero. The gain is larger on test set 1 (CoBuilder) than on test set 2.
- On agencheck, D2 scores below D1 (−0.076, interval just below zero) and does not beat arm A.
- The higher limit removed the truncation in these runs. Whether it changed any score is not known: no arm moved by more than the spread between days seen before (arm A: +0.068 between 7 and 9 November).
