# Rubric: Slice 4 — Stop brief

Feature: priority-dev-spike
Epic: E2
Slice goal: `uv run priority brief fixtures/run-3.jsonl --stop 2` prints a stop brief that equals the stored snapshot, with grouped replies, paired results, and redacted keys.
Test command: `uv run pytest priority-dev/tests -q`

## Criteria

### C1 — The brief equals the stored snapshot [CRITICAL]
**Must be true:** the printed brief for the fixture equals `tests/snapshots/run-3-stop-2.json` after `json.loads`.
**Evidence to check:**
- Run the command and compare.
**Scoring:**
- 1.0 — equal.
- 0.5 — equal except for field order that the snapshot does not fix.
- 0.0 — different.

### C2 — Replies group by message id, and a duplicate id is handled [CRITICAL]
**Must be true:** several records with one `message.id` give one reply, and a fixture with a duplicated id gives no duplicated text.
**Evidence to check:**
- Run the brief tests on the fixtures.
- Read the duplicate-id fixture.
**Scoring:**
- 1.0 — both cases pass.
- 0.5 — the grouping passes, and the duplicate case is missing.
- 0.0 — the grouping fails.

### C3 — Each tool call pairs with its full result, and the error flag stays
**Must be true:** each tool call holds the full result text and `is_error` from the record with the same `tool_use_id`. No result is clipped.
**Evidence to check:**
- Run the pairing test.
- Compare the result length in the brief to the fixture record.
**Scoring:**
- 1.0 — the pairing test passes and the lengths match.
- 0.5 — pairing holds, but one result is clipped.
- 0.0 — a call has no result, or the flag is lost.

### C4 — A planted secret is redacted before any model call [CRITICAL]
**Must be true:** a fixture with a planted fake key shows `[redacted]` in the brief, and the redaction count is stored.
**Evidence to check:**
- Run the redaction test.
- Search the brief output for the planted value.
**Scoring:**
- 1.0 — the value is absent and the count is right.
- 0.5 — the value is absent, but the count is wrong.
- 0.0 — the value appears.

### C5 — The report names the abort condition it informs
**Must be true:** the report states which `abort_if` condition of `goal.json` it informs, and gives a plain result: held, refuted, or not measured.
**Evidence to check:**
- Read the report named in the slice goal.
- Find the sentence that names the condition and the result.
**Scoring:**
- 1.0 — the sentence exists and the result matches the raw logs.
- 0.5 — the sentence exists, but the result is vague or the logs are missing.
- 0.0 — no such sentence.

### C6 — A client message never becomes the stop, and the run is never empty by accident [CRITICAL]
**Must be true:** given a transcript whose last assistant record has model `<synthetic>`, the brief picks the last real agent message as the stop and holds the client text in a `CLIENT MESSAGE:` section with stop source `client_error`. A transcript with only synthetic assistant records gives an Abstain `no_agent_reply`. After a bare human ask such as `continue`, the RUN section still shows the work before it, up to 40 lines, with human asks as `[human]` lines.
**Evidence to check:**
- Run the brief builder on three made-up fixtures: a client error after a real reply, only synthetic records, and a bare `continue` after earlier work.
- Compare each output to its stored snapshot, and read the stop source.
**Scoring:**
- 1.0 — all three fixtures give the stated result.
- 0.5 — two of the three give it.
- 0.0 — a synthetic record becomes the stop, or the run is empty although work precedes it.

## Regression check
- All tests that passed before this slice must still pass.
- Files outside `priority-dev/` must remain unchanged, except the committed reports named in the slice.

## Out of scope — do not penalise
- Behaviour that belongs to a later slice of the plan.
- The policy, the actuator, the attention queue, and the notifier.
