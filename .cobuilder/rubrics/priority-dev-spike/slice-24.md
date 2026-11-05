# Rubric: Slice 24 — General instructions only

Feature: priority-dev-spike
Epic: E7
Slice goal: The rendered `ProposeStop` prompt shows an example with a non-null `agent_recommendation`. The reflection model is told to write general rules, and a proposal that quotes an option label or a file name from a trainset reference is rejected with a printed reason. Closes gaps 8 and 9.
Test command: `uv run --project priority-dev pytest priority-dev/tests -q`

## Criteria

### C1 — The prompt example has a recommendation [CRITICAL]
**Must be true:** The `ask_human` example in the `ProposeStop` instruction has an `agent_recommendation` that is an exact label of one of its options. The rendered system message that the chat adapter builds holds no `"agent_recommendation": null`.
**Evidence to check:**
- Render `ChatAdapter().format(ProposeStop, [], {'brief_text': 'x'})` in a test and search it.
**Scoring:**
- 1.0 — non-null and an exact option label, checked in the rendered prompt
- 0.5 — non-null but not an option label, or checked only in the docstring
- 0.0 — still null

### C2 — The reflection model is told to write general rules
**Must be true:** The instruction proposer passes guidance to the reflection model that it must write rules that hold for any session, and must not quote option labels, file names, commands, or session details from the examples.
**Evidence to check:**
- Run the slice test that captures the reflection call with a stub reflection model, and read the prompt it got.
**Scoring:**
- 1.0 — the guidance is in the captured reflection prompt
- 0.5 — the guidance exists but is not shown to reach the prompt
- 0.0 — no guidance

### C3 — Trainset detail is rejected [CRITICAL]
**Must be true:** The trainset-detail check collects each option label of 3 or more words and each file name with an extension from the trainset references. A proposal that quotes one of them (case-insensitive) is rejected: the run prints a reason with counts only, no label text, and the mutation adds no candidate. A proposal with no such detail is accepted. Test-set references never enter the check.
**Evidence to check:**
- Run the slice tests with stub proposals: one quoting a 3-word trainset label, one quoting a trainset file name, one clean.
- Check the printed reason for label text.
- Check that the blocked set is built from train examples only.
**Scoring:**
- 1.0 — both rejections, the clean pass, counts-only reason, train only
- 0.5 — rejection works but the reason prints label text, or one kind is not checked
- 0.0 — no rejection, or test-set references feed the check

### C4 — Arm A prompt change is recorded
**Must be true:** `probes/optimiser-report.md` or the plan notes that slice 24 changed the arm A prompt, so earlier arm A numbers are not comparable.
**Evidence to check:**
- Grep the report and `04-slices.md`.
**Scoring:**
- 1.0 — recorded with the reason
- 0.5 — recorded without the reason
- 0.0 — not recorded

## Regression check
- All tests that passed before this slice still pass, apart from tests that this slice's RED role rewrote for the new contract.
- `uv run shared/habit_smells.py --repo priority-dev --branch HEAD` reports no new finding in a file this slice touched.
- Files outside the slice scope stay unchanged: the judge, the metric, `brief/`, `config.py`

## Out of scope — do not penalise
- The cut repair of the C2 seed copy (slice 27).
- Any live model run.
