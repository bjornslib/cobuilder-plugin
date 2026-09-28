"""Tests for the E3 habit-hooks PostToolUse hook.

Slice 4 ("the hook fires for GREEN only") covers hooks.json registration,
is_green, target_path, and the exit-0 / exit-1 paths of main(). Slice 5
("edge cases, requirement, and credit") covers exit 2, exit 127, invalid
JSON, a GREEN payload with no file_path, the SKILL.md prerequisite
section, NOTICE.md, the README credit, and the plugin.json version bump.

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


class _FakeCompleted:
    """Stands in for subprocess.CompletedProcess in tests."""

    def __init__(self, returncode: int, stdout: str, stderr: str):
        self.returncode = returncode
        self.stdout = stdout
        self.stderr = stderr


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


# ---------------------------------------------------------------------------
# Slice 5: exit 2, exit 127, bad input, prerequisite section, NOTICE.md,
# README credit, version bump.
# ---------------------------------------------------------------------------


def test_main_green_exit_two_reports_failure_to_run_and_asks_for_green_report(habit_coach):
    runner = FakeRunner((2, "bad config key"))
    path = "/x/a.py"
    stdin = io.StringIO(json.dumps(_green_payload(path)))
    stdout = io.StringIO()

    rc = habit_coach.main(stdin, stdout, runner=runner)

    assert rc == 0
    out_text = stdout.getvalue().strip()
    parsed = json.loads(out_text)
    output = parsed["hookSpecificOutput"]
    assert output["hookEventName"] == "PostToolUse"
    context = output["additionalContext"]
    assert f"habit-hooks failed to run on {path}" in context
    assert "bad config key" in context
    assert "GREEN report" in context


def test_main_green_exit_127_reports_install_command(habit_coach):
    runner = FakeRunner((127, "habit-hooks is not installed."))
    stdin = io.StringIO(json.dumps(_green_payload("/x/a.py")))
    stdout = io.StringIO()

    rc = habit_coach.main(stdin, stdout, runner=runner)

    assert rc == 0
    out_text = stdout.getvalue().strip()
    parsed = json.loads(out_text)
    context = parsed["hookSpecificOutput"]["additionalContext"]
    lines = [line for line in context.splitlines() if line.strip()]
    matching = [line for line in lines if 'uv tool install "habit-hooks[python]"' in line]
    assert len(matching) == 1, f"expected exactly one matching line, got: {lines!r}"


def test_run_habit_hooks_returns_127_when_binary_absent_from_path(habit_coach, monkeypatch, tmp_path):
    empty_bin_dir = tmp_path / "empty-bin"
    empty_bin_dir.mkdir()
    monkeypatch.setenv("PATH", str(empty_bin_dir))

    code, text = habit_coach.run_habit_hooks("/x/a.py")

    assert code == 127
    assert isinstance(text, str) and text


def test_main_invalid_json_on_stdin_writes_nothing_and_returns_zero(habit_coach):
    stdin = io.StringIO("{not valid json")
    stdout = io.StringIO()

    rc = habit_coach.main(stdin, stdout, runner=FakeRunner((1, "unused")))

    assert rc == 0
    assert stdout.getvalue() == ""


def test_main_green_payload_without_file_path_writes_nothing_and_skips_runner(habit_coach):
    payload = {"agent_type": "implement:green", "tool_name": "Write", "tool_input": {}}
    runner = FakeRunner((1, "should not be seen"))
    stdin = io.StringIO(json.dumps(payload))
    stdout = io.StringIO()

    rc = habit_coach.main(stdin, stdout, runner=runner)

    assert rc == 0
    assert stdout.getvalue() == ""
    assert runner.calls == []


def test_main_green_exit_one_context_has_path_header_then_newline_then_runner_text(habit_coach):
    path = "/x/a.py"
    runner_text = "too-many-parameters: coaching text"
    runner = FakeRunner((1, runner_text))
    stdin = io.StringIO(json.dumps(_green_payload(path)))
    stdout = io.StringIO()

    rc = habit_coach.main(stdin, stdout, runner=runner)

    assert rc == 0
    parsed = json.loads(stdout.getvalue().strip())
    context = parsed["hookSpecificOutput"]["additionalContext"]
    assert f"habit-hooks coaching for {path}:\n{runner_text}" in context


# ---------------------------------------------------------------------------
# habit_coach.py: automatic install of habit-hooks
# ---------------------------------------------------------------------------


def test_main_green_exit_127_with_fake_runner_does_not_attempt_install(habit_coach, monkeypatch):
    calls: list[tuple] = []

    def fake_install() -> tuple[int, str]:
        calls.append(())
        return 0, "installed"

    monkeypatch.setattr(habit_coach, "install_habit_hooks", fake_install)
    runner = FakeRunner((127, "habit-hooks is not installed."))
    stdin = io.StringIO(json.dumps(_green_payload("/x/a.py")))
    stdout = io.StringIO()

    rc = habit_coach.main(stdin, stdout, runner=runner)

    assert rc == 0
    assert calls == [], "runner seam must bypass the installer entirely"
    context = json.loads(stdout.getvalue().strip())["hookSpecificOutput"]["additionalContext"]
    assert 'uv tool install "habit-hooks[python]"' in context


def test_install_habit_hooks_runs_uv_tool_install(habit_coach, monkeypatch):
    recorded: list[list[str]] = []

    def fake_run(*args, **kwargs):
        recorded.append(list(args[0]))
        return _FakeCompleted(0, "Installed 1 package", "")

    monkeypatch.setattr(habit_coach.subprocess, "run", fake_run)

    code, text = habit_coach.install_habit_hooks()

    assert (code, text) == (0, "Installed 1 package")
    assert recorded == [["uv", "tool", "install", "habit-hooks[python]"]]


def test_install_habit_hooks_returns_output_and_code(habit_coach, monkeypatch):
    def fake_run(*args, **kwargs):
        return _FakeCompleted(1, "stdout line", "stderr line")

    monkeypatch.setattr(habit_coach.subprocess, "run", fake_run)

    code, text = habit_coach.install_habit_hooks()

    assert code == 1
    assert "stdout line" in text
    assert "stderr line" in text


def test_install_habit_hooks_returns_127_when_uv_is_absent(habit_coach, monkeypatch):
    def fake_run(*args, **kwargs):
        raise FileNotFoundError("uv")

    monkeypatch.setattr(habit_coach.subprocess, "run", fake_run)

    code, text = habit_coach.install_habit_hooks()

    assert code == 127
    assert text == "uv is not installed."


def test_run_habit_hooks_installs_and_retries_on_missing_binary(habit_coach, monkeypatch):
    runs: list[list[str]] = []

    def fake_run(*args, **kwargs):
        runs.append(list(args[0]))
        if runs and runs[0][0] == "habit-hooks" and len(runs) == 1:
            raise FileNotFoundError("habit-hooks")
        if runs[-1][0] == "uv":
            raise AssertionError("installer should be monkeypatched, not real uv")
        return _FakeCompleted(0, "clean write", "")

    monkeypatch.setattr(habit_coach.subprocess, "run", fake_run)
    monkeypatch.setattr(habit_coach, "install_habit_hooks", lambda: (0, "installed"))

    code, text = habit_coach.run_habit_hooks("/x/a.py")

    assert code == 0
    assert text == "clean write"
    assert [r[0] for r in runs] == ["habit-hooks", "habit-hooks"]


def test_run_habit_hooks_returns_127_when_install_fails(habit_coach, monkeypatch):
    install_calls: list[int] = []

    def fake_run(*args, **kwargs):
        raise FileNotFoundError("habit-hooks")

    def fake_install():
        install_calls.append(1)
        return 1, "boom"

    monkeypatch.setattr(habit_coach.subprocess, "run", fake_run)
    monkeypatch.setattr(habit_coach, "install_habit_hooks", fake_install)

    code, text = habit_coach.run_habit_hooks("/x/a.py")

    assert code == 127
    assert text == "habit-hooks is not installed."
    assert install_calls == [1]


def test_run_habit_hooks_returns_127_when_install_succeeds_but_binary_still_missing(
    habit_coach, monkeypatch
):
    monkeypatch.setattr(habit_coach.subprocess, "run", lambda *a, **k: (_ for _ in ()).throw(FileNotFoundError()))
    monkeypatch.setattr(habit_coach, "install_habit_hooks", lambda: (0, "installed"))

    code, text = habit_coach.run_habit_hooks("/x/a.py")

    assert code == 127
    assert text == "habit-hooks is not installed."


# ---------------------------------------------------------------------------
# SKILL.md: prerequisite section
# ---------------------------------------------------------------------------

SKILL_MD_PATH = REPO_ROOT / "plugins" / "implement" / "skills" / "build" / "SKILL.md"


def test_skill_md_has_prerequisite_habit_hooks_section_before_building_a_slice():
    assert SKILL_MD_PATH.exists(), f"missing {SKILL_MD_PATH}"
    text = SKILL_MD_PATH.read_text()

    prereq_heading = "## Prerequisite: habit-hooks"
    building_heading = "## Building a slice"

    prereq_index = text.find(prereq_heading)
    building_index = text.find(building_heading)

    assert prereq_index != -1, f"missing heading {prereq_heading!r} in SKILL.md"
    assert building_index != -1, f"missing heading {building_heading!r} in SKILL.md"
    assert prereq_index < building_index, (
        "expected '## Prerequisite: habit-hooks' to appear before "
        "'## Building a slice'"
    )

    # Slice the section body: from the prerequisite heading up to the next
    # '## ' heading (or end of file if it is the last section).
    rest = text[prereq_index + len(prereq_heading):]
    next_heading_offset = rest.find("\n## ")
    section_body = rest if next_heading_offset == -1 else rest[:next_heading_offset]

    assert "habit-hooks --version" in section_body
    assert 'uv tool install "habit-hooks[python]"' in section_body
    assert "habit-hooks init" in section_body
    assert "snooze" in section_body
    assert "optional" not in section_body.lower()


# ---------------------------------------------------------------------------
# NOTICE.md
# ---------------------------------------------------------------------------

NOTICE_MD_PATH = REPO_ROOT / "plugins" / "implement" / "NOTICE.md"


def test_notice_md_exists_and_credits_habit_hooks():
    assert NOTICE_MD_PATH.exists(), f"missing {NOTICE_MD_PATH}"
    text = NOTICE_MD_PATH.read_text()

    assert "habit-hooks" in text
    assert "MIT" in text
    assert "https://github.com/habit-hooks/habit-hooks" in text
    assert "Ivett Ördög" in text


# ---------------------------------------------------------------------------
# README.md credit
# ---------------------------------------------------------------------------


def test_readme_credits_habit_hooks():
    readme_path = REPO_ROOT / "README.md"
    assert readme_path.exists(), f"missing {readme_path}"
    assert "habit-hooks" in readme_path.read_text()


# ---------------------------------------------------------------------------
# plugin.json version bump
# ---------------------------------------------------------------------------


def test_implement_plugin_json_version_is_0_3_0():
    plugin_json_path = REPO_ROOT / "plugins" / "implement" / ".claude-plugin" / "plugin.json"
    assert plugin_json_path.exists(), f"missing {plugin_json_path}"
    data = json.loads(plugin_json_path.read_text())
    assert data["version"] == "0.3.0"
