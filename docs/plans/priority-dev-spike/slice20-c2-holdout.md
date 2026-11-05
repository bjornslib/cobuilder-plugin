# Slice 20: arm A against arm C2 on the holdout

Run of 2026-11-04. Mercury 3 is the task model, the judge, and the GEPA reflection model. The page for the
reader is `.lavish/c2-holdout-report.html` (Git ignores it). This file is the record.

## Result

| Group | Stops / sessions | A | C2 | C2 − A | 95% interval | Win / tie / loss |
|---|---|---|---|---|---|---|
| All holdout stops | 56 / 24 | 0.488 | 0.677 | +0.189 | +0.094 to +0.285 | 36 / 11 / 9 |
| Holdout 1 (CoBuilder sessions) | 30 / 6 | 0.471 | 0.720 | +0.249 | +0.143 to +0.383 | 21 / 6 / 3 |
| Holdout 1, chat stops only (subgroup chosen after the results) | 20 / 6 | 0.463 | 0.777 | +0.313 | +0.210 to +0.438 | 15 / 3 / 2 |
| Holdout 2 | 26 / 18 | 0.509 | 0.628 | +0.119 | −0.006 to +0.247 | 15 / 5 / 6 |
| agencheck | 13 / 13 | 0.454 | 0.517 | +0.063 | −0.104 to +0.215 | 7 / 4 / 2 |
| story-writer | 7 / 2 | 0.457 | 0.717 | +0.260 | n too small, no interval | 6 / 1 / 0 |
| pre-employment | 6 / 3 | 0.689 | 0.766 | +0.077 | n too small, no interval | 2 / 0 / 4 |

Paired difference, bootstrap over sessions, 20,000 resamples. A group with fewer than 5 sessions shows no interval: a bootstrap over 2 or 3 sessions gives only a few distinct means (the earlier upper bound of +0.500 came from that). Each arm ran once. There were 0 judge errors and
0 model errors. Arm A had 2 invalid replies (score 0). C2 had none. Without those 2 stops the gap is +0.166 on 54 stops.

## How C2 was made

GEPA from the arm C prompt (`--seed-program`), budget 5, seed 7, 2 threads, minibatch 3. 115 train stops from
51 sessions. GEPA used 95 stops for reflection and 20 stops (7 sessions) for selection. 31 proposals, 19 passed
the minibatch gate. The best candidate scored 0.675 on the selection stops (seed 0.593). It was found at
iteration 4, and no later candidate beat it. Both holdout runs used a 16000-token task cap and no cap on the
notify excerpt. Earlier arm C numbers used 3000 tokens and a 600-character excerpt cap, so they do not compare.

## Open doubts

- One run per arm. The noise of this setup is not measured.
- The gain sits in the CoBuilder sessions, which share a project with the first training set. The arm C text
  names CoBuilder commands and holds options from the training set. Outside CoBuilder the intervals span zero.
- Every logged GEPA proposal body measures 3995 to 4001 characters. `gepa_proposer._cap_draft` cuts at 4000.
  The saved C2 text ends in the middle of a sentence. The length lost per draft is not known.
- For a reply that fails to parse, DSPy gives the reflection model the raw reply and a generic structure message.
  Our judge note with the error text is dropped. The reflective example holds no numeric score.
- The selection set has 20 stops, so differences between candidates below about 0.1 are noise.
- Mercury 3 is the task model, the judge, and the reflection model.
- Four notify excerpts and four P2-notify priority choices in the training drafts are open.

## GEPA gaps

These are gaps in how GEPA runs here. Each row is a fact from the code or the log, except where it says "not proved".
None is fixed.

| # | Gap | Evidence | Likely effect |
|---|---|---|---|
| 1 | Every proposal is cut at 4000 characters. The cut is silent, and the reflection model is not told the cap. | `gepa_proposer._cap_draft`, `MAX_PROPOSAL_CHARS = 4000`. All 31 logged proposal bodies measure 3995 to 4001 characters. The saved C2 text ends mid-sentence. | The prompt cannot grow, and a rule added at the end is lost. Not proved: this may be why no candidate beat iteration 4. |
| 2 | A failed parse loses our judge note. | DSPy builds its own feedback for a reply that does not parse (`gepa_utils.py`, lines 429 to 437): the raw reply and a generic structure message. The log shows 15 parse failures. | The reflection model never sees the error text, or a null `agent_recommendation`. |
| 3 | The reflection model sees no numeric score. | The reflective example holds Inputs, Generated Outputs and Feedback only. Our feedback has no numbers. | It cannot tell a 0.9 stop from a 0.3 stop, except by the words. |
| 4 | The selection set is small and noisy. | 20 stops from 7 sessions. Scores for near-identical prompts ran from 0.43 to 0.675 over 19 evaluations. One stop moves the mean by 0.05. | GEPA cannot reliably choose between candidates that differ by less than about 0.1. |
| 5 | The minibatch is small. | 3 stops per reflection step. 19 candidates accepted and 12 rejected on such samples. | Acceptance rests on 3 stops. |
| 6 | The reflection model is the task model. | Mercury 3 does both. The DSPy GEPA skill advises a stronger, separate model. | The proposals may be weak. Not tested. |
| 7 | GEPA logs are not kept. | No `log_dir` and no `track_stats`. | Nobody can show what the reflection model saw. |
| 8 | The prompt example teaches a null. | `signatures.py` line 46 has `"agent_recommendation": null`. The references never use null. | The model copies the example. Arm A and the seed text carry it. |
| 9 | Training detail enters the prompt. | The C2 text holds two option labels and a file name taken from one training stop. | Overfitting to CoBuilder. The gain sits mainly in CoBuilder sessions. |
| 10 | Briefs go in whole. | Median 17K characters, p90 103K, maximum 161K. A 3-stop minibatch can reach about 500K characters. | Dilution is possible. No context error seen. Not tested. |

Two points for any new run:

- The seed text of C2 is already cut. A higher cap does not repair it. Finish or remove the cut sentence in a copy of
  the program file, and seed the next run from the copy.
- The fix for gap 8 changes the prompt of arm A. Either keep the old A as the baseline, or rerun A after the fix. The
  plan must say which.

## Changed in the run

`Notify.excerpt` has no length cap (it was 600, a first guess in the E5 design). `MAX_TOKENS` of the task model
is 16000 (it was 3000). `digest.py` imports the same constant.
