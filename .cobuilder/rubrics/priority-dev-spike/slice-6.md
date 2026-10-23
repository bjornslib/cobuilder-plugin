# Rubric: Slice 6 — Digest a run

Feature: priority-dev-spike
Epic: E2
Slice goal: `uv run priority digest` calls Inkling and prints a RunDigest that validates, and the next stop brief of the same session carries it as `previous`.
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

## Regression check
- All tests that passed before this slice must still pass.
- Files outside `priority-dev/` must remain unchanged, except the committed reports named in the slice.

## Out of scope — do not penalise
- Behaviour that belongs to a later slice of the plan.
- The policy, the actuator, the attention queue, and the notifier.
