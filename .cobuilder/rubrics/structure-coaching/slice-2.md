# Rubric: Slice 2 — The name-stem cluster, the generic name, the config, and the paths not analysed

Feature: structure-coaching
Epic: E1
Slice goal: see row 2 of docs/plans/structure-coaching/04-slices.md
Test command: uv run pytest tests -q

## Criteria

### C1 — Three signals on synthetic trees [CRITICAL]
**Must be true:** structure_signals reports a crowded folder, a name-stem cluster of three or more siblings, and a generic file name, each on a synthetic git tree.
**Evidence to check:**
- Run the test command.
- Read tests/test_structure_signals.py for one passing case per signal.
**Scoring:**
- 1.0 — one case per signal, all pass
- 0.5 — two of three
- 0.0 — fewer

### C2 — The token split and the exclusions
**Must be true:** Stems split on _, -, ., and case changes. Test names (test_ and test- prefixes, .test, .spec, and _test suffixes) do not form a cluster. A stem that already has a sub-folder of that name does not form a cluster. An excluded stem, such as the, does not form a cluster.
**Evidence to check:**
- Find cases for snake_case, kebab-case, camelCase, PascalCase, a test-name cluster, a sub-folder, and an excluded stem.
**Scoring:**
- 1.0 — all seven cases
- 0.5 — four to six
- 0.0 — fewer

### C3 — The config file [CRITICAL]
**Must be true:** The script reads its limits and the generic-name list from .cobuilder/structure-signals.json, and uses defaults when the file is absent or bad.
**Evidence to check:**
- Find a test with a custom config that changes a result, and a test with no config file.
**Scoring:**
- 1.0 — both tested and pass
- 0.5 — one
- 0.0 — neither

### C4 — Paths not analysed
**Must be true:** The output names each excluded-path glob that matched, with the count of files it removed. A written file that is excluded gets no finding, and the output names the file and its glob. So a clean result is not a false pass.
**Evidence to check:**
- Find a test that asserts the glob and its count in the not-analysed list.
- Find a test for an excluded written file.
**Scoring:**
- 1.0 — tested and passes
- 0.5 — listed but not tested
- 0.0 — absent

### C5 — Standard library only
**Must be true:** shared/structure_signals.py imports only the standard library, so the coach runs it without uv.
**Evidence to check:**
- Read the imports of shared/structure_signals.py.
- Run tests/test_habit_coach.py, which holds the two no-uv cases.
**Scoring:**
- 1.0 — stdlib only and no-uv tests pass
- 0.5 — stdlib only, tests not run
- 0.0 — a third-party import

### C6 — The families of a crowded folder
**Must be true:** A crowded-folder finding holds `families`: each first-token group of two or more non-test files, largest first.
**Evidence to check:**
- Run the script on a synthetic crowded folder with two families of sizes 4 and 2.
**Scoring:**
- 1.0 — both families, in size order
- 0.5 — families present, wrong order or a test file counted
- 0.0 — no families

## Regression check
- All tests that passed before this slice must still pass.
- Files outside the slice scope in the epic design must remain unchanged.

## Out of scope — do not penalise
- The approved message wording (slice 3)
- The install step (slice 5)
