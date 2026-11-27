# Rubric: Slice 22 — Complete reflection evidence

Feature: priority-dev-spike
Epic: E7
Slice goal: An optimiser run on made-up fixtures with stub models keeps its reflection prompts and candidate stats on disk. In the saved prompt, each stop that failed to parse shows its raw reply, the validation error, the judge note, and the score 0, and every other stop shows its score. Closes gaps 2, 3, and 7.
Test command: `uv run --project priority-dev pytest priority-dev/tests -q`

## Criteria

### C1 — A failed stop reaches the reflection model [CRITICAL]
**Must be true:** In a GEPA run with a stub task model whose reply for one minibatch stop does not parse or validate, the reflective dataset for `propose` holds an example for that stop. Its generated outputs hold the raw reply and the validation error text, and its feedback holds the abstain note. The abstain prediction that the eval path sees is unchanged (`invalid_output`, score 0).
**Evidence to check:**
- Run the slice tests; find the test that builds the reflective dataset through DSPy's own `make_reflective_dataset` (or a full stub GEPA run), not a hand-built dict.
- Read `interpreter/module.py`: the trace entry is added only on a parse or validation failure, and only when a trace list is active.
- Run the eval tests: an invalid reply still gives `gate=invalid_output` and score 0.
**Scoring:**
- 1.0 — the failed stop is in the reflective dataset with raw reply, error text and abstain note, through DSPy's real code path, and the eval path is unchanged
- 0.5 — the stop is present but one of raw reply, error text, or abstain note is missing, or only a hand-built dataset is tested
- 0.0 — a failed stop is still dropped, or the eval path changed

### C2 — Every feedback carries the score [CRITICAL]
**Must be true:** Each GEPA feedback text starts with the numeric score of the stop (for example `Score: 0.40 of 1.00.`), followed by the notes. The numeric `score` value returned to GEPA is the same as before the slice.
**Evidence to check:**
- Run the slice tests for `gepa_feedback` with a stub judge at two scores, including an abstain at 0.
- Compare `score` with `metric.score` for the same input.
**Scoring:**
- 1.0 — all feedback starts with the score and the score value is unchanged
- 0.5 — the score is in the feedback but not first, or one case (abstain or normal) lacks it
- 0.0 — no score in the feedback, or the score value changed

### C3 — The optimiser run keeps its evidence on disk
**Must be true:** `priority optimise --optimiser gepa` writes a log dir (default under `probes/programs/`, which Git ignores; `--gepa-log-dir` overrides it). It holds one `reflection-<NNN>.json` per reflection call with the current instruction, the reflective dataset, and the proposal, plus `candidates.json` with each candidate's instruction, parents, valset score, and the best index. GEPA gets `track_stats=True` and a `log_dir`.
**Evidence to check:**
- Run the optimise tests with a stub GEPA or a stub reflection model on made-up fixtures; list the log dir.
- Run `git check-ignore` on the default log dir path.
**Scoring:**
- 1.0 — both file kinds exist with those fields, the default path is ignored by Git, and the override works
- 0.5 — files exist but a field is missing, or the override is absent
- 0.0 — no log files, or the default path is tracked by Git

### C4 — No live call and no private data in tests
**Must be true:** The slice tests use made-up fixtures and stub models only. No test reads `fixtures/real/` or a real key.
**Evidence to check:**
- Grep the new test files for `fixtures/real` and for key names.
- Run the suite with no network.
**Scoring:**
- 1.0 — no real data, no key, no network
- 0.5 — a test reads real data but skips without it
- 0.0 — a test needs a key or a network

## Regression check
- All tests that passed before this slice still pass, apart from tests that this slice's RED role rewrote for the new contract.
- `uv run shared/habit_smells.py --repo priority-dev --branch HEAD` reports no new finding in a file this slice touched.
- Files outside the slice scope stay unchanged: the judge, the references, `brief/`, `signatures.py`, `config.py`

## Out of scope — do not penalise
- The 4000-character cut and the reflection model settings (slice 23).
- The general-rule guidance and the `agent_recommendation` example (slice 24).
- Any live model run.
