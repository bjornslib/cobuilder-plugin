Kind: test-suite

# Rubric: Slice 2 — Full contract suite on the fake adapter

Feature: beads-storage
Epic: E1
Slice goal: Contract cases 1 to 6 pass on the fake adapter, and a write with no configured adapter exits 2.
Test command: `uv run pytest tests/test_tracker_contract.py -q && uv run pytest tests -q`

## Criteria

### C1 — Contract cases 1 to 6 all pass [CRITICAL]
**Must be true:** the six contract tests run on the fake adapter, and each one passes.
**Evidence to check:**
- `uv run pytest tests/test_tracker_contract.py -q` reports six passing contract tests and no failures.
- Each contract case has its own test function: next-ready exclusion, next-ready by kind, claim read-back, envelope round trip, pull-request blocking, and write without adapter.
**Scoring:**
- 1.0 — six tests pass, one for each case.
- 0.5 — all tests pass, but one case has no test of its own.
- 0.0 — any case fails or is missing.

### C2 — Next-ready excludes pull requests and deferred epics [CRITICAL]
**Must be true:** `next_ready("epic")` never returns a pull request, and never returns an epic that has an envelope `deferred` key.
**Evidence to check:**
- Run the fake adapter in a short script with the fixture corpus. Print the ids that `next_ready("epic")` returns.
- The printed ids exclude `pr-101` and `demo-E3`.
**Scoring:**
- 1.0 — neither excluded id appears in the output.
- 0.0 — either excluded id appears.

### C3 — The pull request blocks two epics until it merges [CRITICAL]
**Must be true:** before `set_pull_request_state("pr-101", merged=True)`, neither `demo-E1` nor `demo-E2` is ready. After the call, both are ready.
**Evidence to check:**
- Run the fake adapter in a short script. Call `next_ready("epic")` before and after the merge call.
- Compare the two id lists.
**Scoring:**
- 1.0 — the first list excludes both epics, and the second list includes both.
- 0.5 — the epics change state, but one of them is wrong.
- 0.0 — the state does not change, or the excluded epics appear before the merge.

### C4 — A write with no configured adapter exits 2 [CRITICAL]
**Must be true:** with no `.cobuilder/tracker.yaml`, a write call exits 2 and changes no file under the repo.
**Evidence to check:**
- Run `uv run shared/tracker.py set-slice-state demo-E1-s3 closed` in a directory with no `.cobuilder/tracker.yaml`.
- Record the exit code. Compare `git status --porcelain` before and after the run. The output does not change.
**Scoring:**
- 1.0 — exit code 2, and no change to the working tree.
- 0.0 — any other exit code, or any changed file.

### C5 — The fake write stays in memory
**Must be true:** a write on the fake adapter changes only the in-memory state. The corpus files on disk do not change.
**Evidence to check:**
- Hash the four corpus files before and after a `claim_slice` call on a fake adapter in a script.
- The hashes match.
**Scoring:**
- 1.0 — the hashes match.
- 0.0 — any corpus file changed.

## Regression check
- The tracer test from slice 1 still passes (`uv run pytest tests/test_tracker_projector.py -q`).
- No existing test under `tests/` fails after this slice (`uv run pytest tests -q`).

## Out of scope — do not penalise
- The files adapter (slice 3).
- The command-line output format and the exit codes 0, 3, and 4 (slice 4).
- The beads adapter and the projector parity with beads (E2 slice 6).
