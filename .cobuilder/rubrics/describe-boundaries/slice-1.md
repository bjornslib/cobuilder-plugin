# Rubric: Slice 1 — E1: boundary_check.py, verified_at, bundle warning

Feature: describe-boundaries
Epic: E1
Slice goal: The script prints ok, stale, and uncovered for a temporary git repo and exits 1 under `--require`. The template and the describe procedure carry `verified_at`. `verify_bundle.py` warns `boundary.stale`.
Test command: uv run pytest tests -q --deselect tests/test_commands.py::test_odyssey_review_name_appears_nowhere_in_prose

## Criteria

### C1 — a current context reports ok [CRITICAL]
**Must be true:** In a temporary git repo, a context whose `boundary.yaml` has `verified_at` equal to a commit, and with no later commit under its `path`, prints status `ok`.
**Evidence to check:** run `uv run shared/boundary_check.py --repo <tmp>` on a repo you build yourself. Read the JSON.
**Scoring:** 1.0 `ok`. 0.5 `ok` only when `--paths` is given. 0.0 any other status.

### C2 — a later commit under the path makes it stale [CRITICAL]
**Must be true:** After one more commit that changes a file under the context `path`, the status is `stale`. A commit outside the `path` leaves it `ok`. A missing, empty, or unknown `verified_at` is `stale`, and the script does not crash.
**Evidence to check:** build the repo cases above and run the script. Pass a made-up sha.
**Scoring:** 1.0 all four cases. 0.5 stale works but a bad sha crashes. 0.0 stale is not detected.

### C3 — uncovered paths and the ignore list
**Must be true:** With `--paths`, a code path under no context `path` appears under `uncovered`. Paths under `docs/`, `tests/`, `.cobuilder/`, and `.cobuilder-architect/` never appear there. `--paths` also lists the contexts touched.
**Evidence to check:** run with `--paths src/new/x.py docs/a.md tests/t.py`.
**Scoring:** 1.0 correct. 0.5 uncovered works but an ignored path leaks. 0.0 no uncovered output.

### C4 — `--require` sets the exit code [CRITICAL]
**Must be true:** Without `--require` the script exits 0 and only reports. With `--require` it exits 1 when any touched context is stale or any path is uncovered, and 0 otherwise.
**Evidence to check:** run all four combinations and read `$?`.
**Scoring:** 1.0 all four. 0.5 one wrong. 0.0 no non-zero exit.

### C5 — `verified_at` is in the template and the describe procedure
**Must be true:** `boundary-template.yaml` has a `verified_at` field with a comment. `architecture-documentation.md` has a step that stamps it with `git rev-parse HEAD` after verification.
**Evidence to check:** `grep -n verified_at` in both files.
**Scoring:** 1.0 both. 0.5 one. 0.0 neither.

### C6 — verify_bundle warns on a stale context
**Must be true:** `shared/verify_bundle.py` emits a warning finding with id `boundary.stale` for a stale context. It does not turn a passing bundle into a failing one. A test covers it.
**Evidence to check:** run the new test. Run `uv run shared/verify_bundle.py --bundle-dir .cobuilder-architect/self` and compare the exit code with `git stash`-free baseline from the manifest.
**Scoring:** 1.0 warning, no failure, tested. 0.5 warning but no test. 0.0 absent, or the self bundle now fails.

### C7 — tests and the writing standard
**Must be true:** `tests/test_boundary_check.py` exists and passes. The full suite passes apart from the one deselected test. New prose uses no contractions and no semicolons.
**Evidence to check:** the test command. `uv run shared/skills/ste-writing/ste-lint.py` on the changed `.md` files.
**Scoring:** 1.0 all. 0.5 lint violations. 0.0 failing tests.

## Regression check
- All tests that passed before this slice must still pass.
- Files outside the slice scope must remain unchanged: design-mode.md, the odyssey files, the README.

## Out of scope — do not penalise
- Design mode and baseline calling the script. Slices 2 and 3 do that.
- A cap on how many districts baseline describes.
