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
**Must be true:** given a transcript whose last assistant record has model `<synthetic>`, the brief picks the last real agent message as the stop and holds the client text in a `CLIENT MESSAGE:` section with stop source `client_error`. A transcript with only synthetic assistant records gives an Abstain `no_agent_reply`. After a bare human ask such as `continue`, the RUN section still shows the work before it, with no line limit, and with human asks as `[human]` lines.
**Evidence to check:**
- Run the brief builder on three made-up fixtures: a client error after a real reply, only synthetic records, and a bare `continue` after earlier work.
- Compare each output to its stored snapshot, and read the stop source.
**Scoring:**
- 1.0 — all three fixtures give the stated result.
- 0.5 — two of the three give it.
- 0.0 — a synthetic record becomes the stop, or the run is empty although work precedes it.

### C7 — Nothing is clipped, and an over-budget brief fails closed [CRITICAL]
**Must be true:**
- The brief builder is plain code. It makes no model call. It never cuts text at a character count and never shrinks text.
- Below the size budget of 160,000 characters of brief text (the instruction block does not count), the brief holds every item of the run in order, with no cap on RUN lines. Redaction is the only change to the text.
- Never clipped, in any brief: the human ask, the final reply (all text blocks of the last agent message), the last three exchanges (each tool call input and its full result, with the error flag), the `CLIENT MESSAGE:` section, and the human lines after the last agent message.
- Over the budget, the builder returns the Abstain `brief_too_large`. Its detail lists the tool inputs and tool results of older exchanges by size, largest first, with the size of each and the size of the parts that never shrink.
- When the parts that never shrink exceed the budget alone, the Abstain says so, and it is final.
**Evidence to check:**
- Build the brief from five made-up fixtures: a final reply of 5,000 characters; a 2,600-character tool call with a 50,000-character result, below the budget; an over-budget run with large older inputs and results; a run whose protected parts alone exceed the budget; and a long run of more than 100 RUN lines below the budget.
- Compare each output to its stored snapshot. Search each brief for a cut such as `...` at a fixed length. Run the builder with a model stub that fails the test when it is called.
**Scoring:**
- 1.0 — the below-budget fixtures keep their text byte for byte (redaction apart), both over-budget fixtures give `brief_too_large` with the right detail, and the stub is never called.
- 0.5 — the protected items stay whole, but the Abstain detail is missing or wrong.
- 0.0 — any protected item is cut, any text is cut at a fixed length below the budget, or the builder calls a model.

## Regression check
- All tests that passed before this slice must still pass.
- Files outside `priority-dev/` must remain unchanged, except the committed reports named in the slice.

## Out of scope — do not penalise
- Behaviour that belongs to a later slice of the plan.
- The policy, the actuator, the attention queue, and the notifier.
