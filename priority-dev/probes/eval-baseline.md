# Eval baseline report (slice 16)

Date: 26 October 2026. Command: `uv run priority eval --split <train|holdout> --real-dir fixtures/real --log-dir <dir>`. Model: `openrouter/deepseek/deepseek-v4.1-flash-1017` for Triage, Pick, Fill, and Card. Three repeats of each split. The labels are the 48 engineer-confirmed stops in 10 sessions: 33 train, 15 held out.

## Scores

| Split | Repeat 1 | Repeat 2 | Repeat 3 | Mean | Spread |
|---|---|---|---|---|---|
| Train, including ambiguous | 0.600 | 0.623 | 0.605 | 0.609 | 0.023 |
| Train, excluding ambiguous | 0.600 | 0.623 | 0.605 | 0.609 | 0.023 |
| Holdout, including ambiguous | 0.581 | 0.625 | 0.621 | 0.609 | 0.044 |
| Holdout, excluding ambiguous | 0.591 | 0.619 | 0.600 | 0.603 | 0.028 |

No train stop is ambiguous, so the two train lines match. One holdout stop (`7ba9f3e6-004`) is ambiguous, so the holdout lines differ.

## Where the points go missing

Facts score 0.22 to 0.35 of 0.40. The model often misreads the status or the answer class. Steps score 0.04 to 0.32 of 0.40. The first step is wrong more often than the tail. Grounding is full in every run: every quote the model gives is in the brief. Validity is near full: almost no model-fault Abstain.

The weakest session is `5d2114e3` (0.25 to 0.41). Its waiting stops ask the human a question, and the model answers `snooze` where the label says `ask_human`. The strongest is `46ffdc01` (about 0.69).

## Cost

The six runs made 86, 89, and 102 calls on train and 47, 41, and 45 on holdout. They sent 5,662,839 characters on train and 1,888,994 on holdout. At four characters per token and USD 0.15 per million input tokens, the input side cost about USD 0.21 for train and USD 0.07 for holdout. The replies are short, and the output side adds about USD 0.01. The six runs cost about USD 0.30 in total.

## Reading the numbers

A later gain counts only when it clears the spread: 0.023 on train and 0.044 on holdout. The model varies between runs on the same stop, so one repeat proves nothing. Three repeats are the minimum, not a comfort.

## Abort condition

This report informs the first condition in `goal.json`: "the interpreter model returns valid, grounded output on too few real stops to build on, and the digest model cannot digest either". This report speaks only to the interpreter clause. Result: **not measured**. No threshold defines "too few". The first measured value is a mean of 0.609 on 33 train stops and 0.609 on 15 held-out stops. The optimiser slices must raise it.
