# Rubric: Slice 5 — The install writes the default config

Feature: structure-coaching
Epic: E2
Slice goal: see row 5 of docs/plans/structure-coaching/04-slices.md
Test command: uv run pytest tests -q

## Criteria

### C1 — The setup step writes the config [CRITICAL]
**Must be true:** The cobuilder-setup skill has a step that writes .cobuilder/structure-signals.json after the engineer approves it, and load_config reads the result.
**Evidence to check:**
- Run the temp-repo test for the written config.
- Read the setup skill step.
**Scoring:**
- 1.0 — step and test pass
- 0.5 — step without a test
- 0.0 — no step

### C2 — Versions are bumped and match
**Must be true:** implement and cobuilder-full-lifecycle have a new version in plugin.json and marketplace.json, and the two match.
**Evidence to check:**
- Run tests/test_plugin_manifests.py and the version-match test.
**Scoring:**
- 1.0 — bumped and matching
- 0.5 — one bumped
- 0.0 — none

## Regression check
- All tests that passed before this slice must still pass.
- Files outside the slice scope in the epic design must remain unchanged.

## Out of scope — do not penalise
- The agent-use check (slice 6)
