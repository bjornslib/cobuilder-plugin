# Epic Technical Solution Design: E4 — Two authors

Feature: linear-tracker-adapter
Epic ID: E4

## Scope and Intent

E4 lets people and CoBuilder both author the plan. It adds the seen values, `sync` with `plan_changes`, the seed, and the skip of unplanned records in shared code. E4 ends when a change by a person shows at the next `sync`, and a second seed changes nothing.

Out of scope: a webhook, a push of changes, and a merge of the beads state.

## Files Touched

New files:

- `shared/tracker_port/linear_seen.py`: `seen_values`, `touch_seen`, and `compare_seen`.
- `shared/tracker_port/linear_seed.py`: `run_sync` and `run_seed`.
- `tests/test_tracker_linear_sync.py`: slice 8 assertions.
- `tests/test_tracker_linear_seed.py`: slice 9 assertions.

Modified files:

- `shared/tracker_port/linear_writes.py`: calls `touch_seen` in each write.
- `shared/tracker_port/linear.py`: `sync` and `seed_from_files` call `run_sync` and `run_seed`, and the class exposes `plan_changes`.
- `shared/tracker.py`: prints `plan_changes` after `sync` when the adapter sets it, next to the `conflicts` print. It stays out of `cli_operations.py`, which holds 194 lines.
- `shared/tracker_port/projector.py` and `shared/tracker_port/regenerate.py`: skip a record with the state `unplanned`.
- `tests/_linear_fake_support.py`: adds human edits (rename, reorder, re-parent).

## Types & Signatures

```python
# linear_seen.py
SEEN_FIELDS = ("title", "description_hash", "parent_id", "blocker_ids", "state_type", "assignee_id")
def seen_values(issue: Issue) -> dict[str, object]: ...
def touch_seen(seen: Mapping[str, object], **written: object) -> dict[str, object]: ...   # update only the fields a write sets

def compare_seen(issue: Issue, seen: Mapping[str, object]) -> list[dict[str, object]]: ...   # {id, field, was, now}

# linear_seed.py
def run_sync(adapter: LinearAdapter) -> list[dict[str, object]]: ...      # compare, comment, refresh, set adapter.plan_changes
def run_seed(adapter: LinearAdapter, plans_dir: Path, dry_run: bool, refresh_envelope: bool) -> list[TrackerRecord]: ...
```

`sync` posts one comment on each changed issue and refreshes the seen values. A seed creates the missing issues and never overwrites a plan field. A plan field that differs from Linear is a conflict that the CLI already prints for a seed.

## Slice Decomposition

8. **A change by a person shows at the next sync.** The seen values, `sync`, and the CLI output. Depends on E3.
9. **The seed keeps the plan of Linear, and shared code skips unplanned issues.** The seed and the two shared-code skips. Depends on slice 8.

## Test Plan

`tests/test_tracker_linear_sync.py`:

- Slice 8: a rename, a reorder, and a re-parent in `FakeLinear` each show in `plan_changes` with the field, old value, and new value, and `sync` posts one comment. A claim and a state change by CoBuilder raise none. A repeated `sync` with no change returns an empty list. `tracker.py sync` prints `plan_changes` when it is set and prints nothing extra for beads.

`tests/test_tracker_linear_seed.py`:

- Slice 9: a seed over an empty `FakeLinear` creates the issues. A second seed changes nothing. A differing plan field is a conflict and is not overwritten. `project()` and `regenerate_status_files` skip an unplanned record without error, and they rewrite the state lines from Linear records. The beads tests stay green.

## Risks & Open Questions

- How a plan row names an existing Linear issue is open. The proposal is `linear:<identifier>` in the `external_ref` of the plan row. The engineer decides before slice 9 starts.
- The seen list may miss a plan field. A change to a missed field raises no entry.
- `projector.py` and `regenerate.py` serve every adapter. A change there must leave the beads output byte equal. A golden test guards it.
