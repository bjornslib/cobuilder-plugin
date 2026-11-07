# Proposer report (E8)

Numbers only. Run folders under `fixtures/real/runs/` are Git-ignored.

## Slice 30: live smoke run of the v2 proposer

Setup: the slice 26 manifest (3 trainset stops, valset of 1 session, 3 stops), seed `probes/programs/seed-armC3-from-C2.json`, budget 3, minibatch 3, `--proposer v2`, reflection model `openai/muse-wonder-1.0`.

- The run printed `proposer: v2`. Each reflection file records `proposer: v2` and the model id.
- 2 reflection calls. Each stop's feedback starts with the score and holds `Structure:` and `Reference:` blocks (3 stops per file).
- Proposals: 5,245 and 5,145 characters, within the 6,000 limit plus the schema guard. Both were accepted on the minibatch.
- Rejected by the trainset-detail check: 0 of 2. The threshold for dropping the `Reference:` block (more than 1 in 4 rejected) was not reached.
- Valset: seed 0.733, best 0.736. Judge errors 0. One task-model reply did not parse during the run.
