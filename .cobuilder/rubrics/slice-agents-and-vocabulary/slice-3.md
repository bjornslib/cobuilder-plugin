# Rubric: Slice 3 — E2 real content: the prompts move, and both loop paths spawn by name

Feature: slice-agents-and-vocabulary
Epic: E2
Slice goal: The agent bodies hold the full role prompts. `slice-loop.md` and `slice-loop.js` spawn the agents by name.
Test command: uv run --with pytest --with requests --with pyyaml --with pillow pytest tests/ -q

## Criteria

### C1 — no prompt line lost in the move [CRITICAL]
**Must be true:** Each rule in the RED, GREEN, and VALIDATE prompts of `git show HEAD~0:plugins/implement/skills/build/references/slice-loop.md` as it was before this feature (see commit before slice 3) appears in the matching agent body: scope contract, blind rule (RED and GREEN), "Do NOT modify any test file" (GREEN), assertion-failure rule (RED), false-pass checks, scoring guide, evidence file format, and verdict rules with 0.90 (VALIDATE). Placeholders `<slug>`, `<N>`, `<epic-id>`, `<test_command>` remain for the orchestrator to fill.
**Evidence to check:** diff the old prompt blocks against the agent bodies rule by rule.
**Scoring:** 1.0 nothing lost. 0.5 one minor rule lost. 0.0 a CRITICAL rule lost (blind rule, test immutability, verdict threshold).

### C2 — the manual path spawns by name [CRITICAL]
**Must be true:** `slice-loop.md` tells the orchestrator to spawn `implement:red`, `implement:green`, and `implement:validate` with the Agent tool's `subagent_type`, and says what the spawn message must carry. It no longer contains the pasted prompt blocks. The prose around them (state files, verdict handling, anti-patterns) is kept.
**Evidence to check:** read the file. `grep -c "You are the RED role" slice-loop.md` returns 0.
**Scoring:** 1.0 all points. 0.5 names used but a prompt block remains. 0.0 no names.

### C3 — the workflow path passes agentType
**Must be true:** Each RED, GREEN, and VALIDATE `agent()` call in `slice-loop.js` passes `agentType: 'implement:red'` (and green, validate). The inline prompt shrinks to the per-slice values and the retry and browser-evidence text. `model: BUILD_MODEL` stays on RED and GREEN only. The file still parses: `node --check` passes, or the test suite parses it.
**Evidence to check:** read the calls. Run `node --check plugins/implement/skills/build/workflows/slice-loop.js` if node exists.
**Scoring:** 1.0 all three. 0.5 one call missing it. 0.0 none.

### C4 — a blind agent follows the agent body (behavioural)
**Must be true:** A fresh subagent given only `plugins/implement/agents/green.md` and a realistic spawn message for a toy slice does not open any path under `.cobuilder/` and does not edit a test file.
**Evidence to check:** the orchestrator runs one blind pass per the Gate 4c special case and records the tool-call list in the evidence file.
**Scoring:** 1.0 both hold. 0.0 either fails.

## Regression check
- `uv run --with pytest --with requests --with pyyaml --with pillow pytest tests/ -q` shows no new failure. Baseline: 365 passed, 1 pre-existing failure in `test_generate_prompts_webp.py`.
- `uv run plugins/implement/scripts/verify_gate.py --plan docs/plans/interaction-design-gate` still reports `Overall: OK`.

## Out of scope — do not penalise
- The vocabulary agent and its step (slice 7). The hook (slices 4 and 5).
