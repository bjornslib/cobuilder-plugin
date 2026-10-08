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
import os
import shlex
import subprocess
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
    matching = [line for line in lines if "/implement:install" in line]
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
# Slice E1: run from the git root, fail on "nothing scanned", no self-install
# ---------------------------------------------------------------------------

UNSCANNED_OUTPUTS = [
    "habit-hooks: nothing scanned",
    "a.py is not a file in this project",
]


def _require(module: ModuleType, name: str) -> None:
    assert hasattr(module, name), f"habit_coach.{name} is missing"


def _make_repo(tmp_path: Path) -> tuple[Path, Path]:
    """Create a git repo and return (repo root, a file in a sub-folder of it)."""
    repo = tmp_path / "repo"
    sub = repo / "src" / "pkg"
    sub.mkdir(parents=True)
    subprocess.run(["git", "init", "-q", str(repo)], check=True, capture_output=True)
    target = sub / "a.py"
    target.write_text("x = 1\n")
    return repo, target


def _install_stub(tmp_path: Path, monkeypatch, output: str, code: int) -> Path:
    """Put a habit-hooks stub first on PATH and return the file it writes its cwd to.

    The stub prints output and exits with code. It never reads its arguments.
    """
    bin_dir = tmp_path / "stub-bin"
    bin_dir.mkdir()
    record = tmp_path / "stub-cwd.txt"
    stub = bin_dir / "habit-hooks"
    stub.write_text(
        "#!/bin/sh\n"
        f"pwd > {shlex.quote(str(record))}\n"
        f"printf '%s\\n' {shlex.quote(output)}\n"
        f"exit {code}\n"
    )
    stub.chmod(0o755)
    monkeypatch.setenv("PATH", f"{bin_dir}{os.pathsep}{os.environ.get('PATH', '')}")
    return record


def _empty_path(tmp_path: Path, monkeypatch) -> None:
    empty_bin_dir = tmp_path / "empty-bin"
    empty_bin_dir.mkdir()
    monkeypatch.setenv("PATH", str(empty_bin_dir))


def test_git_root_returns_repo_top_for_file_in_subfolder(habit_coach, tmp_path):
    _require(habit_coach, "git_root")
    repo, target = _make_repo(tmp_path)

    result = habit_coach.git_root(str(target))

    assert result is not None, "expected the repo top for a file in a sub-folder"
    assert Path(result).resolve() == repo.resolve()


def test_git_root_none_outside_a_repo(habit_coach, tmp_path, monkeypatch):
    _require(habit_coach, "git_root")
    monkeypatch.setenv("GIT_CEILING_DIRECTORIES", str(tmp_path))
    loose = tmp_path / "loose"
    loose.mkdir()
    target = loose / "a.py"
    target.write_text("x = 1\n")

    assert habit_coach.git_root(str(target)) is None


@pytest.mark.parametrize("text", UNSCANNED_OUTPUTS)
def test_is_unscanned_true_for_each_marker_text(habit_coach, text):
    _require(habit_coach, "is_unscanned")
    assert habit_coach.is_unscanned(text) is True


def test_is_unscanned_false_for_normal_pass(habit_coach):
    _require(habit_coach, "is_unscanned")
    assert habit_coach.is_unscanned("a.py: 1 file scanned, 0 findings") is False


@pytest.mark.parametrize("text", UNSCANNED_OUTPUTS)
def test_run_habit_hooks_returns_two_when_stub_reports_unscanned_with_exit_zero(
    habit_coach, tmp_path, monkeypatch, text
):
    _, target = _make_repo(tmp_path)
    _install_stub(tmp_path, monkeypatch, text, 0)

    code, output = habit_coach.run_habit_hooks(str(target))

    assert code == 2
    assert text in output


def test_main_green_runs_habit_hooks_from_git_root_when_cwd_is_elsewhere(
    habit_coach, tmp_path, monkeypatch
):
    repo, target = _make_repo(tmp_path)
    record = _install_stub(tmp_path, monkeypatch, "", 0)
    elsewhere = tmp_path / "elsewhere"
    elsewhere.mkdir()
    monkeypatch.chdir(elsewhere)
    stdin = io.StringIO(json.dumps(_green_payload(str(target))))
    stdout = io.StringIO()

    rc = habit_coach.main(stdin, stdout)

    assert rc == 0
    assert record.exists(), "the habit-hooks stub never ran"
    assert Path(record.read_text().strip()).resolve() == repo.resolve()


