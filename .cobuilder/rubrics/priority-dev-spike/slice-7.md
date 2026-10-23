# Rubric: Slice 7 — Replay report with failure drills

Feature: priority-dev-spike
Epic: E2
Slice goal: `uv run priority replay fixtures/` writes `report.md` with the rates, the abstain reasons, the kinds, and the cost for each stage, and each injected failure ends as an Abstain with a reason.
Test command: `uv run pytest priority-dev/tests -q`

## Criteria

### C1 — The report holds every listed measure for both adapters [CRITICAL]
**Must be true:** the report lists the valid-output rate, the quote-found rate, the abstain reasons, the kinds picked, the characters sent, the seconds, and the cost for each stage, for `JSONAdapter` and `ChatAdapter`.
**Evidence to check:**
- Run the replay on the local fixtures.
- Check each measure against the stored call rows.
**Scoring:**
- 1.0 — every measure is present and matches the rows.
- 0.5 — one measure is missing or does not match.
- 0.0 — several are missing.

### C2 — Four injected failures each end as an Abstain with a reason [CRITICAL]
**Must be true:** a 429, malformed JSON, an empty quote, and a timeout each give an Abstain with a logged reason, and none gives a crash or silence.
**Evidence to check:**
- Run the drill tests.
**Scoring:**
- 1.0 — all four pass.
- 0.5 — three pass.
- 0.0 — two or fewer pass.

### C3 — The free-tier limit count at the rate of 5 sessions is stated
**Must be true:** the report states how many limit errors came from a replay at the event rate of 5 sessions.
**Evidence to check:**
- Read the report and the raw logs.
**Scoring:**
- 1.0 — stated and matches the logs.
- 0.5 — stated, but with no logs.
- 0.0 — not stated.

### C4 — The go or no-go section names each abort condition [CRITICAL]
**Must be true:** the report ends with a section that names each `abort_if` condition and states held, refuted, or not measured.
**Evidence to check:**
- Read the last section.
**Scoring:**
- 1.0 — both conditions are named with a result.
- 0.5 — one is named.
- 0.0 — no section.

### C5 — The report names the abort condition it informs
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
