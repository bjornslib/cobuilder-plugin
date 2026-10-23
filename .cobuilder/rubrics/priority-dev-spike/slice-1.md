# Rubric: Slice 1 — Model probe

Feature: priority-dev-spike
Epic: E1
Slice goal: `uv run python priority-dev/probes/model_probe.py <transcript>` runs Nemo on three redacted real transcripts, and the report states the JSON validity and the rate-limit count.
Test command: `uv run pytest priority-dev/tests -q`

## Criteria

### C1 — The probe prints the five facts, a kind, a quote, and a substring flag for three transcripts [CRITICAL]
**Must be true:** for each of three fixtures, the output holds the five facts, one action kind, one quote, and `quote_in_text`, and code computes the flag by a substring test.
**Evidence to check:**
- Run the probe on each fixture under `priority-dev/fixtures/`.
- Read the function that sets `quote_in_text`.
**Scoring:**
- 1.0 — all three runs print every field, and the flag comes from a substring test in code.
- 0.5 — the output is complete for two fixtures, or the flag is set by the model.
- 0.0 — a field is missing, or the probe fails.

### C2 — The report states measured counts, with raw logs committed [CRITICAL]
**Must be true:** `probes/model-probe.md` states how many replies parsed as valid JSON, how many calls hit a rate limit, and how many quotes were in the text. Raw replies sit in `probes/logs/`.
**Evidence to check:**
- Read the report and count the lines in the logs.
- Compare each count to the logs.
**Scoring:**
- 1.0 — every count matches the logs.
- 0.5 — counts exist, but one does not match the logs.
- 0.0 — a count is missing, or no logs are committed.

### C3 — The key has one reader and never reaches a log [CRITICAL]
**Must be true:** only `src/priority/config.py` reads `OPENROUTER_API_KEY`, and no committed file or log holds the key.
**Evidence to check:**
- Search `priority-dev/` for `OPENROUTER_API_KEY` and `os.environ`.
- Search the committed files for the first 8 characters of the key value from `priority-dev/.env`.
**Scoring:**
- 1.0 — one reader, and no key in any file.
- 0.5 — one reader, but the key text appears in an ignored file only.
- 0.0 — a second reader, or the key in a committed file.

### C4 — The report names the abort condition it informs
**Must be true:** the report states which `abort_if` condition of `goal.json` it informs, and gives a plain result: held, refuted, or not measured.
**Evidence to check:**
- Read the report named in the slice goal.
- Find the sentence that names the condition and the result.
**Scoring:**
- 1.0 — the sentence exists and the result matches the raw logs.
- 0.5 — the sentence exists, but the result is vague or the logs are missing.
- 0.0 — no such sentence.

## Regression check
- All tests that passed before this slice must still pass.
- Files outside `priority-dev/` must remain unchanged, except the committed reports named in the slice.

## Out of scope — do not penalise
- Behaviour that belongs to a later slice of the plan.
- The policy, the actuator, the attention queue, and the notifier.