def test_main_green_reports_failure_notice_when_stub_says_nothing_scanned(
    habit_coach, tmp_path, monkeypatch
):
    _, target = _make_repo(tmp_path)
    _install_stub(tmp_path, monkeypatch, "nothing scanned in this project", 0)
    stdin = io.StringIO(json.dumps(_green_payload(str(target))))
    stdout = io.StringIO()

    rc = habit_coach.main(stdin, stdout)

    assert rc == 0
    out_text = stdout.getvalue().strip()
    assert out_text, "expected a failure notice on stdout, got nothing"
    context = json.loads(out_text)["hookSpecificOutput"]["additionalContext"]
    assert f"habit-hooks failed to run on {target}" in context
    assert "GREEN report" in context


def test_run_habit_hooks_returns_127_with_empty_path_and_runs_no_uv(
    habit_coach, tmp_path, monkeypatch
):
    _, target = _make_repo(tmp_path)
    _empty_path(tmp_path, monkeypatch)
    argvs: list[list[str]] = []
    real_run = subprocess.run

    def recording_run(*args, **kwargs):
        argvs.append(list(args[0]))
        return real_run(*args, **kwargs)

    monkeypatch.setattr(habit_coach.subprocess, "run", recording_run)

    code, _text = habit_coach.run_habit_hooks(str(target))

    assert code == 127
    uv_calls = [argv for argv in argvs if argv and argv[0] == "uv"]
    assert uv_calls == [], f"the hook must not run uv, but it ran: {argvs!r}"


def test_main_green_with_empty_path_names_install_slash_command_and_runs_no_uv(
    habit_coach, tmp_path, monkeypatch
):
    _, target = _make_repo(tmp_path)
    _empty_path(tmp_path, monkeypatch)
    argvs: list[list[str]] = []
    real_run = subprocess.run

    def recording_run(*args, **kwargs):
        argvs.append(list(args[0]))
        return real_run(*args, **kwargs)

    monkeypatch.setattr(habit_coach.subprocess, "run", recording_run)
    stdin = io.StringIO(json.dumps(_green_payload(str(target))))
    stdout = io.StringIO()

    rc = habit_coach.main(stdin, stdout)

    assert rc == 0
    out_text = stdout.getvalue().strip()
    assert out_text, "expected the install notice on stdout, got nothing"
    context = json.loads(out_text)["hookSpecificOutput"]["additionalContext"]
    assert "/implement:install" in context
    uv_calls = [argv for argv in argvs if argv and argv[0] == "uv"]
    assert uv_calls == [], f"the hook must not run uv, but it ran: {argvs!r}"


def test_install_habit_hooks_is_removed(habit_coach):
    assert not hasattr(habit_coach, "install_habit_hooks"), (
        "the hook must not self-install habit-hooks"
    )


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


def test_install_mode_covers_root_package_json_jscpd_config_and_complete_run():
    """Install mode handles a repo with no root package.json or no src folder,
    and it does not report success while habit-hooks reports a broken tool."""
    text = (
        REPO_ROOT / "plugins" / "implement" / "skills" / "build" / "SKILL.md"
    ).read_text()
    start = text.index("## Install mode")
    end = text.index("## Implement mode")
    section = text[start:end]

    assert "node_modules/.bin" in section
    assert "no `package.json`" in section
    assert "tools-only" in section
    assert ".jscpd.json" in section
    assert "Nothing missing" in section
    assert "habit-hooks --branch" in section
    assert "incomplete-run" in section
    assert "force-exclude" in section


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


def test_implement_plugin_json_version_matches_marketplace():
    plugin_json_path = REPO_ROOT / "plugins" / "implement" / ".claude-plugin" / "plugin.json"
    marketplace_path = REPO_ROOT / ".claude-plugin" / "marketplace.json"
    assert plugin_json_path.exists(), f"missing {plugin_json_path}"
    assert marketplace_path.exists(), f"missing {marketplace_path}"
    data = json.loads(plugin_json_path.read_text())
    entry = next(
        p for p in json.loads(marketplace_path.read_text())["plugins"] if p["name"] == "implement"
    )
    assert data["version"] == entry["version"]
