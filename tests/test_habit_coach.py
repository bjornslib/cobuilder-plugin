"""Tests for the E3 tracer bullet: the habit-hooks PostToolUse hook.

Scope: slice 4 only ("the hook fires for GREEN only"). This covers
hooks.json registration, is_green, target_path, and the exit-0 / exit-1
paths of main(). Slice 5 (exit 2, exit 127, invalid JSON, missing
file_path, SKILL.md prerequisite, NOTICE.md, version bump) is out of
scope here.

Run with: uv run --with pytest --with requests --with pyyaml --with pillow pytest tests/ -q
"""
from __future__ import annotations

import importlib.util
import io
import json
from pathlib import Path
from types import ModuleType

import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent
HOOKS_JSON_PATH = REPO_ROOT / "plugins" / "implement" / "hooks" / "hooks.json"
HABIT_COACH_PATH = REPO_ROOT / "plugins" / "implement" / "scripts" / "habit_coach.py"


def _load_habit_coach() -> ModuleType:
    assert HABIT_COACH_PATH.exists(), f"missing {HABIT_COACH_PATH}"
    spec = importlib.util.spec_from_file_location("habit_coach", HABIT_COACH_PATH)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


@pytest.fixture()
def habit_coach() -> ModuleType:
    return _load_habit_coach()


def _green_payload(file_path: str = "/x/a.py") -> dict:
    return {
        "agent_type": "implement:green",
        "tool_name": "Write",
        "tool_input": {"file_path": file_path},
    }


class FakeRunner:
    """Records calls and returns a canned (code, text) result."""

    def __init__(self, result: tuple[int, str]):
        self.result = result
        self.calls: list[str] = []

    def __call__(self, path: str) -> tuple[int, str]:
        self.calls.append(path)
        return self.result


# ---------------------------------------------------------------------------
# hooks.json
# ---------------------------------------------------------------------------


def test_hooks_json_exists_and_parses():
    assert HOOKS_JSON_PATH.exists(), f"missing {HOOKS_JSON_PATH}"
    data = json.loads(HOOKS_JSON_PATH.read_text())
    assert isinstance(data, dict)


def test_hooks_json_registers_post_tool_use_write_or_edit():
    assert HOOKS_JSON_PATH.exists(), f"missing {HOOKS_JSON_PATH}"
    data = json.loads(HOOKS_JSON_PATH.read_text())
    assert "hooks" in data
    post_tool_use = data["hooks"]["PostToolUse"]
    assert isinstance(post_tool_use, list) and post_tool_use

    matching_entries = [e for e in post_tool_use if e.get("matcher") == "Write|Edit"]
    assert matching_entries, "expected a PostToolUse entry with matcher 'Write|Edit'"

    entry = matching_entries[0]
    commands = [h for h in entry.get("hooks", []) if h.get("type") == "command"]
    assert len(commands) == 1
    assert "${CLAUDE_PLUGIN_ROOT}/scripts/habit_coach.py" in commands[0]["command"]


# ---------------------------------------------------------------------------
# habit_coach.py: PEP 723 header
# ---------------------------------------------------------------------------


def test_script_starts_with_pep723_block_with_no_dependencies():
    assert HABIT_COACH_PATH.exists(), f"missing {HABIT_COACH_PATH}"
    text = HABIT_COACH_PATH.read_text()
    lines = text.splitlines()
    assert lines and lines[0] == "# /// script", "PEP 723 block must open the file"

    block_lines = []
    for line in lines[1:]:
        if line.strip() == "# ///":
            break
        block_lines.append(line)
    block_text = "\n".join(block_lines)
    assert "dependencies = []" in block_text


# ---------------------------------------------------------------------------
# habit_coach.py: constants and pure helpers
# ---------------------------------------------------------------------------


def test_green_agent_types_constant(habit_coach):
    assert habit_coach.GREEN_AGENT_TYPES == frozenset({"implement:green"})


def test_is_green_true_for_green_payload(habit_coach):
    assert habit_coach.is_green(_green_payload()) is True


