# Rubric: Slice 20 — Reference payloads and judge validation

Feature: priority-dev-spike
Epic: E6
Slice goal: The judge scores the payload only, against engineer-confirmed reference payloads drafted from the brief only. Two missing-payload rules hold. The eval path passes the payloads to the judge. An agreement bar runs before any result counts. Judge use is metered. Every arm is rescored, and the holdout duel reports a paired cluster bootstrap CI.
Test command: `uv run --project priority-dev pytest priority-dev/tests -q`

## Criteria

### C1 — The judge sees payloads only [CRITICAL]
**Must be true:** the judge receives the brief text, the predicted step list, and the reference step list. It never receives the five facts or the step-kind labels. `session_id`, `author`, `confidence`, and `evidence_quote` are removed from both sides before the judge call. The rubric text tells the judge to grade only the fields that the reference states, to ignore question order, and to compare closed fields exactly. A reference given as one step dict is treated as a one-item list.
**Evidence to check:**
- Run the judge input tests with a stub judge that records its arguments.
- Read `judge.py` and `metric.py` for any facts or label steps passed to the judge.
**Scoring:**
- 1.0 — recorded judge input holds no facts, no label steps, no code-set fields, and the rubric holds the three instructions.
- 0.5 — facts gone but a code-set field or the dict-to-list case is missing.
- 0.0 — facts or label steps still reach the judge.

### C2 — Missing and unwanted payloads score 0 with named notes [CRITICAL]
**Must be true:** a reference with steps and a candidate with none scores 0, and the note names the candidate's triage status. A reference `[]` and a candidate with steps scores 0, and the note names the candidate's step kinds. Both empty scores 1. Any abstain scores 0 with its reason named. None of these cases calls the judge. With no judge model reachable, a stop with both sides non-empty scores 0 with the stub note, and no legacy facts-and-steps score runs.
**Amended 31 October 2026:** the engineer changed the contract in slice 21. The judge now sees every stop, and code only pins the score in these cases. Score "None of these cases calls the judge" against the code before slice 21, at commit `5bd53bc`. After slice 21, the slice 21 rubric C3 governs.
**Evidence to check:**
- Run the rule tests. Each case asserts the score, the note content, and that the stub judge was not called.
- Grep `metric.py` for `components(` inside `score`.
**Scoring:**
- 1.0 — all five cases hold and the legacy fallback is gone from `score`.
- 0.5 — the two rules hold but one other case or the fallback removal fails.
- 0.0 — either rule skips, scores non-zero, or calls the judge.

### C3 — The eval path carries payloads and excludes unreferenced stops [CRITICAL]
**Must be true:** `to_prediction` returns a `payloads` list built from the proposal steps, and `[]` when there is no advice. The runner and optimise build no example for a stop whose label has no `payloads` field, and each prints how many stops it excluded. A stop with `payloads: []` is kept.
**Evidence to check:**
- Run the runner and optimise tests on made-up fixtures with one referenced, one `[]`, and one unreferenced stop.
- Read one per-stop line and the exclusion count line.
**Scoring:**
- 1.0 — payloads reach the judge from the runner, the unreferenced stop is excluded and counted in both paths, and `[]` stays.
- 0.5 — one path excludes, the other does not.
- 0.0 — the runner still drops payloads.

### C4 — `priority judge-check` computes three pre-set bars [CRITICAL]
**Must be true:** the command reads a pairs file and the labels, judges each side twice, and prints the human agreement (bar 0.75, at least 6 pairs), the closed-field probe rate (bar 0.90, copies with multi_select, role, or one option label changed), and the repeat flip rate (bar 0.10). It prints `agreement bar: pass` or `agreement bar: fail` and exits 1 on a fail. Fewer than 6 picked pairs is a fail.
**Evidence to check:**
- Run the command tests with stub judges that agree, disagree, and flip.
- Check that the probe copies differ from the reference in exactly one closed field.
**Scoring:**
- 1.0 — all three bars, the pass and fail lines, the exit code, and the 6-pair floor hold.
- 0.5 — the bars compute but the exit code or the floor is wrong.
- 0.0 — the command is missing or a bar is not computed.

### C5 — Judge use is metered
**Must be true:** the judge counts its calls and its prompt and completion tokens when the model reports usage. `eval`, `optimise`, and `judge-check` print the totals.
**Evidence to check:**
- Run the metering test with a stub model that reports usage.
- Read the totals line in one live eval log.
**Scoring:**
- 1.0 — counts are right in the test and appear in a live log.
- 0.5 — counts appear but tokens stay 0 when usage is given.
- 0.0 — no metering.

### C6 — References drafted from briefs only and confirmed [CRITICAL]
**Must be true:** every stop of the fixture set, 67 train and 30 holdout, has a reference in the Git-ignored `labels-confirmed.json` under `payloads`. Done and continuing stops are not skipped. The drafter input held stop briefs, the payload shape, and the pilot references, and no seed output, candidate payload, call log, label file, or blind-pair file. The engineer confirmed each reference. No real text is committed.
**Evidence to check:**
- Count the referenced stops per split in `labels-confirmed.json`.
- Read the drafter task text and its tool calls for any read of `/tmp/vj-*`, `calls.jsonl`, `blind-pairs*`, or `probes/programs`.
- Run `git ls-files priority-dev/fixtures/real .lavish` for real text.
**Scoring:**
- 1.0 — counts met, drafter input clean, engineer confirmation recorded, nothing real tracked.
- 0.5 — up to 5 stops lack a reference, or confirmation is partial.
- 0.0 — a drafter saw a seed or candidate payload, or real text is tracked.

### C7 — Live runs reported as measured [CRITICAL]
**Must be true:** the agreement bar ran live and its output is saved. Every arm was scored twice under the new metric on the referenced stops. The holdout duel pairs base and the GEPA winner per stop, twice each, with a session-cluster bootstrap CI. `optimiser-report.md` states the numbers, the stop counts, the token totals, and whether the bar passed. When the bar fails, the report says that no arm result counts.
**Evidence to check:**
- Recompute one arm mean and the duel difference from the saved logs.
- Compare the report numbers with the logs.
**Scoring:**
- 1.0 — all runs present, numbers recompute, the bar outcome governs the claims.
- 0.5 — runs present but one number does not recompute or a count is missing.
- 0.0 — a claimed result has no log, or a failed bar is reported as a win.

## Regression check
- All tests that passed before this slice must still pass, except tests that pinned the removed legacy fallback or the facts-and-steps judge input.
- No test makes a live model call.
- Files outside `priority-dev/`, `docs/plans/priority-dev-spike/`, and `.gitignore` stay unchanged.

## Out of scope — do not penalise
- A judge model other than Mercury, and a stronger reflection LM.
- A cost in dollars.
- The policy, the actuator, the attention queue, and the notifier.
