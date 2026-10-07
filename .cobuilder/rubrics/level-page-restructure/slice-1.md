# Rubric: Slice 1 — The branch in the top bar, and the bar gone

Feature: `level-page-restructure`
Epic: `level-page-restructure/E1`
Slice goal: The top bar names the branch and any supersedes. The Branch, Epics, Supersedes bar above the section tabs is gone.
Test command: `cd plugins/artifact/viewer && npm run typecheck && npm run test`

## Criteria

### C1 — The top line bar is gone [CRITICAL]

**Must be true:** No element labelled "This work item" and no text "no branch recorded", "supersedes nothing", or "epics … done" renders above the section tabs of any level. The source has no `TopLinePanel` or `Fact` component left.

**Evidence to check:** Render `Shell` at a work-item level address (the existing tests do this). Search the DOM for those texts and the `aria-label`. Grep the source.

**Scoring:** 1.0 = absent in DOM and source. 0.5 = hidden by CSS only, or component left unused. 0.0 = still renders.

### C2 — The top bar shows the work item's branch [CRITICAL]

**Must be true:** For a work item whose epics carry branch `design/x`, the top bar contains `design/x` as text. With no epic branch, the top bar shows no branch text and no placeholder sentence.

**Evidence to check:** Two render cases (with a branch, without). Read the top bar's text content.

**Scoring:** 1.0 = both cases right. 0.5 = shown but a placeholder appears when absent. 0.0 = not in the top bar.

### C3 — Several branches stay reachable

**Must be true:** With more than one distinct branch, the top bar shows the first and a way to read all of them (a `title`, a count mark, or both). Nothing is dropped silently.

**Evidence to check:** Render with two branches. Read the bar's text and attributes.

**Scoring:** 1.0 = first shown and all reachable. 0.5 = all joined on one line that overflows. 0.0 = others dropped.

### C4 — A supersedes mark appears only when it has a value

**Must be true:** A work item with `goal.supersedes = ["a"]` shows a mark naming `a` in the top bar. An empty or absent list shows nothing about supersedes.

**Evidence to check:** Two render cases.

**Scoring:** 1.0 = both right. 0.5 = shown with a "nothing" placeholder. 0.0 = never shown.

### C5 — Nothing else regressed [CRITICAL]

**Must be true:** Typecheck passes and the full Vitest suite passes. Each existing test changed in this slice asserted a removed element, and the GREEN report lists it. No test lost an assertion that is unrelated to the removed bar.

**Evidence to check:** Run the command. Read `git diff` of test files and the report.

**Scoring:** 1.0 = green and diffs match. 0.5 = green but an unrelated assertion was weakened. 0.0 = red.

### C6 — The committed viewer build matches the source

**Must be true:** `npm run build` reproduces the committed `plugins/artifact/viewer/index.html`, and `uv run pytest tests/test_viewer_build.py -q` passes.

**Evidence to check:** Run the build and the test.

**Scoring:** 1.0 = reproduces. 0.0 = does not.
