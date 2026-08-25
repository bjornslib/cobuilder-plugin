# Rubric: Slice 1 — tracer bullet: two plugins, one shared module

Feature: cobuilder-family
Epic: plugin-split/E2
Slice goal: Two throwaway plugins install from a local marketplace and both resolve `shared/_bundle_meta.py` from their own cache.
Test command: `uv run --with pytest pytest tests/ -v`

## Criteria

### C1 — A local marketplace installs two sibling plugins [CRITICAL]
**Must be true:** A person adds the marketplace from a local path and installs both plugins. Neither is nested inside the other.
**Evidence to check:**
- `claude plugin validate` on each plugin directory, exit 0.
- The installed cache holds two separate plugin directories.
**Scoring:**
- 1.0 — both install, both validate, neither path contains the other.
- 0.5 — one installs, or both install only after a manual step not in the docs.
- 0.0 — the marketplace does not resolve, or a plugin fails to install.

### C2 — The shared module resolves from each plugin's own cache [CRITICAL]
**Must be true:** Each installed plugin reads `shared/_bundle_meta.py` through its own `${CLAUDE_PLUGIN_ROOT}` and prints `SCHEMA_VERSION`. Neither reads the marketplace source tree, and neither reads the other's cache.
**Evidence to check:**
- Run each plugin's command. Both print the same version string.
- Delete or rename the marketplace source directory, then run both again. Both still work.
**Scoring:**
- 1.0 — both print the version, and both survive the source directory going away.
- 0.5 — both print the version while the source tree is present, and one fails once it is gone. This is the copy-not-happening failure and it must be reported, not rounded up.
- 0.0 — either plugin cannot resolve the module.

### C3 — The symlink dereference is proved for a directory, not a file
**Must be true:** `shared/` holds more than one Python module and at least one nested directory, and every file arrives in each cache.
**Evidence to check:** List the installed cache for each plugin and compare against `shared/`.
**Scoring:** 1.0 — every file present in both. 0.5 — the top level copies and a nested directory does not. 0.0 — nothing copies.

### C4 — The result is written down where the next slice will read it
**Must be true:** The outcome, including a failure, is recorded in `00-status.md`.
**Evidence to check:** Read `docs/plans/cobuilder-family/00-status.md`.
**Scoring:** 1.0 — the outcome and the exact commands are recorded. 0.5 — an outcome with no commands. 0.0 — nothing recorded.

## Regression check
- No existing script, skill, or command changes in this slice.
- The throwaway plugins live outside the shipped tree and are removed or clearly marked before slice 6.

## Out of scope — do not penalise
- Any real plugin content. These two plugins print a constant and nothing else.
- `require_compatible()`, the index, the viewer, and the ledger.
- The copy-before-publish fallback. It is only designed if C2 fails.
