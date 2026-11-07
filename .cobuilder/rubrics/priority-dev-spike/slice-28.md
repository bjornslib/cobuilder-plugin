# Rubric: Slice 28 — Proposer prompt and reference material

Feature: priority-dev-spike
Epic: E8
Slice goal: `priority optimise --proposer v2` gives the reflection model a new base prompt, `GENERAL_RULES` as additional instructions, a schema reference built from the code, and a 6000-character limit. `--proposer v1` keeps the E7 proposer. The run prints the proposer, and each reflection file records it.
Test command: `uv run --project priority-dev pytest priority-dev/tests -q`

## Criteria

### C1 — v2 passes all four settings [CRITICAL]
**Must be true:** With a stub `InstructionProposer`, v2 passes `base_instructions=PROPOSER_BASE`, `additional_instructions=GENERAL_RULES`, one skills text from `proposer_reference()`, and `max_chars=6000`. v1 passes only `additional_instructions=GENERAL_RULES`. The schema guard and the trainset-detail check apply to both.
**Evidence to check:**
- Run the slice tests and read what they capture.
**Scoring:**
- 1.0 — all four settings for v2, v1 unchanged, guard and check on both
- 0.5 — one setting missing or v1 changed
- 0.0 — no v2

### C2 — The base prompt and the reference say the right things [CRITICAL]
**Must be true:** `PROPOSER_BASE` tells the reflection model to keep the current instruction and change only what the examples show, to change a rule only for a failure in 2 or more examples, to fix the lowest scores first and keep what scores 1.00, to write general rules, and to end with one line on what changed. It does not ask for niche or domain facts. `proposer_reference()` names every output field of `ProposeStop` and every step kind, is built from the code, and holds no trainset option label.
**Evidence to check:**
- Read `PROPOSER_BASE` and the printed `proposer_reference()` text. Judge the wording yourself; the tests check structure only.
- Run the reference test on a made-up trainset.
**Scoring:**
- 1.0 — all points present, reference complete and clean
- 0.5 — one point missing
- 0.0 — the dspy base prompt still asks for niche facts

### C3 — The run shows which proposer ran
**Must be true:** `priority optimise` prints `proposer: v1` or `proposer: v2` before the compile, and each `reflection-NNN.json` has a `proposer` field.
**Evidence to check:**
- Run the optimise test on made-up fixtures with a stub GEPA.
**Scoring:**
- 1.0 — printed and recorded
- 0.5 — one of the two
- 0.0 — neither

## Regression check
- All tests that passed before this slice still pass, apart from tests that this slice's RED role rewrote for the new contract.
- `uv run shared/habit_smells.py --repo priority-dev --branch HEAD` reports no new finding in a file this slice touched.
- Files outside the slice scope stay unchanged: the task model prompt, the judge, the references.

## Out of scope — do not penalise
- Whether v2 scores better (slice 31).
