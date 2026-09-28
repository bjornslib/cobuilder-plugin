# Rubric: Slice 1 — E1: ADR-0025, the packaging test, and the CLAUDE.md rule

Feature: slice-agents-and-vocabulary
Epic: E1
Slice goal: ADR-0025 narrows the install-surface rule so that only `implement` may ship `agents/` and `hooks/`. The test and `CLAUDE.md` match.
Test command: uv run --with pytest --with requests --with pyyaml --with pillow pytest tests/ -q

## Criteria

### C1 — ADR-0025 exists and decides the narrowed rule [CRITICAL]
**Must be true:** `docs/architecture/adr/ADR-0025-*.md` exists in the same shape as ADR-0024 (front matter, status, context, decision, consequences). It decides: `implement` may ship `agents/` and `hooks/hooks.json`. The other four plugins may not. No plugin ships an MCP server. It names the reason (GREEN needs a stable identity and a hook, and plugin agents ignore a `hooks` frontmatter key) and names habit-hooks as the hook's tool.
**Evidence to check:** read the ADR. Compare headings with ADR-0024.
**Scoring:** 1.0 all points present. 0.5 the decision is present but a point is missing. 0.0 no ADR, or it allows agents or hooks in every plugin.

### C2 — the test enforces the narrowed rule in both directions [CRITICAL]
**Must be true:** `tests/test_plugin_manifests.py` passes for `implement` with `agents/` or `hooks/` present, and fails for any other plugin with either directory. The MCP check still applies to all five. A test proves the "other plugin" direction with a temporary fixture, not only by the current tree.
**Evidence to check:** run the suite. Read the test. Create `plugins/pr/agents/` in a scratch copy or read the fixture test that does so.
**Scoring:** 1.0 both directions tested and passing. 0.5 only the allow direction tested. 0.0 the ban is gone for all plugins.

### C3 — CLAUDE.md states the narrowed rule and cites ADR-0025
**Must be true:** Every place in `CLAUDE.md` that says no plugin ships an agent or a hook now names the `implement` exception and ADR-0025. No sentence still claims that no plugin ships a hook.
**Evidence to check:** `grep -n -i "no agents\|no hooks\|ships an agent\|a hook" CLAUDE.md`.
**Scoring:** 1.0 all updated. 0.5 one stale sentence remains. 0.0 not updated.

### C4 — prose follows the writing standard
**Must be true:** The ADR and the changed `CLAUDE.md` lines use no contractions, no semicolons, and active voice.
**Evidence to check:** `uv run shared/skills/ste-writing/ste-lint.py <ADR path>` and a read.
**Scoring:** 1.0 clean. 0.5 a few violations. 0.0 many.

## Regression check
- `uv run --with pytest --with requests --with pyyaml --with pillow pytest tests/ -q` shows no new failure. Baseline: 365 passed, 1 pre-existing failure in `test_generate_prompts_webp.py`.
- `uv run plugins/implement/scripts/verify_gate.py --plan docs/plans/interaction-design-gate` still reports `Overall: OK`.

## Out of scope — do not penalise
- The agent files and the hook themselves (slices 2 to 5).
- The vocabulary table (slice 8).
