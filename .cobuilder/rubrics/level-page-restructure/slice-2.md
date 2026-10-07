# Rubric: Slice 2 — The account link in the section heading

Feature: `level-page-restructure`
Epic: `level-page-restructure/E1`
Slice goal: A link in every section heading of the three levels reads the other account, on the section of the same name.
Test command: `cd plugins/artifact/viewer && npm run typecheck && npm run test`

## Criteria

### C1 — The account rule bar is gone [CRITICAL]

**Must be true:** No "Program account" or "Change account" bar renders above the sections, and no `AccountRule` is used by the shell.

**Evidence to check:** Render a level in each account. Search the DOM for the two phrases. Grep `AccountRule` usages.

**Scoring:** 1.0 = gone. 0.5 = hidden or unused but present. 0.0 = still renders.

### C2 — The link reads the other account in words and goes to a real address [CRITICAL]

**Must be true:** On the work item the link text is `Read in PR 12 ›` (with the real PR number). On the pull request it is `Read in the work item ›`. Each is an anchor with an `href` that is the other account's address for the same level.

**Evidence to check:** Render Intent in each account. Read the anchor's text and `href`.

**Scoring:** 1.0 = both texts and hrefs right. 0.5 = text right, href missing or wrong level. 0.0 = absent.

### C3 — The link sits in the heading of every section of the three levels [CRITICAL]

**Must be true:** In Intent, Problem & Solution, and Architecture, of both accounts, each section panel's heading band holds the link. Plan, Epics, Rubrics, and File Diffs show no such link.

**Evidence to check:** For each level and account, step through the sections and read each heading band.

**Scoring:** 1.0 = every section, and none elsewhere. 0.5 = first section only, or some levels missing. 0.0 = absent.

### C4 — The destination opens the section of the same name, else the first [CRITICAL]

**Must be true:** Pressing the link from a section that has the same name on the other side opens that section (the tab marked current). When no section has that name, the first section opens. Example: work "Assessment" opens PR "Assessment"; work "Done when" opens PR "Why"; PR "Approach" opens the work item's first section.

**Evidence to check:** Render, move to a section, press the link, read the current tab. Cover one match and one miss each way.

**Scoring:** 1.0 = both match and miss right both ways. 0.5 = match right, miss wrong. 0.0 = always the first section.

### C5 — A work item with no pull request shows no link

**Must be true:** With no PR on the work item's epics, no link and no sentence about the missing PR renders in the heading.

**Evidence to check:** Render a work item without a PR.

**Scoring:** 1.0 = nothing drawn. 0.5 = a disabled link. 0.0 = a broken link.

### C6 — The section choice stays view state

**Must be true:** The carried section name never enters the address. After the press, the hash equals the other account's existing address for the level. A deep link opened with no press starts on the first section.

**Evidence to check:** Press the link and read `window.location.hash`. Open the address fresh.

**Scoring:** 1.0 = hash unchanged in form and a fresh open starts first. 0.0 = the name appears in the route.

### C7 — Nothing else regressed [CRITICAL]

**Must be true:** Typecheck and the full Vitest suite pass, the build reproduces `index.html`, and each existing test changed in this slice asserted removed UI and is listed in the GREEN report.

**Evidence to check:** Run the command and `uv run pytest tests/test_viewer_build.py -q`. Read the test diffs.

**Scoring:** 1.0 = all hold. 0.5 = an unrelated assertion weakened. 0.0 = red.