@pytest.mark.parametrize("agent_type", ["implement:red", "implement:validate", "general-purpose"])
def test_is_green_false_for_non_green_agent_types(habit_coach, agent_type):
    payload = _green_payload()
    payload["agent_type"] = agent_type
    assert habit_coach.is_green(payload) is False


def test_is_green_false_when_agent_type_missing(habit_coach):
    payload = {"tool_name": "Write", "tool_input": {"file_path": "/x/a.py"}}
    assert habit_coach.is_green(payload) is False


def test_target_path_reads_tool_input_file_path(habit_coach):
    payload = _green_payload("/some/path/file.py")
    assert habit_coach.target_path(payload) == "/some/path/file.py"


def test_target_path_none_when_missing(habit_coach):
    assert habit_coach.target_path({"tool_name": "Write", "tool_input": {}}) is None
    assert habit_coach.target_path({"tool_name": "Write"}) is None


# ---------------------------------------------------------------------------
# habit_coach.py: render()
# ---------------------------------------------------------------------------


def test_render_exit_one_produces_post_tool_use_context(habit_coach):
    result = habit_coach.render(1, "too-many-parameters: coaching text")
    assert result is not None
    output = result["hookSpecificOutput"]
    assert output["hookEventName"] == "PostToolUse"
    assert "too-many-parameters: coaching text" in output["additionalContext"]


def test_render_exit_zero_produces_nothing(habit_coach):
    assert habit_coach.render(0, "") is None


# ---------------------------------------------------------------------------
# habit_coach.py: main()
# ---------------------------------------------------------------------------


def test_main_green_exit_one_writes_single_json_object_with_path_and_text(habit_coach):
    runner = FakeRunner((1, "too-many-parameters: coaching text"))
    stdin = io.StringIO(json.dumps(_green_payload("/x/a.py")))
    stdout = io.StringIO()

    rc = habit_coach.main(stdin, stdout, runner=runner)

    assert rc == 0
    out_text = stdout.getvalue().strip()
    assert out_text, "expected exactly one JSON object on stdout"

    # Exactly one JSON object: parsing the whole stripped stdout must
    # succeed, and there must be no trailing content after it.
    parsed = json.loads(out_text)
    output = parsed["hookSpecificOutput"]
    assert output["hookEventName"] == "PostToolUse"
    assert "/x/a.py" in output["additionalContext"]
    assert "coaching text" in output["additionalContext"]
    assert runner.calls == ["/x/a.py"]


def test_main_green_exit_zero_writes_nothing(habit_coach):
    runner = FakeRunner((0, ""))
    stdin = io.StringIO(json.dumps(_green_payload("/x/a.py")))
    stdout = io.StringIO()

    rc = habit_coach.main(stdin, stdout, runner=runner)

    assert rc == 0
    assert stdout.getvalue() == ""
    assert runner.calls == ["/x/a.py"]


@pytest.mark.parametrize("agent_type", ["implement:red", "implement:validate"])
def test_main_non_green_agent_types_write_nothing_and_skip_runner(habit_coach, agent_type):
    payload = _green_payload("/x/a.py")
    payload["agent_type"] = agent_type
    runner = FakeRunner((1, "should not be seen"))
    stdin = io.StringIO(json.dumps(payload))
    stdout = io.StringIO()

    rc = habit_coach.main(stdin, stdout, runner=runner)

    assert rc == 0
    assert stdout.getvalue() == ""
    assert runner.calls == []


def test_main_no_agent_type_writes_nothing_and_skips_runner(habit_coach):
    payload = {"tool_name": "Write", "tool_input": {"file_path": "/x/a.py"}}
    runner = FakeRunner((1, "should not be seen"))
    stdin = io.StringIO(json.dumps(payload))
    stdout = io.StringIO()

    rc = habit_coach.main(stdin, stdout, runner=runner)

    assert rc == 0
    assert stdout.getvalue() == ""
    assert runner.calls == []
