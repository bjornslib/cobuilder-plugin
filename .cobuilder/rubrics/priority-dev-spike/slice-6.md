# Rubric: Slice 6 — Digest a run

Feature: priority-dev-spike
Epic: E2
Slice goal: `uv run priority digest` calls the digest model and prints a RunDigest that validates, and the next stop brief of the same session carries it as `previous`.
Test command: `uv run pytest priority-dev/tests -q`

## Criteria

### C1 — The digest validates against its limits
**Must be true:** the output parses into `RunDigest`: `ran` up to 600 characters, `result` up to 300, up to 5 open items and 5 decisions.
**Evidence to check:**
- Run the digest on one fixture and parse the output.
**Scoring:**
- 1.0 — it parses.
- 0.5 — it parses after one repair by code.
- 0.0 — it does not parse.

### C2 — The next brief carries the digest as previous [CRITICAL]
**Must be true:** after a digest is stored, the brief of the next stop of the same session holds it in `previous`.
**Evidence to check:**
- Run the two-stop fixture.
**Scoring:**
- 1.0 — `previous` equals the stored digest.
- 0.5 — `previous` is set, but from another session.
- 0.0 — `previous` is empty.

### C3 — A digest failure blocks nothing [CRITICAL]
**Must be true:** with an injected failure, `previous` stays empty, the reason is logged, and the interpretation still runs.
**Evidence to check:**
- Run the failure test.
**Scoring:**
- 1.0 — all three hold.
- 0.5 — the reason is not logged.
- 0.0 — the interpretation is blocked.

### C4 — The report names the abort condition it informs
**Must be true:** the report states which `abort_if` condition of `goal.json` it informs, and gives a plain result: held, refuted, or not measured.
**Evidence to check:**
- Read the report named in the slice goal.
- Find the sentence that names the condition and the result.
**Scoring:**
- 1.0 — the sentence exists and the result matches the raw logs.
- 0.5 — the sentence exists, but the result is vague or the logs are missing.
- 0.0 — no such sentence.

### C5 — An over-budget brief shrinks only older tool inputs and results, and fails closed when it cannot fit [CRITICAL]
**Must be true:** given a brief over 160,000 characters of brief text, the Shrink call replaces the largest older tool inputs and tool results with shorter texts, one at a time, until the brief fits. It never touches the human ask, the final reply, the last three exchanges, the `CLIENT MESSAGE:` section, or the human lines after the last agent message. The brief records how many items shrank and which ones. When the brief is still over the budget after every older input and result shrank, the interpreter gives the Abstain `brief_too_large` and makes no further call.
**Evidence to check:**
- Run the brief builder with the Shrink call on two made-up fixtures: an over-budget run whose older inputs and results are large, and a run whose protected parts alone exceed the budget. Use a stubbed model for the shrink text.
- Read the shrink record, and compare each protected item to its text before the shrink.
**Scoring:**
- 1.0 — the first fixture fits after shrinking only older inputs and results, with a correct record. The second gives `brief_too_large` and makes no model call.
- 0.5 — the first fixture fits, but the record is missing, or the second makes a model call.
- 0.0 — a protected item shrinks, or a brief over the budget goes to the interpreter model.

## Regression check
- All tests that passed before this slice must still pass.
- Files outside `priority-dev/` must remain unchanged, except the committed reports named in the slice.

## Out of scope — do not penalise
- Behaviour that belongs to a later slice of the plan.
- The policy, the actuator, the attention queue, and the notifier.
