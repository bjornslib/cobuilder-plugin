# Rubric: Slice 23 — Whole proposals from the reflection model

Feature: priority-dev-spike
Epic: E7
Slice goal: An optimiser run on made-up fixtures saves a proposal longer than 4000 characters unchanged. `priority optimise` prints the reflection model id, which comes from the `REFLECTION_*` settings (default NVIDIA Mistral), and a judge set to Mercury 3 leaves it unchanged. Closes gaps 1 and 6.
Test command: `uv run --project priority-dev pytest priority-dev/tests -q`

## Criteria

### C1 — No proposal is cut [CRITICAL]
**Must be true:** A stub reflection reply with a body of more than 4000 characters reaches the saved candidate instruction whole, followed by one schema guard. No length cap or cut remains in `gepa_proposer.py`.
**Evidence to check:**
- Run the slice test with a 6000-character stub proposal.
- Grep `gepa_proposer.py` for `MAX_PROPOSAL_CHARS`, `_cap_draft`, and any slice of the draft text.
**Scoring:**
- 1.0 — the long body is kept whole with one guard, and no cut code remains
- 0.5 — kept whole but the guard repeats, or dead cut code remains
- 0.0 — the body is still cut

### C2 — The reflection model has its own settings [CRITICAL]
**Must be true:** `_reflection_lm()` builds its model only from `REFLECTION_PROVIDER`, `REFLECTION_MODEL`, `REFLECTION_BASE_URL`, and `REFLECTION_API_KEY` (else the provider key). The default is `nvidia_nim/mistralai/mistral-large-4-1t-a52b` at the NVIDIA base URL. With `JUDGE_PROVIDER=inception` and `JUDGE_MODEL=mercury-3` set, the reflection model stays the default. The suite key stub still blocks a real key.
**Evidence to check:**
- Run `tests/test_judge_model.py` and the slice tests with an empty env file.
- Read `config.py` and `optimise._reflection_lm`.
**Scoring:**
- 1.0 — defaults, overrides, and the judge-independence case all pass
- 0.5 — settings exist but one case (override or judge independence) is untested
- 0.0 — the reflection model still follows the judge settings

### C3 — The run names its reflection model
**Must be true:** `priority optimise --optimiser gepa` prints one line `reflection model: <model id>` before the compile.
**Evidence to check:**
- Run the optimise CLI test on made-up fixtures with a stub GEPA and capture the output.
**Scoring:**
- 1.0 — the line is printed with the id
- 0.5 — the id is printed only in a log file
- 0.0 — no id is printed

### C4 — RED failed before GREEN
**Must be true:** The slice tests failed on assertions before the draft patch was applied, as `04-slices.md` note 8 requires.
**Evidence to check:**
- Read the RED report in the slice evidence, or check out the parent commit of the slice and run the new tests.
**Scoring:**
- 1.0 — the RED failure is recorded on assertions
- 0.5 — RED failed on an import error only
- 0.0 — no evidence that the tests ever failed

## Regression check
- All tests that passed before this slice still pass, apart from tests that this slice's RED role rewrote for the new contract.
- `uv run shared/habit_smells.py --repo priority-dev --branch HEAD` reports no new finding in a file this slice touched.
- Files outside the slice scope stay unchanged: the judge, the metric value, `interpreter/module.py` behaviour from slice 22

## Out of scope — do not penalise
- The general-rule guidance (slice 24).
- Any live model run.
- The valset and minibatch sizes (slice 27).
