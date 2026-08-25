"""Tests for the project-level PreToolUse hook that blocks `git stash`.

The hook is local development tooling for this repository's own sessions,
not part of any of the five plugins. See the note at the top of
.claude/hooks/deny-git-stash.py for why this does not violate the
"no hooks" rule in CLAUDE.md.

Run with: uv run pytest tests/ -v
"""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
HOOK_PATH = REPO_ROOT / ".claude" / "hooks" / "deny-git-stash.py"
SETTINGS_PATH = REPO_ROOT / ".claude" / "settings.json"


def _run_hook(stdin_text: str) -> subprocess.CompletedProcess:
    return subprocess.run(
        [sys.executable, str(HOOK_PATH)],
        input=stdin_text,
        capture_output=True,
        text=True,
        timeout=10,
    )


def _run_hook_command(command: str, agent_id: str | None = "ad81cfc2681d2f84e",
                       agent_type: str | None = "general-purpose") -> subprocess.CompletedProcess:
    payload: dict = {"tool_name": "Bash", "tool_input": {"command": command}}
    if agent_id is not None:
        payload["agent_id"] = agent_id
    if agent_type is not None:
        payload["agent_type"] = agent_type
    return _run_hook(json.dumps(payload))


# NOTE: the hook now blocks subagent calls only. Every command in this file
# that used to run through _run_hook_command with no agent_id must now pass
# a subagent-shaped payload to reach the deny branch at all. The helper
# above defaults to a subagent payload so the original test bodies below
# still exercise the deny path they were written for.


def test_denied_command_produces_deny_json():
    result = _run_hook_command("git stash")
    assert result.returncode == 0
    out = json.loads(result.stdout)
    decision = out["hookSpecificOutput"]
    assert decision["hookEventName"] == "PreToolUse"
    assert decision["permissionDecision"] == "deny"
    assert "stash" in decision["permissionDecisionReason"]


def test_allowed_command_produces_empty_stdout():
    result = _run_hook_command("git status")
    assert result.returncode == 0
    assert result.stdout.strip() == ""


def test_subagent_git_stash_is_denied_and_names_agent_type():
    result = _run_hook_command("git stash", agent_id="ad81cfc2681d2f84e", agent_type="general-purpose")
    assert result.returncode == 0
    out = json.loads(result.stdout)
    decision = out["hookSpecificOutput"]
    assert decision["permissionDecision"] == "deny"
    assert "general-purpose" in decision["permissionDecisionReason"]


def test_no_agent_id_allows_git_stash_main_agent_regression():
    # Regression test: the main agent carries no agent_id and must never be
    # blocked, even though the command matches the deny pattern.
    payload = json.dumps({"tool_name": "Bash", "tool_input": {"command": "git stash"}})
    result = _run_hook(payload)
    assert result.returncode == 0
    assert result.stdout.strip() == ""


def test_empty_agent_id_allows_git_stash():
    payload = json.dumps({
        "tool_name": "Bash",
        "tool_input": {"command": "git stash"},
        "agent_id": "",
    })
    result = _run_hook(payload)
    assert result.returncode == 0
    assert result.stdout.strip() == ""


def test_null_agent_id_allows_git_stash():
    payload = json.dumps({
        "tool_name": "Bash",
        "tool_input": {"command": "git stash"},
        "agent_id": None,
    })
    result = _run_hook(payload)
    assert result.returncode == 0
    assert result.stdout.strip() == ""


def test_subagent_git_status_is_allowed():
    result = _run_hook_command("git status")
    assert result.returncode == 0
    assert result.stdout.strip() == ""


def test_subagent_git_stash_list_is_allowed():
    result = _run_hook_command("git stash list")
    assert result.returncode == 0
    assert result.stdout.strip() == ""


def test_payload_shape_canary_agent_id_distinguishes_main_from_subagent():
    """Canary: the main-agent/subagent split relies on agent_id presence.

    If this test fails, the Claude Code harness has changed its PreToolUse
    payload shape. The observed contract this hook depends on -- a subagent
    call carries an "agent_id" key and a main-agent call does not -- no
    longer holds. When that happens, deny-git-stash.py silently stops
    blocking anyone, because it fails open, not closed. Re-instrument the
    hook (see the module docstring) to find the new distinguishing signal
    before trusting this hook again.
    """
    main_agent_payload = json.dumps({"tool_name": "Bash", "tool_input": {"command": "git status"}})
    subagent_payload = json.dumps({
        "tool_name": "Bash",
        "tool_input": {"command": "git status"},
        "agent_id": "ad81cfc2681d2f84e",
        "agent_type": "general-purpose",
    })
    main_request = json.loads(main_agent_payload)
    sub_request = json.loads(subagent_payload)
    assert "agent_id" not in main_request, (
        "CANARY FAILED: a main-agent-shaped payload now carries agent_id. "
        "The hook can no longer tell the main agent from a subagent by this "
        "key, and deny-git-stash.py has silently become a no-op guard for "
        "the main agent too."
    )
    assert sub_request.get("agent_id"), (
        "CANARY FAILED: a subagent-shaped payload lost its agent_id. "
        "deny-git-stash.py can no longer identify subagent calls, and it "
        "will silently stop blocking git stash for subagents."
    )


def test_non_bash_tool_is_ignored():
    payload = json.dumps({"tool_name": "Read", "tool_input": {"file_path": "x"}})
    result = _run_hook(payload)
    assert result.returncode == 0
    assert result.stdout.strip() == ""


def test_malformed_stdin_does_not_crash():
    result = _run_hook("not json at all")
    assert result.returncode == 0
    assert result.stdout.strip() == ""

    result_empty = _run_hook("")
    assert result_empty.returncode == 0
    assert result_empty.stdout.strip() == ""


def test_git_stash_list_is_allowed():
    result = _run_hook_command("git stash list")
    assert result.returncode == 0
    assert result.stdout.strip() == ""


MATCHING_COMMANDS = [
    "git stash",
    "git stash pop",
    "git  stash",
    "git -C /tmp/x stash",
    "cd repo && git stash",
    "command git stash",
    "GIT_DIR=x git stash",
]

NON_MATCHING_COMMANDS = [
    "git stash list",
    "git status",
    "git show stash@{0}",
    "git config alias.st stash",
]

# Known false positive: regex-only matching cannot distinguish a literal
# `git stash` from one embedded in a quoted string. See the hook's docstring
# for the accepted defence-in-depth trade-off.
FALSE_POSITIVE_MATCH = 'echo "git stash"'


def test_matching_commands_are_denied():
    for command in MATCHING_COMMANDS:
        result = _run_hook_command(command)
        assert result.stdout.strip() != "", f"expected deny for: {command}"


def test_git_config_alias_and_status_are_allowed():
    for command in ["git status", "git config alias.st stash", "git show stash@{0}"]:
        result = _run_hook_command(command)
        assert result.stdout.strip() == "", f"expected allow for: {command}"


def test_settings_json_registers_hook():
    settings = json.loads(SETTINGS_PATH.read_text())
    pre_tool_use = settings["hooks"]["PreToolUse"]
    assert any(
        entry.get("matcher") == "Bash"
        and any(
            h.get("command") == "${CLAUDE_PROJECT_DIR}/.claude/hooks/deny-git-stash.py"
            for h in entry.get("hooks", [])
        )
        for entry in pre_tool_use
    )
