# Proposer report (E8)

Numbers only. Run folders under `fixtures/real/runs/` are Git-ignored.

## Slice 30: live smoke run of the v2 proposer

Setup: the slice 26 manifest (3 trainset stops, valset of 1 session, 3 stops), seed `probes/programs/seed-armC3-from-C2.json`, budget 3, minibatch 3, `--proposer v2`, reflection model `openai/muse-wonder-1.0`.

- The run printed `proposer: v2`. Each reflection file records `proposer: v2` and the model id.
- 2 reflection calls. Each stop's feedback starts with the score and holds `Structure:` and `Reference:` blocks (3 stops per file).
- Proposals: 5,245 and 5,145 characters, within the 6,000 limit plus the schema guard. Both were accepted on the minibatch.
- Rejected by the trainset-detail check: 0 of 2. The threshold for dropping the `Reference:` block (more than 1 in 4 rejected) was not reached.
- Valset: seed 0.733, best 0.736. Judge errors 0. One task-model reply did not parse during the run.

## Slice 31: arm D2 (8 November 2026) — not a valid result

Setup: the C3s (D1) setup with `--proposer v2`: seed `probes/programs/seed-armC3-from-C2.json`, seed 7, stratified valset (41 stops, 24 sessions), trainset 74 stops, minibatch 6, budget 5, reflection model `openai/muse-wonder-1.0`.

What happened:

- 3 reflection calls worked (proposals 4,850, 5,573 and 5,223 characters). 1 was rejected on the minibatch and 2 were accepted; neither beat the seed on the valset (0.657 and 0.683 against 0.691). 0 were rejected by the trainset-detail check. 3 drafts first went over 6,000 characters and dspy asked for a shorter one.
- From iteration 4 (11:34) every reflection call failed with `LMBillingError` from Meta ("Billing verification failed"). GEPA treated each failure as a mutation with no proposal and ran 70 more iterations, until the budget ran out.
- The run saved the seed program (best candidate 0). So the "D2" test-set score is the seed's score, not a v2 proposal's.
- A check call on 9 November still fails with the same billing error.

Test set (56 stops), same day: the saved "D2" program 0.685, arm A 0.545. These numbers do not compare the proposers.

Defect found: a reflection-model failure that cannot heal must stop the run. A fix follows as a separate RED/GREEN step. D2 must run again after Meta billing works.

## Slice 31: arm D2 with `gpt-6.1-terra` (9 November 2026)

Setup: the C3s (D1) setup with `--proposer v2`: seed `probes/programs/seed-armC3-from-C2.json`, seed 7, stratified valset (41 stops, 24 sessions), trainset 74 stops, minibatch 6, budget 5. Reflection model `openrouter/openai/gpt-6.1-terra`, because the Meta key had a billing fault and the NVIDIA endpoint was too slow. Script `fixtures/real/scripts/run_slice31_terra.sh`.

**D1 and D2 differ in two things:** the proposer (v1 against v2) and the reflection model (Muse Wonder against `gpt-6.1-terra`). This report cannot say which one caused a difference.

|Run|Valset: seed → best|Proposals|Accepted / rejected on the minibatch|Rejected by the trainset-detail check|Saved instruction|
|---|---|---|---|---|---|
|D1 (C3s, v1, Muse Wonder)|0.640 → 0.730|13|10 / 3|0|10,456 characters|
|D2 (v2, `gpt-6.1-terra`)|0.677 → 0.701|18|8 / 10|0|5,028 characters|

D2 proposals: 4,094 to 5,356 characters, all within the 6,000 limit. No reflection call failed. The run printed 15 "LM response was truncated" warnings; their calls are not known.

### Test set (56 stops, 24 sessions)

Difference = second − first. Interval: 95 percent, paired, bootstrap over sessions; none under 5 sessions. A1 ran on the day of D1, A2 on the day of D2.

|Comparison|Group|Stops / sessions|First|Second|Difference|Interval|
|---|---|---|---|---|---|---|
|D2 − D1|all|56 / 24|0.660|0.605|−0.055|−0.116 to −0.010|
||test set 1 (CoBuilder)|30 / 6|0.665|0.631|−0.034|−0.114 to +0.019|
||test set 2|26 / 18|0.654|0.575|−0.079|−0.174 to −0.013|
||agencheck|13 / 13|0.625|0.491|−0.134|−0.243 to −0.046|
||DSPY_PreEmploymentDirectory_PoC|6 / 3|0.755|0.736|−0.019|none|
||story-writer|7 / 2|0.623|0.593|−0.030|none|
|D2 − A2 (same day)|all|56 / 24|0.521|0.605|+0.084|−0.023 to +0.174|
||test set 1|30 / 6|0.522|0.631|+0.110|−0.072 to +0.261|
||test set 2|26 / 18|0.521|0.575|+0.054|−0.023 to +0.116|
|D1 − A1 (same day)|all|56 / 24|0.453|0.660|+0.207|+0.127 to +0.292|
|A2 − A1 (same prompt, two days)|all|56 / 24|0.453|0.521|+0.068|+0.008 to +0.129|
||test set 1|30 / 6|0.438|0.522|+0.083|+0.024 to +0.149|

### Reading

D2 scored lower than D1 on the test set (−0.055), and its interval lies below zero. But arm A, with an unchanged prompt, moved by +0.068 between the two days, and that interval also excludes zero. So the session bootstrap understates the day-to-day spread, and a difference of this size between runs on different days is not a reliable result. Against its own same-day arm A, D2 gains +0.084 (interval spans zero) and D1 gained +0.207. On this evidence, the v2 proposer with `gpt-6.1-terra` did not beat the v1 proposer with Muse Wonder, and may be worse. The two changes cannot be separated.

### Rows against arm A for each repository

|Comparison|Group|Stops / sessions|First|Second|Difference|Interval|
|---|---|---|---|---|---|---|
|D2 − A2|agencheck|13 / 13|0.478|0.491|+0.013|−0.110 to +0.137|
||DSPY_PreEmploymentDirectory_PoC|6 / 3|0.664|0.736|+0.072|none|
||story-writer|7 / 2|0.478|0.593|+0.115|none|
|D1 − A1|test set 1|30 / 6|0.438|0.665|+0.227|+0.094 to +0.333|
||test set 2|26 / 18|0.470|0.654|+0.185|+0.087 to +0.304|
||agencheck|13 / 13|0.415|0.625|+0.209|+0.008 to +0.398|
||DSPY_PreEmploymentDirectory_PoC|6 / 3|0.585|0.755|+0.169|none|
||story-writer|7 / 2|0.471|0.623|+0.152|none|

### Validation and decision (10 November 2026)

- A blind validation scored attempt 1 at 0.50 (FAIL). C1, "only the proposer differs", scored 0.0, because the reflection model also differs. C2 scored 0.5, because some rows against arm A were missing. This section now adds those rows. C3 scored 1.0.
- The validator also noted: the seed's valset score differs between the runs (0.640 and 0.677) with the same seed and valset, and D2 logged 15 truncation warnings against 7 for D1.
- The engineer decided not to rerun D1 or D2. The E8 question, "does the v2 proposer beat v1?", stays without an answer.
- Next direction (engineer): stop optimising on past sessions. Run the digest and the interpreter on live Claude Code sessions through the Stop hook, so the engineer can give feedback on sessions that the engineer remembers.
