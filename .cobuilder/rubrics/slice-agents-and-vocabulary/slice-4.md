# Rubric: Slice 4 — E3 tracer bullet: the hook fires for GREEN only

Feature: slice-agents-and-vocabulary
Epic: E3
Slice goal: `hooks/hooks.json` registers `habit_coach.py` on `Write|Edit`. The script coaches GREEN and ignores every other agent.
Test command: uv run --with pytest --with requests --with pyyaml --with pillow pytest tests/ -q

## Criteria

### C1 — the registration [CRITICAL]
**Must be true:** `plugins/implement/hooks/hooks.json` parses, has a top-level `hooks` key, a `PostToolUse` entry with matcher `Write|Edit`, and one `command` hook whose command runs `${CLAUDE_PLUGIN_ROOT}/scripts/habit_coach.py`.
**Evidence to check:** read the file and the test.
**Scoring:** 1.0 exact. 0.5 a detail differs but it would still fire. 0.0 it would not fire.

### C2 — GREEN with findings gets coaching [CRITICAL]
**Must be true:** For a payload with `agent_type` `implement:green` and a `tool_input.file_path`, and a runner that returns exit 1 with text, `main()` writes one JSON object with `hookSpecificOutput.hookEventName` = `PostToolUse` and `additionalContext` containing the path and the runner text. It returns 0.
**Evidence to check:** the test, and a manual run: `echo '<payload>' | uv run plugins/implement/scripts/habit_coach.py` with a fake `habit-hooks` on PATH.
**Scoring:** 1.0 correct. 0.5 text present but wrong shape. 0.0 no output.

### C3 — every other caller gets nothing [CRITICAL]
**Must be true:** `agent_type` `implement:red`, `implement:validate`, an absent `agent_type` (the main session), and runner exit 0 each produce empty stdout and return 0. The runner is not called for a non-GREEN payload.
**Evidence to check:** the tests, including an assertion that the fake runner was not called.
**Scoring:** 1.0 all four. 0.5 three. 0.0 fewer.

### C4 — the script is testable and dependency-free
**Must be true:** PEP 723 header with `dependencies = []`. `main` takes an injectable `runner`. Functions match the signatures in `epic-E3-design.md`.
**Evidence to check:** read the script.
**Scoring:** 1.0 yes. 0.5 one deviation. 0.0 imports a third-party package.

## Regression check
- `uv run --with pytest --with requests --with pyyaml --with pillow pytest tests/ -q` shows no new failure. Baseline: 365 passed, 1 pre-existing failure in `test_generate_prompts_webp.py`.
- `uv run plugins/implement/scripts/verify_gate.py --plan docs/plans/interaction-design-gate` still reports `Overall: OK`.

## Out of scope — do not penalise
- Exit 2, the missing binary, bad JSON, the prerequisite check, NOTICE, and the version bump (slice 5).
