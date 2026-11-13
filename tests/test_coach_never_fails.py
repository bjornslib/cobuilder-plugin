"""Regression tests for slice 4 of structure-coaching (E2): the coach never fails.

Each test runs habit_coach.py as the hook process. A stub habit-hooks binary is first on
PATH. The stub prints a known line and exits 1. Each test asserts exit code 0 and an empty
stderr. For a GREEN write of a .py file, the known line must appear in additionalContext.

Inputs 1 to 4 run copies of the coach scripts and of shared/ in tmp_path. Each copy holds one
broken message file. Inputs 5 to 7 run the real script. The new file has a generic name, so
the structure runner renders a template. Without that, a broken template never runs.

No test writes to a real file of this repo. Each session record goes to a folder in tmp_path.

Run with: uv run pytest tests/test_coach_never_fails.py -q
"""
from __future__ import annotations

import json
import os
import shlex
import shutil
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
COACH_PATH = REPO_ROOT / "plugins" / "implement" / "scripts" / "habit_coach.py"
RUNNER_PATH = REPO_ROOT / "plugins" / "implement" / "scripts" / "structure_runner.py"
SHARED_PATH = REPO_ROOT / "shared"
MESSAGES_NAME = "structure-messages.json"
KNOWN_LINE = "known habit-hooks line 4f1c from the stub"
COMMIT_OPTIONS = ("-c", "user.name=t", "-c", "user.email=t@t", "-c", "commit.gpgsign=false")


def _git(repo: Path, *args: str) -> None:
    subprocess.run(["git", "-C", str(repo), *args], check=True, capture_output=True)


def _repo_with_new_file(tmp_path: Path) -> tuple[Path, Path]:
    """Return a repo and one new file at its root. The name helpers is a generic name."""
    repo = (tmp_path / "repo").resolve()
    repo.mkdir()
    _git(repo, "init", "-q")
    (repo / "keep.py").write_text("KEEP = 1\n")
    _git(repo, "add", "-A")
    _git(repo, *COMMIT_OPTIONS, "commit", "-q", "-m", "base")
    new = repo / "helpers.py"
    new.write_text("X = 1\n")
    return repo, new


def _green_payload(file_path: object, session_id: object = "never-fails") -> str:
    """Return the stdin text of one GREEN write."""
    return json.dumps({
        "agent_type": "implement:green",
        "session_id": session_id,
        "tool_name": "Write",
        "tool_input": {"file_path": file_path},
    })


def _hook_env(tmp_path: Path) -> dict[str, str]:
    """Return the environment with a stub habit-hooks first on PATH.

    The stub prints KNOWN_LINE and exits 1. The session records go to a folder in tmp_path.
    """
    bin_dir = tmp_path / "stub-bin"
    bin_dir.mkdir(exist_ok=True)
    stub = bin_dir / "habit-hooks"
    stub.write_text(f"#!/bin/sh\nprintf '%s\\n' {shlex.quote(KNOWN_LINE)}\nexit 1\n")
    stub.chmod(0o755)
    temp = tmp_path / "coach-temp"
    temp.mkdir(exist_ok=True)
    env = dict(os.environ)
    env["PATH"] = f"{bin_dir}{os.pathsep}{os.environ.get('PATH', '')}"
    env["TMPDIR"] = str(temp)
    return env


def _run_hook(script: Path, repo: Path, tmp_path: Path, stdin_text: str) -> subprocess.CompletedProcess:
    """Run the coach script as the hook process, from the repo folder."""
    return subprocess.run(
        [sys.executable, str(script)],
        cwd=str(repo),
        env=_hook_env(tmp_path),
        input=stdin_text,
        capture_output=True,
        text=True,
        timeout=60,
    )


def _real_messages() -> dict:
    """Return the message templates of the real message file. The file is only read."""
    return json.loads((SHARED_PATH / MESSAGES_NAME).read_text(encoding="utf-8"))


