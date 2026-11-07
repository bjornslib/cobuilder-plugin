# Rubric: Slice 29 — Reference and structural diff in the feedback

Feature: priority-dev-spike
Epic: E8
Slice goal: With `--proposer v2`, the feedback of each stop holds the score line, the judge notes, a `Structure:` block from `structure_diff`, and a `Reference:` block with the reference answer. With v1, the feedback is the E7 feedback. The score value does not change.
Test command: `uv run --project priority-dev pytest priority-dev/tests -q`

## Criteria

### C1 — The structural diff is correct [CRITICAL]
**Must be true:** `structure_diff(reference, prediction)` reports differences in `status`, `needs_human`, `priority`, the step kinds (missing, extra), and for `ask_human` the role, the number of questions, and per question the number of options, `multi_select`, `free_text`, whether `agent_recommendation` names one option, and the help kinds; `proof.kind` of `continue_until`; `scope` of `approve_permission`; empty required fields. It writes `structure: matches` when equal and `no output: the reply did not parse` for a parse failure.
**Evidence to check:**
- Run the table test of made-up pairs and read its cases.
**Scoring:**
- 1.0 — every listed difference tested
- 0.5 — one kind of difference untested
- 0.0 — no table test

### C2 — The diff holds no payload text [CRITICAL]
**Must be true:** No text value of the reference payload (option labels, questions, excerpts, reply text, goals, commands) appears in the diff lines.
**Evidence to check:**
- Run the privacy test; read the diff code for any string copied from the payload.
**Scoring:**
- 1.0 — tested and none found
- 0.0 — any text copied

### C3 — The feedback order and the v1 path
**Must be true:** With v2, `gepa_feedback` returns the score line, the judge notes, `Structure:`, and `Reference:`, in that order, and the score value is unchanged. With v1 the feedback has neither block. `plain_score` and `priority eval` are unchanged.
**Evidence to check:**
- Run the feedback tests.
**Scoring:**
- 1.0 — order, v1 path, and unchanged score tested
- 0.5 — one untested
- 0.0 — the score value changed

## Regression check
- All tests that passed before this slice still pass, apart from tests that this slice's RED role rewrote for the new contract.
- `uv run shared/habit_smells.py --repo priority-dev --branch HEAD` reports no new finding in a file this slice touched.
- Files outside the slice scope stay unchanged: the judge, the references, the task model prompt.

## Out of scope — do not penalise
- How often the trainset-detail check rejects a proposal (slice 30).
