Kind: behavioral

# Rubric: Slice 15 — Pull request blocks two epics

Feature: beads-storage
Epic: beads-storage/E4
Slice goal: A pull request record blocks two fixture epics until its state is set to merged, and then both epics show as ready.
Test command: `uv run pytest tests/test_pr_tracker_state.py -q`

## Criteria

### C1 — `generate` opens the record through `open-pull-request` after the PR exists [CRITICAL]

**Must be true:** Given only `plugins/pr/skills/odyssey/SKILL.md` and a fixture branch, a fresh agent runs `gh pr create` first, then runs `tracker.py open-pull-request` with the `--ref` of the new PR and the epic ids. It never runs `open-pull-request` before the PR number exists.

**Evidence to check:** Transcript of the fresh run. The `gh pr create` call must come before the `open-pull-request` call. The `--ref` argument must hold the number that `gh pr create` printed.

**Scoring:**
- 1.0: `gh pr create` runs first, and `open-pull-request` carries its number.
- 0.5: both run, but in the wrong order.
- 0.0: `open-pull-request` runs with no PR number.

### C2 — `review` reads the epic state and never sets a merge

**Must be true:** Given the odyssey SKILL.md "Workflow state" section and a merged fixture PR, a fresh agent in review mode reads epic state with `tracker.py list-epics` or `get-slice`. It does not call `set-pull-request-state` on its own. A human step runs that call.

**Evidence to check:** Transcript of the fresh review run. A `list-epics` or `get-slice` call must appear. No `set-pull-request-state` call may appear in the agent's own commands. A call that the human step runs is allowed in the transcript and must be marked as human.

**Scoring:**
- 1.0: the read happens, and the agent sets no merge.
- 0.5: the read happens, but the agent sets the merge itself.
- 0.0: no read happens.

### C3 — After a human merge, the procedure runs `set-pull-request-state` and then `set-epic-state`

**Must be true:** Given the odyssey SKILL.md and a fixture where the human reports the merge, a fresh agent runs `tracker.py set-pull-request-state --ref <r> --merged true`, then `tracker.py set-epic-state` for each linked epic. The order is fixed.

**Evidence to check:** Transcript of the fresh run. The `set-pull-request-state` call must come before every `set-epic-state` call. Each `set-epic-state` call must name a linked epic.

**Scoring:**
- 1.0: both calls run in order, and each epic is named.
- 0.5: both calls run, but the order is wrong.
- 0.0: either call is missing.

### C4 — Both epics show as ready only after the merge

**Must be true:** Using the fixture with two epics and one blocking pr record, `next-ready` returns neither epic before `set-pull-request-state --merged true`, and returns both after it. `next-ready` never returns the pr record.

**Evidence to check:** `uv run pytest tests/test_pr_tracker_state.py -q -k ready_after_merge` passes. The test output lists the two epics only after the merge.

**Scoring:**
- 1.0: both epics appear only after the merge, and the pr record never appears.
- 0.5: the epics appear after the merge, but the pr record also appears.
- 0.0: the epics appear before the merge, or never appear.

## Regression check

- `uv run pytest tests/test_pr_tracker_state.py -q` passes.
- The pr `plugin.json` and `marketplace.json` versions match.
- `odyssey/SKILL.md` makes no hand write to pull request or epic state.

## Out of scope — do not penalise

- The narrative of the odyssey levels. Those belong to the pr story, not the write path.
- The `gh` CLI version and its output format.
- Port internals. Those belong to E1 to E3.
