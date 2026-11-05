# Rubric: Slice 25 — Compact stop brief

Feature: priority-dev-spike
Epic: E7
Slice goal: First, a digest report on Mercury 3 covers at least three human-chat training sessions with three or more stops each. It shows a valid `RunDigest` per stop, `PREVIOUS RUN:` in each later brief, a filled `HUMAN ASKED:`, and one shrink call. Then `priority eval --brief compact` builds each stop brief from the human message, the digest of the run, and the final reply, and a report gives the size of both brief forms per stop and the arm A score on the test set for both forms. Answers gap 10.
Test command: `uv run --project priority-dev pytest priority-dev/tests -q`

## Criteria

### C1 — The digest works across real stops on Mercury 3 [CRITICAL]
**Must be true:** `probes/compact-brief-report.md` lists at least 3 human-chat training sessions (not worker or launch-prompt sessions) with 3 or more stops each. Per stop: the digest was valid (or the abstain reason), the model id from the call log, and whether the brief of each later stop carried `PREVIOUS RUN:` from the stop before. Every brief has a non-empty `HUMAN ASKED:` section, or the report names the cause and the builder fix. One shrink call on Mercury 3 is reported with its input and output sizes.
**Evidence to check:**
- Read the report and the call logs it names (Git-ignored run folder).
- Run the digest report script's tests with a stub model to see that it computes those columns.
**Scoring:**
- 1.0 — all four facts for 3+ sessions, model id from the logs, one shrink
- 0.5 — fewer than 3 sessions, or one fact missing
- 0.0 — no live digest evidence

### C2 — The compact brief form exists [CRITICAL]
**Must be true:** `StopBrief` renders a compact text with `HUMAN ASKED:`, the digest of the run, `FINAL REPLY:`, any `CLIENT MESSAGE:`, and the human lines after the stop, and no run items. `priority eval --brief compact --digest-dir DIR` makes one digest call per stop, caches it, reuses the cache on a second run, and passes the compact text to the task model. `--brief full` (the default) is unchanged.
**Evidence to check:**
- Run the slice tests with a stub digest model and a stub task model; count digest calls on two runs.
- Check that the default eval output on made-up fixtures is unchanged.
**Scoring:**
- 1.0 — render, cache, reuse, and default unchanged all tested
- 0.5 — works but the cache is not reused or not tested
- 0.0 — the form is missing or the default changed

### C3 — The report compares both forms on the test set [CRITICAL]
**Must be true:** The report gives, per test-set stop, the character size of the full and the compact brief, and the arm A score on the 56 test-set stops for each form, with the paired difference and its interval (bootstrap over sessions), and per test set. It states the chosen form for slices 26 and 27 and why. It quotes no private text.
**Evidence to check:**
- Read the report and the eval outputs it names; recompute the means from the per-stop rows.
- Grep the report for transcript or reference text.
**Scoring:**
- 1.0 — sizes, both scores, interval, choice, and no private text
- 0.5 — scores without the interval, or sizes as totals only
- 0.0 — no score for one form, or private text

### C4 — No private data committed
**Must be true:** Digests, call logs and eval rows sit under `priority-dev/fixtures/real/` or another Git-ignored path. The committed report holds numbers and session id prefixes only.
**Evidence to check:**
- `git status` and `git check-ignore` on the run folders; read the committed files.
**Scoring:**
- 1.0 — all private output ignored
- 0.5 — one ignored path is unclear
- 0.0 — private output is tracked

## Regression check
- All tests that passed before this slice still pass, apart from tests that this slice's RED role rewrote for the new contract.
- `uv run shared/habit_smells.py --repo priority-dev --branch HEAD` reports no new finding in a file this slice touched.
- Files outside the slice scope stay unchanged: the judge, the references, the optimiser

## Out of scope — do not penalise
- Using the compact brief inside an optimiser run (slices 26 and 27).
- Tuning the digest prompt.
