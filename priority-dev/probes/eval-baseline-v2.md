# Eval baseline report, 20 sessions (slice 16 rerun)

Date: 27 October 2026. Same command and model as the first baseline, on the extended set: 97 stops in 20 sessions, 14 train and 6 holdout. The first baseline (`eval-baseline.md`, 10 sessions) stands as the DeepSeek-era record and is not comparable to this one. Both baselines ran on Inception Mercury 3 except the first, which ran on DeepSeek.

## Scores

| Split | R1 | R2 | R3 | Mean | Spread |
|---|---|---|---|---|---|
| Train, including ambiguous | 0.626 | 0.633 | 0.660 | 0.640 | 0.034 |
| Train, excluding ambiguous | 0.623 | 0.631 | 0.656 | 0.637 | 0.033 |
| Holdout, including ambiguous | 0.707 | 0.731 | 0.685 | 0.708 | 0.046 |
| Holdout, excluding ambiguous | 0.707 | 0.731 | 0.685 | 0.708 | 0.046 |

The holdout holds no ambiguous stop, so its two lines match. The two ambiguous stops are in train.

## Reading the numbers

The new sessions score higher than the old set. The holdout mean of 0.708 beats the train mean of 0.640, because the new done-heavy sessions answer cleanly. A later gain counts only past the spreads: 0.034 on train and 0.046 on holdout.

## Cost

The six runs made about 100 calls each and sent about 1.1M characters per train repeat and 0.4M per holdout repeat. At four characters per token and USD 0.15 per million input tokens, the input side cost about USD 0.41 per train repeat and USD 0.06 per holdout repeat. The whole baseline cost about USD 1.50.

## Abort condition

Same condition as the first baseline. Result: **not measured**. No threshold defines too few. The first measured value on this set is a holdout mean of 0.708.
