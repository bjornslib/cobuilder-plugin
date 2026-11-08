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
