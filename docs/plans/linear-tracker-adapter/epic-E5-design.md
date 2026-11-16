# Epic Technical Solution Design: E5 — The docs and the rules

Feature: linear-tracker-adapter
Epic ID: E5

## Scope and Intent

E5 documents the adapter and fixes the repo rules around it. It adds the adapter note, the config keys in the usage reference, the boundary entries, a grep guard, and the change to principle 7. E5 ends when the docs match the code and an agent that reads principle 7 treats the tracker call as allowed.

Out of scope: any code in the adapter, and the install offer (E7).

## Files Touched

New files:

- `shared/tracker-adapter-linear.md`: the config keys, the recommended Linear team settings, the proof rule for a close, and the release path of a crashed claim. A crashed session leaves a claim on a slice that is in progress, and only `set-slice-state <id> open` ends it. `doctor` lists held claims with their age.
- `tests/test_tracker_linear_boundary.py`: the grep guard.

Modified files:

- `shared/tracker-usage.md`: lists the Linear config keys, the `plan_changes` key, and the run of `sync` at session start. `tests/test_tracker_usage_doc.py` checks it.
- `docs/architecture/contexts/shared/boundary.yaml`: adds `linear*.py` to the `tracker-port` members and updates the rule.
- `CLAUDE.md`: principle 7 only. The engineer approved this change on 2026-11-03. The rule about `bd` stays as it is.

## Types & Signatures

No code. The grep guard asserts two facts:

```python
def test_no_linear_call_outside_the_adapter() -> None: ...   # a grep for "api.linear.app" and "LINEAR_API_KEY" finds only linear*.py and config.py
def test_no_key_in_the_repo() -> None: ...                   # a grep for a key pattern finds nothing
```

## Slice Decomposition

10. **The docs and the boundary match the code.** The adapter note, the usage keys, the boundary entries, and the guard. Depends on E4.
11. **Principle 7 allows the tracker call.** The edit of CLAUDE.md. This file steers an agent, so the evidence is one blind pass, not a test. Depends on slice 10.

## Test Plan

- Slice 10: `uv run pytest tests/test_tracker_usage_doc.py tests/test_tracker_linear_boundary.py -q` passes. `uv run shared/boundary_check.py --require` prints `shared: ok`. `uv run shared/prose_budget.py check` passes on the new note.
- Slice 11: one fresh subagent gets the changed CLAUDE.md and a task that needs a call to the Linear API. It must treat the call as allowed. A second task asks it to push a branch. It must ask first. The transcript goes into the slice evidence.

## Risks & Open Questions

- The adapter note names recommended Linear settings from the published schema. E6 checks that the key can read them.
- CLAUDE.md governs every session. The edit is small, but a loose word could widen the rule. The blind pass checks the push case.
