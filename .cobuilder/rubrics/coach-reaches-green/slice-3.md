# Rubric: Slice 3 — E3: implement 0.7.0 in both manifests

Feature: coach-reaches-green
Epic: E3
Slice goal: `plugin.json` and `marketplace.json` both read 0.7.0 for `implement`, and the version-match test passes.
Test command: uv run pytest tests -q

## Criteria

### C1 — both manifests read 0.7.0 [CRITICAL]
**Must be true:** `plugins/implement/.claude-plugin/plugin.json` has `"version": "0.7.0"`. The `implement` entry in `.claude-plugin/marketplace.json` has `"version": "0.7.0"`.
**Evidence to check:** `grep -n '"version"' plugins/implement/.claude-plugin/plugin.json` and read the marketplace entry.
**Scoring:** 1.0 both. 0.5 one. 0.0 neither.

### C2 — nothing else changed [CRITICAL]
**Must be true:** The diff for this slice touches those two files only. No other plugin version moves.
**Evidence to check:** `git diff --name-only` for the slice commit, and `git diff` of both files.
**Scoring:** 1.0 two files, two lines. 0.5 an extra file. 0.0 another version changed.

### C3 — the suite passes
**Must be true:** The version-match test passes and the full suite stays green.
**Evidence to check:** the test command.
**Scoring:** 1.0 green. 0.0 any failure.

## Regression check
The full suite must pass.
