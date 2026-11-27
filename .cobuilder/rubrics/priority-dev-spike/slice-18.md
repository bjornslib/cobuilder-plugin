# Rubric: Slice 18 — Optimiser comparison

Feature: priority-dev-spike
Epic: E5
Slice goal: `priority optimise --optimiser gepa` and `--optimiser miprov2` compile the chosen interpreter on the train sessions only, and `probes/optimiser-report.md` gives the held-out score before and after for each, with BootstrapFewShot as the cheap baseline, the cost of each run, and the saved programs.
Test command: `uv run --project priority-dev pytest priority-dev/tests -q`

## Criteria

### C1 — Optimisers see only the train sessions [CRITICAL] [CRITICAL]
**Must be true:** the training set holds no stop of a held-out session, and the validation data used inside an optimiser comes from the train sessions. A test fails when a held-out stop enters the training set.
**Evidence to check:**
- Read the loader and run its test.
- Check the stored optimiser inputs by script.
**Scoring:**
- 1.0 — no held-out stop reaches any optimiser
- 0.5 — no stop reaches the training set, but the inner validation set is unchecked
- 0.0 — a held-out stop reaches an optimiser

### C2 — Both optimisers and the baseline ran with the stated settings [CRITICAL] [CRITICAL]
**Must be true:** GEPA, MIPROv2, and BootstrapFewShot each ran once on the same train set, and the report states each setting (the budget, the number of candidates, the seed, and the reflection model for GEPA).
**Evidence to check:**
- Read the report and the saved run files.
**Scoring:**
- 1.0 — all three ran and the settings are stated
- 0.5 — two ran, or a setting is missing
- 0.0 — one ran

### C3 — The held-out score before and after is reported with the spread
**Must be true:** for each optimiser the report gives the held-out score before and after, the spread of repeats from slice 16, and says whether the change is outside the spread. It claims no gain that is inside it.
**Evidence to check:**
- Recompute one held-out score from the call rows.
**Scoring:**
- 1.0 — stated, recomputed, and honest about the spread
- 0.5 — stated, but no statement on the spread
- 0.0 — a claimed gain inside the spread, or no scores

### C4 — The cost of each run and the saved programs are recorded
**Must be true:** the report gives the calls, the characters, and an estimated cost of each optimiser run, and the compiled programs are saved as files that `eval` can load.
**Evidence to check:**
- Load one saved program with `eval --program`.
**Scoring:**
- 1.0 — all stated and a program loads and runs
- 0.5 — stated, but a program does not load
- 0.0 — cost missing

### C5 — The report names the limits and the abort condition
**Must be true:** the report states the size of the held-out set, that GEPA may win only because the data is small, and which `abort_if` condition it informs, with held, refuted, or not measured.
**Evidence to check:**
- Read the report.
**Scoring:**
- 1.0 — all three present
- 0.5 — two present
- 0.0 — one or none

## Regression check
- All tests that passed before this slice must still pass.
- Files outside `priority-dev/` must remain unchanged, except the committed reports named in the slice.

## Out of scope — do not penalise
- Behaviour that belongs to a later slice of the plan.
- The policy, the actuator, the attention queue, and the notifier.
- Real transcript text is private. A report that quotes none of it is correct.
