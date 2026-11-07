# Arm C3s: the C3 setup on the stratified valset (7 November 2026)

Numbers and session prefixes only. Run folder `fixtures/real/runs/c3s/` (Git-ignored). Script `fixtures/real/scripts/run_c3s.sh`.

## Setup

Same as C3: seed program `probes/programs/seed-armC3-from-C2.json`, seed 7, budget 5 (575 metric calls), minibatch 6, reflection model `openai/muse-wonder-1.0`, E7 proposer, task model and judge `openai/mercury-3`. Changed: the valset pick (stratified by repository and stop kind, `--val-stops 40`), and with it the split.

|Run|Trainset|Valset|
|---|---|---|
|C3|90 stops, 39 sessions|25 stops, 12 sessions, 64% CoBuilder, 20% needs_human, 0% snooze|
|C3s|74 stops, 27 sessions|41 stops, 24 sessions, 49% CoBuilder, 37% needs_human, 12% snooze|

## Optimiser run

- Valset: seed 0.640, best 0.730 (candidate 6, iteration 9). C3: 0.716 to 0.741.
- 13 proposals: 10 accepted on the minibatch, 3 rejected; 0 rejected by the trainset-detail check. 11 candidates, valset scores 0.606 to 0.730.
- Saved instruction: 10,456 characters. Model errors 0, judge failures 0.

## Test set (56 stops, 24 sessions)

Difference = second − first. Interval: 95 percent, paired, bootstrap over sessions. No interval under 5 sessions.

|Comparison|Group|Stops / sessions|First|Second|Difference|Interval|
|---|---|---|---|---|---|---|
|C3s − A (same day)|all|56 / 24|0.453|0.660|+0.207|+0.127 to +0.292|
||test set 1|30 / 6|0.438|0.665|+0.227|+0.094 to +0.333|
||test set 2|26 / 18|0.470|0.654|+0.185|+0.087 to +0.304|
||agencheck|13 / 13|0.415|0.625|+0.209|+0.008 to +0.398|
||DSPY_PreEmploymentDirectory_PoC|6 / 3|0.585|0.755|+0.169|none|
||story-writer|7 / 2|0.471|0.623|+0.152|none|
|C3s − C3|all|56 / 24|0.652|0.660|+0.008|−0.044 to +0.056|
||test set 1|30 / 6|0.652|0.665|+0.014|−0.041 to +0.057|
||test set 2|26 / 18|0.653|0.654|+0.001|−0.088 to +0.090|
|C3s − C2|all|56 / 24|0.677|0.660|−0.017|−0.101 to +0.061|
||test set 1|30 / 6|0.720|0.665|−0.055|−0.204 to +0.051|
||test set 2|26 / 18|0.628|0.654|+0.026|−0.054 to +0.118|
||agencheck|13 / 13|0.517|0.625|+0.108|+0.023 to +0.213|

C3, C3s and C2 ran on different days. Arm A has now scored 0.488, 0.498, 0.472 and 0.453 on the same stops, so a difference under about 0.05 between days is not a result.

## Reading

The stratified valset moved the valset score further (+0.090 against +0.025 for C3), and the larger valset makes that gain less likely to be noise. The test-set score did not move: C2, C3 and C3s all lie between 0.652 and 0.677, and no interval between them excludes zero. One exception: C3s is above C2 on agencheck (+0.108, interval +0.023 to +0.213), the repository that the old valset under-sampled.
