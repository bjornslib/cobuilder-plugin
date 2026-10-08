# Rubric: Slice 5 — Record gaps in the build

Feature: `level-page-restructure`
Epic: `level-page-restructure/E3`
Slice goal: `build_index.py` reports missing record parts, and the viewer states none.
Test command: `uv run pytest tests -q && cd plugins/artifact/viewer && npm run typecheck && npm run test`

## Criteria

### C1 — The build warns for each missing part [CRITICAL]

**Must be true:** `build_index.py` prints a `warning:` line naming the design id for each of: no problem or constraint beat in `narrative.problem_solution`, no decision or risk beat there, and a beat whose kind is outside problem, constraint, decision, and risk (naming the kinds). The build still succeeds.

**Evidence to check:** Tests that build a repo with each gap and read stderr and the exit code.

**Scoring:** 1.0 = three warnings, build succeeds. 0.5 = two. 0.0 = none.

### C2 — A complete record warns nothing [CRITICAL]

**Must be true:** A design with beats of every needed kind and no other kind produces none of these warnings.

**Evidence to check:** A test with a complete record.

**Scoring:** 1.0 = silent. 0.0 = warns.

### C3 — The viewer states no record gap [CRITICAL]

**Must be true:** Problem and solution renders no "No beat of kind" line and no "beats carry a kind outside" line for any record. An empty card shows no misleading text.

**Evidence to check:** Render the section with a record that lacks beats. Grep the source for the phrases.

**Scoring:** 1.0 = none in DOM and source. 0.5 = removed from one card. 0.0 = still shown.

### C4 — Each warning has a test

**Must be true:** `tests/test_build_index.py` has one test per warning and one for the silent case.

**Evidence to check:** Read the new tests and run them.

**Scoring:** 1.0 = four tests. 0.5 = fewer. 0.0 = none.

### C5 — The real bundles still build

**Must be true:** `build_index.py` runs on this repo and on `~/Documents/Windsurf/think-with-ai` and exits 0, and prints the new warnings for designs that lack the beats.

**Evidence to check:** Run both. Count the warnings.

**Scoring:** 1.0 = both exit 0 with warnings where expected. 0.0 = a crash.

### C6 — Nothing else regressed [CRITICAL]

**Must be true:** The Python suite, typecheck, Vitest, and the build-reproduction test all pass. Any existing test changed in this slice asserted the removed lines and is listed in the GREEN report.

**Evidence to check:** Run the command. Read the test diffs.

**Scoring:** 1.0 = all hold. 0.5 = an unrelated assertion weakened. 0.0 = red.