def _copy_with_messages(tmp_path: Path, messages: dict) -> Path:
    """Copy the coach scripts and shared/ into tmp_path, and write messages into the copy.

    The copy keeps the repo layout. plugins/implement/shared links to the copied shared folder.
    Return the path of the copied habit_coach.py.
    """
    root = tmp_path / "scratch"
    scripts = root / "plugins" / "implement" / "scripts"
    scripts.mkdir(parents=True)
    shutil.copy2(COACH_PATH, scripts / "habit_coach.py")
    shutil.copy2(RUNNER_PATH, scripts / "structure_runner.py")
    shutil.copytree(SHARED_PATH, root / "shared", ignore=shutil.ignore_patterns("__pycache__"))
    (root / "plugins" / "implement" / "shared").symlink_to(Path("..", "..", "shared"))
    (root / "shared" / MESSAGES_NAME).write_text(json.dumps(messages), encoding="utf-8")
    return scripts / "habit_coach.py"


def _run_copy(tmp_path: Path, messages: dict) -> subprocess.CompletedProcess:
    """Run a copy of the coach, with messages in its message file, on a GREEN write."""
    coach = _copy_with_messages(tmp_path, messages)
    repo, new = _repo_with_new_file(tmp_path)
    return _run_hook(coach, repo, tmp_path, _green_payload(str(new)))


def _assert_clean_exit(proc: subprocess.CompletedProcess) -> None:
    """Assert that the coach exited 0 and wrote nothing to stderr."""
    assert proc.returncode == 0, f"the coach exited {proc.returncode}. stderr: {proc.stderr}"
    assert proc.stderr == "", f"the coach wrote to stderr: {proc.stderr!r}"


def _assert_known_line_kept(proc: subprocess.CompletedProcess) -> None:
    """Assert that the stub line is in the additionalContext of the coach output."""
    assert proc.stdout.strip(), "the coach printed nothing for a GREEN write of a .py file"
    context = json.loads(proc.stdout)["hookSpecificOutput"]["additionalContext"]
    assert KNOWN_LINE in context, f"the stub line is missing from additionalContext: {context!r}"


def _is_json(text: str) -> bool:
    try:
        json.loads(text)
    except ValueError:
        return False
    return True


def _assert_empty_or_json(stdout: str) -> None:
    """Assert that stdout is empty or holds one valid JSON document."""
    assert not stdout.strip() or _is_json(stdout), f"stdout is neither empty nor JSON: {stdout!r}"


def test_input_1_message_file_without_header_exits_zero_and_keeps_habit_line(tmp_path):
    messages = _real_messages()
    del messages["header"]
    proc = _run_copy(tmp_path, messages)
    _assert_clean_exit(proc)
    _assert_known_line_kept(proc)


def test_input_2_attribute_lookup_in_template_exits_zero_and_keeps_habit_line(tmp_path):
    messages = _real_messages()
    messages["generic-name"] = "{path.x} has the generic name {stem}."
    proc = _run_copy(tmp_path, messages)
    _assert_clean_exit(proc)
    _assert_known_line_kept(proc)


def test_input_3_index_lookup_in_template_exits_zero_and_keeps_habit_line(tmp_path):
    messages = _real_messages()
    messages["generic-name"] = "{path[x]} has the generic name {stem}."
    proc = _run_copy(tmp_path, messages)
    _assert_clean_exit(proc)
    _assert_known_line_kept(proc)


def test_input_4_number_template_value_exits_zero_and_keeps_habit_line(tmp_path):
    messages = _real_messages()
    messages["generic-name"] = 42
    proc = _run_copy(tmp_path, messages)
    _assert_clean_exit(proc)
    _assert_known_line_kept(proc)


def test_input_5_numeric_session_id_exits_zero_and_keeps_habit_line(tmp_path):
    repo, new = _repo_with_new_file(tmp_path)
    proc = _run_hook(COACH_PATH, repo, tmp_path, _green_payload(str(new), session_id=12345))
    _assert_clean_exit(proc)
    _assert_known_line_kept(proc)


def test_input_6_json_that_is_not_an_object_exits_zero_with_no_broken_output(tmp_path):
    repo, _new = _repo_with_new_file(tmp_path)
    proc = _run_hook(COACH_PATH, repo, tmp_path, json.dumps(["implement:green"]))
    _assert_clean_exit(proc)
    _assert_empty_or_json(proc.stdout)


def test_input_7_file_path_that_is_not_a_string_exits_zero_with_no_broken_output(tmp_path):
    repo, _new = _repo_with_new_file(tmp_path)
    proc = _run_hook(COACH_PATH, repo, tmp_path, _green_payload(42))
    _assert_clean_exit(proc)
    _assert_empty_or_json(proc.stdout)
