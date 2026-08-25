---
title: "Sync Epic Status to goal.json"
status: active
type: reference
---

# Sync goal.json after slice acceptance

When a slice is accepted (validator scores >= 0.90), the epic it advances
may need its status updated in `docs/architecture/designs/<design>/goal.json`.

---

## When to sync

Run this check after every **PASS** verdict, before proceeding to the next
slice.

---

## Sync logic

For the design that owns the completed slice's epic:

1. Find the epic in `goal.json.epics[]` matching `slice_to_epic[<slice-id>]`.
2. Check if **all** slices for that epic are now `state: "completed"` in
   `00-status.md` (or equivalently, in the slice table of `04-slices.md`).
3. If all slices complete AND the epic has no branch:
   - Create a git branch named `<design>/<epic-id>` (or reuse existing if it
     shares a branch with another epic — see ADR-0013).
   - Open a pull request (or note the PR number if created elsewhere).
   - Update `goal.json`:
     ```json
     {
       "branch": "<branch-name>",
       "pr": <pr-number>,
       "state": "open"
     }
     ```
4. If all slices complete BUT the epic already has a branch/PR: no change
   needed (it was set when the first slice of the epic was planned or
   parallelised).
5. If not all slices complete: no change needed (epic stays `planned` with no
   branch).

---

## Implementation

A small script can do this deterministically:

```bash
# Pseudo-code
design=<feature-slug>
epic_id=$(slice_to_epic[$SLICE_ID])
all_slices=$(grep "plugin-split/$epic_id" 04-slices.md | cut -d'|' -f1)
if all_slices_completed_in_00_status "$all_slices"; then
  if epic_has_no_branch "$design" "$epic_id"; then
    branch="feature/$design-$epic_id"
    git checkout -b "$branch"
    gh pr create --title "<Epic title>" --body "<from goal.json.note>"
    pr_num=$(gh pr view --json number -q .number)
    update_goal_json "$design" "$epic_id" "$branch" "$pr_num" "open"
  fi
fi
```

---

## Integration point

Add this to the **PASS** branch of "Handling the verdict" in `slice-loop.md`:

```markdown
| **PASS** | Delete `slice-<N>-feedback.md`. Record the score in `00-status.md`,
           check the slice off. **Sync epic status to goal.json** (see
           `goal-sync.md`). Prove the slice works to the user with a test
           or demo. Ask whether to continue or adjust direction. |
```

---

## Notes

- The branch name convention `<design>/<epic-id>` follows ADR-0013.
- If two epics share a branch (ADR-0013), they will be on the same branch
  and PR — the sync should detect this and not create a duplicate.
- The `state` field in goal.json should be `open` when a PR exists,
  `planned` when no branch yet.
- Do NOT sync on FAIL or ESCALATION — epic stays `planned` until all its
  slices pass.

---

## Related

- `slice-loop.md` — the main loop with PASS/FAIL/ESCALATION handling
- `validation-scoring.md` — scoring thresholds and escalation rules
- ADR-0013 — design mode and cobuilder-implement join through intent.json