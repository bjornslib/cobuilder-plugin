"""Tests for the implement plugin SessionStart tracker reminder hook."""
from __future__ import annotations

import ast
import json
import re
import subprocess
from pathlib import Path

import pytest

REPO = Path(__file__).resolve().parent.parent
PLUGIN = REPO / "plugins" / "implement"
HOOKS = PLUGIN / "hooks" / "hooks.json"
SCRIPT = PLUGIN / "scripts" / "tracker_reminder.py"
TRACKER = REPO / "shared" / "tracker.py"
EVENTS = ("startup", "resume", "clear", "compact")
OPS = ("doctor", "list-programs", "next-ready", "claim-slice", "set-slice-state", "sync")


def _run(cwd: Path, stdin: str = "") -> tuple[int, str]:
    assert SCRIPT.exists(), f"missing {SCRIPT}"
    p = subprocess.run(
        ["uv", "run", str(SCRIPT)], cwd=cwd, input=stdin,
        capture_output=True, text=True, timeout=120,
    )
    return p.returncode, p.stdout


def _context(cwd: Path, stdin: str = "") -> str:
    code, out = _run(cwd, stdin)
    assert code == 0
    data = json.loads(out)
    spec = data["hookSpecificOutput"]
    assert spec["hookEventName"] == "SessionStart"
    return spec["additionalContext"]


@pytest.fixture()
def tracked(tmp_path: Path) -> Path:
    repo = tmp_path / "repo"
    (repo / ".cobuilder").mkdir(parents=True)
    (repo / ".cobuilder" / "tracker.yaml").write_text("adapter: files\n")
    return repo

def test_hooks_json_keeps_post_tool_use_and_adds_session_start():
    hooks = json.loads(HOOKS.read_text())["hooks"]
    assert hooks["PostToolUse"] == [{
        "matcher": "Write|Edit",
        "hooks": [{"type": "command",
                   "command": 'uv run "${CLAUDE_PLUGIN_ROOT}/scripts/habit_coach.py"'}],
    }]
    entries = hooks.get("SessionStart", [])
    assert len(entries) == 1
    entry = entries[0]
    for event in EVENTS:
        assert re.fullmatch(entry["matcher"], event), event
    cmd = entry["hooks"][0]["command"]
    assert "${CLAUDE_PLUGIN_ROOT}/scripts/tracker_reminder.py" in cmd
    assert SCRIPT.is_file()
    assert "PostCompact" not in hooks


def test_reminder_with_tracker_config(tracked):
    text = _context(tracked)
    for needle in ("/architect:design", "/implement:start", "shared/tracker-usage.md", *OPS):
        assert needle in text, needle
    assert "status files" in text and "goal.json" in text
    assert re.search(r"(not|never)[^.]*by hand", text, re.I)


def test_reminder_without_tracker_config(tmp_path):
    text = _context(tmp_path)
    assert "/cobuilder-full-lifecycle:install" in text
    assert "tracker.yaml" in text
    assert "claim-slice" not in text and "set-slice-state" not in text


def test_every_op_token_is_listed_by_tracker_help(tracked, tmp_path):
    help_out = subprocess.run(
        ["uv", "run", str(TRACKER), "--help"], capture_output=True, text=True, timeout=120
    ).stdout
    listed = set(re.search(r"\{([^}]+)\}", help_out).group(1).split(","))
    for cwd in (tracked, tmp_path):
        tokens = re.findall(r"tracker\.py\s+([a-z][a-z-]*)", _context(cwd))
        for t in tokens:
            assert t in listed, t
    assert re.findall(r"tracker\.py\s+([a-z][a-z-]*)", _context(tracked))


def test_script_has_no_subprocess_or_network_imports():
    assert SCRIPT.exists(), f"missing {SCRIPT}"
    banned = {"subprocess", "socket", "urllib", "http", "requests", "httpx"}
    for node in ast.walk(ast.parse(SCRIPT.read_text())):
        if isinstance(node, ast.Import):
            mods = [a.name for a in node.names]
        elif isinstance(node, ast.ImportFrom):
            mods = [node.module or ""]
        else:
            continue
        for m in mods:
            assert m.split(".")[0] not in banned, m


def test_payload_cwd_and_empty_stdin(tracked, tmp_path):
    payload = json.dumps({"hook_event_name": "SessionStart", "source": "compact",
                          "cwd": str(tracked)})
    assert "claim-slice" in _context(tmp_path, payload)
    assert "claim-slice" in _context(tracked, "")
    assert "claim-slice" not in _context(tmp_path, "")


def test_plugin_and_marketplace_versions_match_and_bumped():
    plugin = json.loads((PLUGIN / ".claude-plugin" / "plugin.json").read_text())["version"]
    market = json.loads((REPO / ".claude-plugin" / "marketplace.json").read_text())
    entry = next(p for p in market["plugins"] if p["name"] == "implement")
    assert plugin == entry["version"]
    assert tuple(int(x) for x in plugin.split(".")) >= (0, 11, 0)
