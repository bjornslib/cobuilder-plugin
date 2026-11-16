# Rubric: Slice 10 — The docs and the boundary match the code

Feature: `linear-tracker-adapter`
Epic: E5 — The docs and the rules
Slice goal: The adapter note, the usage keys, the boundary entries, and the grep guard exist and agree with the code.
Test command: `uv run pytest tests -q`

## Criteria

### C1 — The boundary and the guard pass [CRITICAL]

**Must be true:** `boundary.yaml` lists `linear*.py` in the `tracker-port` members. `boundary_check.py --require` prints `shared: ok`. The grep guard finds no Linear API call outside `linear*.py` and `config.py`, and no key in the repo.

**Evidence to check:**
- Run `uv run shared/boundary_check.py --require` and read the `shared` line.
- Run `uv run pytest tests/test_tracker_linear_boundary.py -q`.

**Scoring:**
- 1.0 — both pass
- 0.5 — the guard only
- 0.0 — the boundary lists no `linear*.py`

### C2 — The usage reference lists the Linear keys [CRITICAL]

**Must be true:** `shared/tracker-usage.md` lists `team`, `project`, `states`, `users`, and `plan_changes`. `tests/test_tracker_usage_doc.py` passes.

**Evidence to check:**
- Run `uv run pytest tests/test_tracker_usage_doc.py tests/test_tracker_docs.py -q`.
- Read the new entries.

**Scoring:**
- 1.0 — all keys listed and tests pass
- 0.5 — some keys missing
- 0.0 — a test fails

### C3 — The adapter note covers the settings and the release path

**Must be true:** `shared/tracker-adapter-linear.md` names the recommended team settings, the proof rule, and the manual release path `set-slice-state <id> open` for a crashed claim on a slice in progress. `prose_budget.py check` passes on it.

**Evidence to check:**
- Read the note.
- Run `uv run shared/prose_budget.py check shared/tracker-adapter-linear.md`.

**Scoring:**
- 1.0 — all three topics and the budget check pass
- 0.5 — a topic is missing
- 0.0 — the note is missing

## Regression check

- All tests that passed before this slice must still pass.
- Files outside the slice scope must remain unchanged. Protected scope: slices 1 to 9 tests.

## Out of scope — do not penalise

- the principle 7 edit and the install offer.
