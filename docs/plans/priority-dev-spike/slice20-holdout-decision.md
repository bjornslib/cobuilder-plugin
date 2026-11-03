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

## Holdout, first run (3 November 2026)

Arm A and arm C ran once each on the 30 holdout stops (6 sessions), with 0 judge errors and 0 model errors.

| | Arm A | Arm C | C minus A |
|---|---|---|---|
| Mean | 0.478 | 0.615 | +0.137 |
| 95% session-cluster CI | | | +0.035 to +0.237 |
| Stops won | 6 | 19 | 5 equal |
| `invalid_output` stops | 3 | 5 | |

Under the rule fixed before the run, C counts as better than A on this first look. The lower end of the interval is close to 0.

| Subset | Stops | Sessions | C minus A | 95% CI |
|---|---|---|---|---|
| Mentions CoBuilder, `bundle.json` or a plugin command | 21 | 6 | +0.157 | +0.028 to +0.245 |
| No such mention | 9 | 4 | +0.091 | -0.192 to +0.321 |

Per session, C minus A: +0.35, +0.18, +0.17, +0.14, +0.05, -0.07. Arm C scored 0.615 on the holdout and 0.563 on the train stops that it trained on. A pure overfit would show the reverse. One run is noisy, so this is evidence against memorising, not proof. The gain on stops with no CoBuilder mention cannot be separated from 0.

## New training data (found, nothing copied)

The live Claude folder holds no transcripts for these projects. The backup `~/.claude-backup/projects` holds them. Structure only was read.

| Source | Rule | Sessions | Stops (cap of 5 per session) |
|---|---|---|---|
| agencheck | 3 stops or more | 58 | 228 |
| story-writer | 1 stop or more | 7 | 17 |
| DSPY_PreEmploymentDirectory_PoC | 1 stop or more | 9 | 22 |
| Total | exact duplicates removed (36) | 74 | 267 |

Proposed split, by the same stable hash as the first split, per source: train 51 sessions and 188 stops, holdout 2 with 23 sessions and 79 stops. Only 14 holdout stops come from story-writer (11) and the pre-employment project (3). The sessions go only into the gitignored `fixtures/real/` folder.

## Why label holdout 2 first

"Label" means: generate the reference payload for a stop. The drafter writes each payload from the stop brief only. The engineer corrects and confirms each draft.

1. It answers the open question fastest. The holdout showed a gain on CoBuilder work only. Arms A and C need no new training for this test.
2. It spends the effort where the answer changes the plan. The 79 stops are 30% of the work. The result shows whether the 188 training stops are needed, and from which projects.
3. It keeps a clean before-and-after. The current arm C trained on CoBuilder only. Scoring it on other projects first shows what the later training adds.
4. It keeps the test fair. The confirmed references of holdout 2 never go into a prompt, a demo or GEPA.

Limit: 65 of the 79 stops are agencheck. Only 14 stops come from story-writer and the pre-employment project.

## Rule for the token cap

7 holdout stops gave an empty or cut reply (3 on arm A, 4 on arm C) at a cap of 3000 tokens. A rerun of those 7 at 6000 is a diagnosis only, and its scores do not enter the C minus A figure. If the cap costs score, it is raised for both arms and all 30 holdout stops run again. The second holdout run can serve as that rerun.

## Holdout 2, first run (3 November 2026), against unconfirmed drafts

Plan as built: scarce repositories split at the repository level (story-writer 2 of 7 sessions, pre-employment 3 of 9), agencheck per workstream (30%, at least 1 where a workstream has 3 sessions or more). Holdout 2 holds 21 sessions and 36 stops. Agencheck gives 1 stop per session (16 stops). Story-writer and pre-employment give up to 5 stops per session (8 and 12 stops). The 53 training sessions are not copied yet (about 61 stops later). The 36 references are drafts: a drafter wrote each from the stop brief only. The engineer has not confirmed them.

| Subset | Stops | Sessions | Arm A | Arm C | C minus A | 95% CI | C wins / A wins / equal |
|---|---|---|---|---|---|---|---|
| All | 36 | 21 | 0.369 | 0.498 | +0.129 | +0.011 to +0.261 | 16 / 7 / 13 |
| agencheck | 16 | 16 | 0.415 | 0.549 | +0.135 | -0.059 to +0.352 | 6 / 4 / 6 |
| story-writer | 8 | 2 | 0.519 | 0.638 | +0.120 | too few sessions | 5 / 2 / 1 |
| PreEmployment PoC | 12 | 3 | 0.208 | 0.336 | +0.128 | 0.000 to +0.267 | 5 / 1 / 6 |
| Other repositories pooled | 20 | 5 | 0.333 | 0.457 | +0.125 | -0.002 to +0.304 | 10 / 3 / 7 |

The sign agrees in every repository. No single repository has enough sessions to stand alone. Each arm had 1 bad reply. The base score is lower than on holdout 1 (0.369 against 0.478). The cause is not known. The result can change when the engineer confirms the drafts.

## Data rules from the engineer (4 November 2026) and the rebuild

1. Keep only chats between the agent and the engineer. Drop a stop that holds a `shutdown_request`, a message with a `teammate_id`, a `<task-notification>`, or a compaction summary ("This session is being continued...") as its human turn.
2. The `agent_recommendation` of every `ask_human` question is never null. If the agent stated none, the drafter picks the best option label.

Holdout 2 rebuilt on these rules: 18 sessions and 26 stops (agencheck 13 sessions and 13 stops, story-writer 2 sessions and 7 stops, pre-employment 3 sessions and 6 stops). 13 `ask_human`, 8 `notify`, 3 `snooze`, 2 `continue`, 2 `continue_until`. Priority: 13 P2 and 13 P3. The 36-stop run above used the earlier set, where 13 stops were compaction summaries or machine messages. It is superseded, and a rerun on the 26 stops waits for the engineer's confirmation.

Check of the other data against the rules:

| Data | Stops or sessions | With a marker or compaction summary | Null recommendations |
|---|---|---|---|
| First 97 stops, train part | 67 stops | 9 stops (8 in the human turn) | 7 questions in the 97, listed below |
| First 97 stops, holdout 1 | 30 stops | 10 stops (9 in the human turn) | |
| New training pool (49 sessions, not copied) | 49 sessions | 23 sessions have no clean stop | not drafted yet |

- Null recommendations in the first 97: 36752881/027, 438c1bee/008, 7ba9f3e6/004, 7ba9f3e6/014, b61517c7/001, b61517c7/006, b61517c7/008.
- Holdout 1 without its 10 marker stops: A 0.527, C 0.664, C minus A +0.138 (CI -0.030 to +0.261, 20 stops, 6 sessions). The gain is the same as with all 30 stops (+0.137).
- The new training pool gives 30 stops under the plan rules after the filter, or at most 82 clean stops in total if one session may give several stops (agencheck 65, pre-employment 14, story-writer 3).

## Decision

Which new data do we label first, and how much? Recommended: label holdout 2 first (79 stops from 23 sessions), run arms A and C on it with no training, then decide about the 188 training stops. The alternatives are all 267 stops, or a lower cap of 3 stops per session. The second holdout run of A and C on the first holdout waits.
