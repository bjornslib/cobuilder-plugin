# Rubric: Slice 5 — E3 edge cases, requirement, and credit

Feature: slice-agents-and-vocabulary
Epic: E3
Slice goal: Failure paths behave as designed, the build skill requires habit-hooks, and the plugin credits it.
Test command: uv run --with pytest --with requests --with pyyaml --with pillow pytest tests/ -q

## Criteria

### C1 — failure paths never block and always explain [CRITICAL]
**Must be true:** Runner exit 2 gives `additionalContext` saying habit-hooks failed on the path, with its text. A missing binary (runner exit 127, or `FileNotFoundError` in the real runner) gives one line with the install command. Invalid JSON on stdin and a payload with no `file_path` give no output. Every case returns 0.
**Evidence to check:** the tests. Read `run_habit_hooks` for the `FileNotFoundError` path.
**Scoring:** 1.0 all four. 0.5 three. 0.0 any case exits non-zero or raises.

### C2 — the build skill requires habit-hooks [CRITICAL]
**Must be true:** `plugins/implement/skills/build/SKILL.md` has a `## Prerequisite: habit-hooks` section before the slice-loop section. It says to run `habit-hooks --version` before slice 1 and to stop on failure with `uv tool install "habit-hooks[python]"` and the note to name every language in one install. It says to run `habit-hooks init` and snooze the backlog when `.habit-hooks/config.toml` is missing. It does not call the tool optional.
**Evidence to check:** read the section. `grep -n -i optional` near it.
**Scoring:** 1.0 all. 0.5 one missing. 0.0 absent or optional.

### C3 — the plugin credits habit-hooks
**Must be true:** `plugins/implement/NOTICE.md` names habit-hooks, the MIT licence, https://github.com/habit-hooks/habit-hooks, and Ivett Ördög, and says the plugin calls the tool and does not vendor its code. `README.md` mentions the requirement and the credit in the implement section.
**Evidence to check:** read both.
**Scoring:** 1.0 all. 0.5 one missing. 0.0 no credit.

### C4 — version and live value
**Must be true:** `plugins/implement/.claude-plugin/plugin.json` reads 0.3.0. `00-status.md` notes record whether a live `agent_type` value was observed, or that it could not be observed in this harness.
**Evidence to check:** read both.
**Scoring:** 1.0 both. 0.5 one. 0.0 neither.

## Regression check
- `uv run --with pytest --with requests --with pyyaml --with pillow pytest tests/ -q` shows no new failure. Baseline: 365 passed, 1 pre-existing failure in `test_generate_prompts_webp.py`.
- `uv run plugins/implement/scripts/verify_gate.py --plan docs/plans/interaction-design-gate` still reports `Overall: OK`.

## Out of scope — do not penalise
- Whether habit-hooks is installed on the validating machine. Tests use a fake runner.
