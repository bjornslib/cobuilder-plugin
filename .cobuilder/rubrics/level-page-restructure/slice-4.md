# Rubric: Slice 4 — The In Short strip

Feature: `level-page-restructure`
Epic: `level-page-restructure/E2`
Slice goal: Each level opens with an In Short strip, and a Listen control when audio is served.
Test command: `cd plugins/artifact/viewer && npm run typecheck && npm run test`

## Criteria

### C1 — The strip shows the level's narration on all three levels in both accounts [CRITICAL]

**Must be true:** A region labelled exactly "In Short" renders above the section tabs on Intent, Problem & Solution, and Architecture. On a pull request it holds that level's `narration`. On a work item it holds the design's `narrative.<level>.narration`. The label contains no level name and no account word.

**Evidence to check:** Render each level and account with a fixture that has narration. Read the region's label and text, and its position relative to the tabs.

**Scoring:** 1.0 = six cases right. 0.5 = one account only. 0.0 = absent.

### C2 — The strip stays across sections and follows the level and account [CRITICAL]

**Must be true:** Changing the section leaves the strip's text unchanged. Changing the level or the account changes it to that level's text.

**Evidence to check:** Render, press Next, read the strip. Navigate to another level and the other account, read it again.

**Scoring:** 1.0 = right. 0.5 = redraws but text wrong after one change. 0.0 = per-section.

### C3 — No narration means no strip and no sentence [CRITICAL]

**Must be true:** A level without narration renders no strip, no empty frame, and no sentence about it. Build's Plan, Epics, and Rubrics views render no strip.

**Evidence to check:** Render with narration removed from the fixture. Render Plan.

**Scoring:** 1.0 = nothing drawn. 0.5 = an empty frame. 0.0 = a placeholder sentence.

### C4 — Listen appears only when the audio file is served [CRITICAL]

**Must be true:** On a pull request level whose audio the bundle serves, a button named for play appears and toggles to pause. When the file is not served, nothing appears and no text mentions the file. On the work item no Listen control appears.

**Evidence to check:** Render with `servedAudio` true and false. Press the button and read its pressed state.

**Scoring:** 1.0 = right in all three cases. 0.5 = control shows without a file. 0.0 = a missing-file sentence still renders.

### C5 — The narration paragraph is not repeated in the first PR section

**Must be true:** On a pull request level the narration text appears once (in the strip) and not again in the first section. The first section's own picture or drawing remains.

**Evidence to check:** Count occurrences of the narration text in the rendered level.

**Scoring:** 1.0 = once. 0.5 = twice. 0.0 = strip missing.

### C6 — The source rule is pure and covered

**Must be true:** `inShortOf` is a pure function in `shell/inShort.ts` with a test file, and returns null for a level with no text and for levels outside the three.

**Evidence to check:** Read the file and the tests. Run them.

**Scoring:** 1.0 = pure and covered. 0.5 = logic inside the component. 0.0 = untested.

### C7 — Nothing else regressed [CRITICAL]

**Must be true:** Typecheck and the full Vitest suite pass and the build reproduces `index.html`. Any existing test changed in this slice asserted the old narration block and is listed in the GREEN report.

**Evidence to check:** Run the command and `uv run pytest tests/test_viewer_build.py -q`. Read the test diffs.

**Scoring:** 1.0 = all hold. 0.5 = an unrelated assertion weakened. 0.0 = red.
