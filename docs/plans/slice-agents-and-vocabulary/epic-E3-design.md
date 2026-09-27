# Epic Technical Solution Design: E3 — habit-hooks coaches GREEN

Feature: slice-agents-and-vocabulary
Epic ID: E3

## Scope and Intent

Ship a required `PostToolUse` hook in the implement plugin. It coaches the
GREEN agent after each file write, with habit-hooks output. Every other
agent and the main session see no effect. The build skill refuses to start
slices when habit-hooks is missing. The plugin credits habit-hooks.

## Files Touched

- `plugins/implement/hooks/hooks.json` (new)
- `plugins/implement/scripts/habit_coach.py` (new)
- `plugins/implement/NOTICE.md` (new)
- `plugins/implement/skills/build/SKILL.md` (a prerequisite section)
- `plugins/implement/.claude-plugin/plugin.json` (0.3.0)
- `README.md` (one line in the implement section, with the credit)
- `tests/test_habit_coach.py` (new, written by RED)

## Types & Signatures

```json
{"hooks": {"PostToolUse": [{"matcher": "Write|Edit", "hooks": [
  {"type": "command",
   "command": "uv run \"${CLAUDE_PLUGIN_ROOT}/scripts/habit_coach.py\""}]}]}}
```

```python
GREEN_AGENT_TYPES = frozenset({"implement:green"})

def is_green(payload: dict) -> bool
def target_path(payload: dict) -> str | None
def run_habit_hooks(path: str) -> tuple[int, str]   # FileNotFoundError -> (127, msg)
def render(code: int, text: str) -> dict | None
def main(stdin, stdout, runner=run_habit_hooks) -> int   # always returns 0
```

| Condition | Output |
|---|---|
| not GREEN, or no `file_path`, or bad JSON | nothing |
| exit 0 | nothing |
| exit 1 | `additionalContext` = "habit-hooks coaching for <path>:" + text |
| exit 2 | `additionalContext` = "habit-hooks failed to run on <path>. Report this in your GREEN report." + text |
| exit 127 (not installed) | `additionalContext` = one line with the install command |

The hook never blocks. `PostToolUse` cannot block, and a coaching tool
must not stop a write.

`SKILL.md` gains `## Prerequisite: habit-hooks` before the slice loop
section. Before slice 1, run `habit-hooks --version`. On failure, stop and
print `uv tool install "habit-hooks[python]"` with a note to name every
language in one install command. When `.habit-hooks/config.toml` is
missing, run `habit-hooks init`, then snooze the existing backlog.

## Slice Decomposition

- Slice 4 (tracer bullet): `hooks.json`, `is_green`, `target_path`, and
  the exit 0 and exit 1 paths.
- Slice 5 (edge cases, requirement, credit): exit 2, exit 127, bad input,
  the prerequisite section, `NOTICE.md`, README credit, version bump.

## Test Plan

`tests/test_habit_coach.py`, with a fake `runner` and no real habit-hooks:

- Slice 4: `hooks.json` parses and has the registration above. A GREEN
  payload with runner exit 1 writes JSON with `hookEventName` =
  `PostToolUse` and the coaching text. A payload with `agent_type` =
  `implement:red`, and one with no `agent_type`, write nothing. Exit 0
  writes nothing.
- Slice 5: exit 2 and exit 127 texts. Invalid JSON on stdin returns 0 with
  no output. `SKILL.md` names `habit-hooks --version` before the slice
  loop. `NOTICE.md` names "habit-hooks", "MIT", the repository URL, and
  "Ivett Ördög". `plugin.json` version is 0.3.0.

## Risks & Open Questions

- The exact `agent_type` string for a plugin agent is not documented. The
  script accepts both forms. Slice 5's validator checks a live GREEN run if
  the harness allows it, and records the observed value.
- `uv run` on each write adds start-up time. The script has no
  dependencies, so `uv` uses no network after the first run.
