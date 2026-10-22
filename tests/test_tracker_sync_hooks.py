"""Stop and SessionEnd hooks for async sync, the install prose, the ADR, and the versions.

Run with: uv run pytest tests/test_tracker_sync_hooks.py -q
"""
from __future__ import annotations

import ast
import json
import re
import subprocess
from pathlib import Path

import pytest

import _sync_support as s

REPO = Path(__file__).resolve().parent.parent
PLUGIN = REPO / "plugins" / "implement"
SCRIPTS = {"Stop": PLUGIN / "scripts" / "tracker_sync_check.py", "SessionEnd": PLUGIN / "scripts" / "tracker_sync_flush.py"}


def _run(script: Path, cwd: Path, stdin: str = "") -> subprocess.CompletedProcess[str]:
    assert script.exists(), f"missing {script}"
    return subprocess.run(["uv", "run", str(script)], cwd=cwd, input=stdin, capture_output=True, text=True, timeout=120)


def test_hooks_json_keeps_old_entries_and_adds_stop_and_session_end():
    hooks = json.loads((PLUGIN / "hooks" / "hooks.json").read_text())["hooks"]
    assert hooks["PostToolUse"][0]["matcher"] == "Write|Edit"
    assert hooks["SessionStart"][0]["matcher"] == "startup|resume|clear|compact"
    for event, script in SCRIPTS.items():
        commands = [h for entry in hooks.get(event, []) for h in entry["hooks"]]
        assert len(commands) == 1, event
        assert commands[0]["type"] == "command"
        assert f"${{CLAUDE_PLUGIN_ROOT}}/scripts/{script.name}" in commands[0]["command"]
    assert hooks["SessionEnd"][0]["hooks"][0]["timeout"] == 60


@pytest.mark.parametrize("script", list(SCRIPTS.values()), ids=lambda p: p.stem)
def test_script_has_no_bd_or_network_imports(script):
    assert script.exists(), f"missing {script}"
    banned = {"socket", "urllib", "http", "requests", "httpx"}
    tree = ast.parse(script.read_text())
    for node in ast.walk(tree):
        mods = [a.name for a in node.names] if isinstance(node, ast.Import) else [node.module or ""] if isinstance(node, ast.ImportFrom) else []
        for m in mods:
            assert m.split(".")[0] not in banned, m
    assert not re.search(r"""["']bd["']""", script.read_text()), "the script must not call bd"


@pytest.mark.parametrize("script", list(SCRIPTS.values()), ids=lambda p: p.stem)
def test_script_exits_zero_without_config_with_config_and_with_payload(script, tmp_path):
    assert _run(script, tmp_path).returncode == 0
    repo = s.tracked_repo(tmp_path / "t", "async")
    assert _run(script, repo).returncode == 0
    assert _run(script, repo, json.dumps({"cwd": str(repo), "hook_event_name": "Stop"})).returncode == 0


def test_stop_script_spawns_nothing_when_sync_is_not_async(tmp_path):
    repo = s.tracked_repo(tmp_path, "write")
    s.mark_dirty(repo)
    assert _run(SCRIPTS["Stop"], repo).returncode == 0
    assert not (repo / s.STATUS).exists() and (repo / s.DIRTY).exists()


def test_flush_runs_one_synchronous_sync_when_dirty(tmp_path):
    repo = s.tracked_repo(tmp_path, "async")
    s.mark_dirty(repo)
    assert _run(SCRIPTS["SessionEnd"], repo).returncode == 0
    assert not (repo / s.DIRTY).exists()
    assert s.status(repo)["ok"] is True


def test_flush_does_nothing_when_clean(tmp_path):
    repo = s.tracked_repo(tmp_path, "async")
    assert _run(SCRIPTS["SessionEnd"], repo).returncode == 0
    assert not (repo / s.STATUS).exists()


def test_flush_retries_after_a_failed_last_sync(tmp_path):
    repo = s.tracked_repo(tmp_path, "async")
    (repo / s.RUNTIME).mkdir(parents=True)
    (repo / s.STATUS).write_text(json.dumps({"ok": False, "at": "2026-10-22T10:00:00Z", "error": "boom"}))
    assert _run(SCRIPTS["SessionEnd"], repo).returncode == 0
    assert s.status(repo)["ok"] is True


def test_setup_skill_asks_for_the_sync_mode():
    text = (REPO / "plugins/cobuilder-full-lifecycle/skills/cobuilder-setup/SKILL.md").read_text()
    assert "sync: async" in text and re.search(r"sync mode", text, re.I) and "async" in text and "recommend" in text.lower()


def test_adr_0042_exists_and_names_its_neighbours():
    files = sorted((REPO / "docs/architecture/adr").glob("ADR-0042-*.md"))
    assert files, "ADR-0042-*.md is missing"
    text = files[0].read_text()
    front = text.split("---")[1]
    assert re.search(r"^status:\s*\S+", front, re.M)
    assert "ADR-0041" in text and "ADR-0025" in text


def _version(path: str) -> tuple[int, ...]:
    return tuple(int(x) for x in json.loads((REPO / path).read_text())["version"].split("."))


def test_versions_are_bumped_and_match_the_marketplace():
    market = {p["name"]: p["version"] for p in json.loads((REPO / ".claude-plugin/marketplace.json").read_text())["plugins"]}
    for name, floor in (("implement", (0, 12, 0)), ("cobuilder-full-lifecycle", (0, 5, 4))):
        got = _version(f"plugins/{name}/.claude-plugin/plugin.json")
        assert got >= floor, (name, got)
        assert ".".join(map(str, got)) == market[name], name
