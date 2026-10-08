# Rubric: Slice 3 — One rail

Feature: `level-page-restructure`
Epic: `level-page-restructure/E1`
Slice goal: The rail lists each level once, in the active account, then an Also group.
Test command: `cd plugins/artifact/viewer && npm run typecheck && npm run test`

## Criteria

### C1 — The rail shows Levels once and an Also group [CRITICAL]

**Must be true:** The rail has a group with Intent, Problem & Solution, and Architecture exactly once, and a second group with Plan, Epics, Rubrics, and File Diffs. The group labels "Build" and "Review" no longer appear.

**Evidence to check:** Render `Shell` and read the rail's group labels and row labels.

**Scoring:** 1.0 = exact. 0.5 = a level repeated, or an old label left. 0.0 = unchanged.

### C2 — The Levels rows address the active account [CRITICAL]

**Must be true:** On a work-item route the three rows carry the work item's addresses. On a pull-request route they carry that pull request's addresses.

**Evidence to check:** Read each row's `href` on a work-item route and on a PR route.

**Scoring:** 1.0 = both right. 0.5 = always the work item's. 0.0 = rows broken.

### C3 — Each Also row is tagged, and a press switches the account when needed

**Must be true:** Plan, Epics, and Rubrics carry the tag "work". File Diffs carries "PR". Pressing File Diffs from the work item opens the change's File Diffs. Pressing Plan from the pull request opens the work item's Plan.

**Evidence to check:** Read the tags. Press each from the other account and read the hash.

**Scoring:** 1.0 = tags and switches right. 0.5 = tags only. 0.0 = neither.

### C4 — The arrow walk follows the new order [CRITICAL]

**Must be true:** The rail's arrow keys step Intent, Problem & Solution, Architecture, then Plan, Epics, Rubrics, File Diffs, in that order, and skip a disabled row.

**Evidence to check:** The `rowsOf`/walk tests, or a render test that presses the arrow keys and reads the active row.

**Scoring:** 1.0 = order right and disabled skipped. 0.5 = order right, disabled not skipped. 0.0 = old order.

### C5 — A work item with no PR draws no dead rows

**Must be true:** With no PR, the Levels rows address the work item. File Diffs reads as unavailable with its reason. No sentence says four rows open nothing, and no Review group exists.

**Evidence to check:** Render a work item with no PR.

**Scoring:** 1.0 = right. 0.5 = the old absent sentence remains. 0.0 = dead links.

### C6 — Row names say the account in words

**Must be true:** Each row's accessible name states the level and the account ("Intent, the work item" and "Intent, the pull request" style), so a reader who cannot see the tag still knows.

**Evidence to check:** Read the rows' `aria-label` values.

**Scoring:** 1.0 = all rows. 0.5 = some rows. 0.0 = none.

### C7 — Nothing else regressed [CRITICAL]

**Must be true:** Typecheck and the full Vitest suite pass and the build reproduces `index.html`. Each existing test changed in this slice asserted the old rail, and the GREEN report lists it.

**Evidence to check:** Run the command and `uv run pytest tests/test_viewer_build.py -q`. Read the test diffs.

**Scoring:** 1.0 = all hold. 0.5 = an unrelated assertion weakened. 0.0 = red.
