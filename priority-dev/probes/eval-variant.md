# Eval variant report (slice 17)

Date: 26 October 2026. Command: `uv run priority eval --split <train|holdout> --variant <chain|combined> --real-dir fixtures/real --log-dir <dir>`. Same 48 labelled stops and the slice 16 metric as the baseline, three repeats of each of the four combinations.

## Scores

| Variant | Split | R1 | R2 | R3 | Mean | Spread |
|---|---|---|---|---|---|---|
| Chain | Train | 0.621 | 0.618 | 0.539 | 0.593 | 0.082 |
| Chain | Holdout | 0.564 | 0.655 | 0.621 | 0.613 | 0.091 |
| Combined | Train | 0.514 | 0.516 | 0.528 | 0.519 | 0.014 |
| Combined | Holdout | 0.504 | 0.532 | 0.480 | 0.505 | 0.052 |

The chain beats the combined call by about 0.07 on train and 0.11 on
holdout. Both gaps clear the spreads. The combined call is steadier
(smaller spread) but steadily worse: one big prompt with the whole
13-kind schema does not beat three small calls with one job each.

## Cost

The chain made 88 to 96 calls per train repeat and 39 to 45 per holdout
repeat, sending about 1.9M characters per train repeat and 0.6M per
holdout repeat. The combined call made 51 to 52 calls per train repeat
and 22 to 25 per holdout repeat, sending about 1.1M and 0.3M characters.
The combined variant costs about 60 percent of the chain and scores
about 0.10 less. The saving does not buy the loss.

## Contradictions

A contradiction is a question card beside a first step of `snooze`. The
chain showed one in two of the six repeats. The combined call showed
none. Neither variant contradicts often, so this does not decide.

## Decision

Slice 18 compiles the chain. The combined variant loses on score, and
the cost saving is small against the gap. The chain's train repeat 3
(0.539) shows how far one run can fall, so the optimiser comparison
reads every gain against the spreads above.
