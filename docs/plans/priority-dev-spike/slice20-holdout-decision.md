# Slice 20: decision on the holdout duel

Date: 3 November 2026. Branch: `design/priority-dev-spike`. State: arms A, B and C have run on the train stops. The holdout is untouched.

## The question

Run the holdout duel now? The duel scores arm A (the base program) and arm C (the GEPA program) on the 30 holdout stops, twice each, paired by stop. It reports the mean gain of C over A with a session-cluster bootstrap interval over 6 sessions.

Answer to the engineer's question: the GEPA program runs only in arm C. Arm A is the base program with no demos and no GEPA.

## The three arms

| Arm | Program | Train mean (63 stops) | Note |
|---|---|---|---|
| A | base `ProposeStop` instruction, no demos | 0.475 | one run, 2 stops with `invalid_output` |
| B | base instruction plus 4 labelled demos | 0.420 | one run, 15 stops with `invalid_output` |
| C | GEPA-rewritten instruction, budget 5, seed 7, seeded from A | 0.563 | GEPA tuned on these stops, so it is not evidence |

A against B, paired per stop: B minus A is -0.055. The 95% session-cluster bootstrap interval is -0.139 to +0.039, over 14 sessions. It includes 0.

## Why the holdout duel

1. Arm C was tuned on the 63 train stops. Its train score of 0.563 cannot show a gain.
2. The holdout has 6 sessions and 30 stops. No prompt, demo or GEPA step has seen them. It is the only test of arm C that is not biased.
3. The holdout is used once. If it runs, it cannot help tune C again.
4. The decision rule, stated before the run: C counts as better than A only when the lower end of the interval of C minus A is above 0. An interval that includes 0 is reported as no evidence. A negative mean gain with the interval below 0 means GEPA overfitted the train stops.

## What the duel cannot show

- 21 of the 30 holdout stops (70%) mention CoBuilder, `bundle.json` or a plugin command. In the train part the share is 47 of 63 (75%). The "Known context" paragraph of arm C may help on the holdout for that reason. A win shows a gain on this engineer's CoBuilder work. It does not show a gain on other projects.
- A second line will use the 9 holdout stops with no such mention. The sample is small and the interval will be wide.
- Six sessions give a wide interval. I expect about 0.15 either side of the mean gain [INFERENCE: the train interval over 14 sessions was about 0.09 either side].

## Evidence that the judge can be used

The judge is Mercury 3 with reasoning effort `high`, three repeats and the median score.

| Bar | Result | Required | Outcome |
|---|---|---|---|
| Agreement with the engineer, 8 pairs | 6 of 8 (0.75) | 0.75 | pass, at the line |
| Closed-field probe, 28 copies on the pair stops | 28 of 28 | 0.90 | pass |
| Repeat flips (two picks 0.05 or more apart, in both directions) | 0 of 8 (old rule: 2 of 8) | at most 0.10 | pass |

## Open points and doubts

- The agreement pass is fragile. Pair 4 matches because its reference is now the side that the engineer picked. Without pair 4 the figure is 5 of 7 (0.71), below the bar. Pair 2 is a near tie (0.67 against 0.67). Pairs 1 and 3 differ in every run.
- Arm C looks partly overfitted. Its instruction holds two option labels taken from one training stop, and a paragraph about the CoBuilder plugin that stops in the middle of a sentence. One of the two labels is in no brief. I did not trace where GEPA took it.
- Arm B has 15 stops with `invalid_output`, against 2 for arm A. I did not read the replies. The cause is unknown.
- A and B each ran once. A single run moves by an amount that I have not measured on this setup.
- The reflection model of GEPA is Mercury 3, the same model as the task model. Earlier it was another model.
- Four judge replies in a bar run and two in an earlier run were cut at the token cap. I do not know how those calls scored.
- Four `notify` excerpts in the references are drafts and are not yet confirmed: 36752881/053, 44a2c88e/008, 46ffdc01/001 and 46ffdc01/009. The last one is a demo stop of arm B.
- The probe covers only the 8 pair stops. 20 tests of the old probe fail on purpose and wait for an update.
- The reference of 44a2c88e/006 was changed from `[]` to the `continue_until` step of arm B, on the engineer's direction. A backup of the labels is at `/tmp/labels-confirmed.before-pair4.json`.
- Earlier arm runs (the first four of arm A and three of arm B) are void: they scored 45 of 63 stops, with a wrong stop join and judge errors counted as zeros. No number from them is used.

## Cost and effect of the options

| Option | Time | Judge calls | Effect |
|---|---|---|---|
| Run the duel now | about 25 minutes | about 130 | Uses the holdout once. Gives the unbiased gain of C over A. |
| Run A and B on the train stops again first | about 10 to 20 minutes | about 130 | Shows how much one run moves. Uses no holdout. |
| Do neither, and fix open points first | not set | none | Delays the result. Useful if the judge pass is not enough for you. |

## Decision

Run the holdout duel now, with arm A and arm C, twice each, on the 30 holdout stops?
