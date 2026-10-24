# Rubric: Slice 1 — Model probe

Feature: priority-dev-spike
Epic: E1
Slice goal: `uv run python priority-dev/probes/model_probe.py <transcript> [--model interpreter|digest] [--repeat N]` runs a model on three redacted real transcripts and prints the five facts, an action kind, a quote, and whether the quote is in the text, plus the agreement across repeats. `probes/model-probe.md` states the JSON validity, the rate-limit count, the agreement, and one full prompt with its replies. The call log stores the prompt text.
Models: interpreter `openrouter/deepseek/deepseek-v4.1-flash-1017`, digest `openrouter/thinkingmachines/inkling-small`.
Test command: `uv run pytest priority-dev/tests -q`

Run the exact command from the repo root with no `--project` flag. A form that needs another flag does not count.

## Criteria

### C1 — The probe prints the five facts, a kind, a quote, and a substring flag for three transcripts [CRITICAL]
**Must be true:** for each of three fixtures in `priority-dev/fixtures/real/`, the output on the interpreter model holds the five facts, one action kind, one quote, and `quote_in_text`. Code computes the flag by a substring test.
**Evidence to check:**
- Run the exact command on each fixture.
- Read the function that sets `quote_in_text`.
**Scoring:**
- 1.0 — all three runs print every field, and the flag comes from a substring test in code.
- 0.5 — the output is complete for two fixtures, or the flag is set by the model.
- 0.0 — a field is missing, or the exact command fails.

### C2 — The report states measured counts for both models, with raw logs committed [CRITICAL]
**Must be true:** `probes/model-probe.md` states, for the interpreter model and for the digest model, how many replies parsed as valid JSON, how many calls hit a rate limit or another error, and how many quotes were in the text. A reply that is a dict with `text` and `reasoning_content` counts by its `text`. Raw replies sit in `probes/logs/`.
**Evidence to check:**
- Read the report and count the lines in the logs for each model id.
- Compare each count to the logs.
**Scoring:**
- 1.0 — every count matches the logs, for both models.
- 0.5 — counts exist, but one does not match the logs, or one model is missing.
- 0.0 — a count is missing, or no logs are committed.

### C3 — The key has one reader and never reaches a log [CRITICAL]
**Must be true:** only `src/priority/config.py` reads `OPENROUTER_API_KEY` at run time, and no committed file or log holds the key.
**Evidence to check:**
- Search `priority-dev/` for `OPENROUTER_API_KEY` and `os.environ`. Ignore design sketches under `priority-dev/docs/` that no code imports.
- Search the committed files for the first 8 characters of the key value from `priority-dev/.env`. Do not print the key.
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

### C5 — The input is readable, and the report shows it [CRITICAL]
**Must be true:** each call record in the log holds the full redacted prompt text, and its hash matches that text. The report shows one complete prompt for one transcript, with the reply of each model to it, and the prompt equals the text in the log. The report also names each defect of the brief that it found.
**Evidence to check:**
- Hash the prompt text of one log record and compare it to `prompt_hash`.
- Compare the prompt in the report to the log record, character by character.
- Read the defects named in the report, and check each against the fixture.
**Scoring:**
- 1.0 — the hash matches, the prompt in the report equals the log, and at least one real defect of the brief is named and true.
- 0.5 — the prompt is stored, but the report omits it or names no defect.
- 0.0 — the log holds only a hash, or the prompt in the report differs from the log.

### C6 — The report states the agreement across repeats
**Must be true:** with `--repeat 3`, each model runs 3 calls on each of the three transcripts. The report gives the agreement for each of the five facts and the kind, and each value equals what `agreement()` computes from the log.
**Evidence to check:**
- Run the exact command with `--repeat 3` on one fixture and read the `agreement:` lines.
- Recompute the share of the most common value from the log for one transcript, and compare it to the report.
**Scoring:**
- 1.0 — values exist for both models and match the recomputation.
- 0.5 — values exist for one model only, or one value does not match.
- 0.0 — no agreement is reported, or the values are invented.

### C7 — The stop is a real agent message, and the brief names its speakers
**Must be true:** a transcript whose last assistant record has model `<synthetic>` does not give that record as the stop. The human line of the brief starts `HUMAN ASKED:`. The instruction block states that the model advises the developer who runs the agents.
**Evidence to check:**
- Build the brief from a made-up fixture that ends on a synthetic assistant record, and read the stop.
- Read the prompt text of one log record.
**Scoring:**
- 1.0 — the synthetic record is skipped, the label is `HUMAN ASKED:`, and the role sentence is present.
- 0.5 — two of the three hold.
- 0.0 — a synthetic record is the stop.

## Regression check
- All tests that passed before this slice must still pass.
- Files outside `priority-dev/` must remain unchanged, except the committed reports named in the slice.

## Out of scope — do not penalise
- The `CLIENT MESSAGE:` section, the `client_error` stop source, the `no_agent_reply` Abstain, and a RUN section that counts across ask boundaries. They belong to slice 4.
- A model call through DSPy `Predict`, the Triage, Pick, Fill, and Card split, and the replay. They belong to slices 5 to 7.
- Behaviour that belongs to a later slice of the plan.
- The policy, the actuator, the attention queue, and the notifier.
