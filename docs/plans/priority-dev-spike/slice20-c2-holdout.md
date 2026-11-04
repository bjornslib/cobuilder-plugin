# Slice 20: arm A against arm C2 on the holdout

Run of 2026-11-04. Mercury 3 is the task model, the judge, and the GEPA reflection model. The page for the
reader is `.lavish/c2-holdout-report.html` (Git ignores it). This file is the record.

## Result

| Group | Stops / sessions | A | C2 | C2 − A | 95% interval | Win / tie / loss |
|---|---|---|---|---|---|---|
| All holdout stops | 56 / 24 | 0.488 | 0.677 | +0.189 | +0.094 to +0.285 | 36 / 11 / 9 |
| Holdout 1 (CoBuilder sessions) | 30 / 6 | 0.471 | 0.720 | +0.249 | +0.143 to +0.383 | 21 / 6 / 3 |
| Holdout 1, chat stops only (after the fact) | 20 / 6 | 0.463 | 0.777 | +0.313 | +0.210 to +0.438 | 15 / 3 / 2 |
| Holdout 2 | 26 / 18 | 0.509 | 0.628 | +0.119 | −0.006 to +0.247 | 15 / 5 / 6 |
| agencheck | 13 / 13 | 0.454 | 0.517 | +0.063 | −0.104 to +0.215 | 7 / 4 / 2 |
| story-writer | 7 / 2 | 0.457 | 0.717 | +0.260 | +0.164 to +0.500 | 6 / 1 / 0 |
| pre-employment | 6 / 3 | 0.689 | 0.766 | +0.077 | −0.093 to +0.500 | 2 / 0 / 4 |

Paired difference, bootstrap over sessions, 20,000 resamples. Each arm ran once. There were 0 judge errors and
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

## Changed in the run

`Notify.excerpt` has no length cap (it was 600, a first guess in the E5 design). `MAX_TOKENS` of the task model
is 16000 (it was 3000). `digest.py` imports the same constant.
