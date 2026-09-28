"""Tests for review_link.py, slice 1 of review-link (the tracer bullet).

Each test builds a temporary hub, starts a real http.server rooted at the
hub's .cobuilder-architect/ the way View mode does, and runs the script as a
subprocess. No test touches the real bundle or a running View server.

Run with: uv run pytest tests/test_review_link.py -q
"""
from __future__ import annotations

import json
import re
import subprocess
import sys
import time
from pathlib import Path

import pytest

REPO = Path(__file__).resolve().parent.parent
SCRIPT = REPO / "plugins" / "artifact" / "scripts" / "review_link.py"
SKILL = REPO / "plugins" / "artifact" / "skills" / "cobuilder-artifacts" / "SKILL.md"

WORK = "review-link"
ROUTE = f"#/{WORK}/build/epics"


def _make_hub(tmp_path: Path, with_viewer: bool = True) -> Path:
    hub = tmp_path / "hub"
    store = hub / ".cobuilder-architect"
    bundle = store / "self"
    (bundle / "data").mkdir(parents=True)
    (bundle / "viewer").mkdir(parents=True)
    index = {
        "schema_version": "1",
        "sources": {},
        "entities": {"design": [{"id": WORK, "name": WORK}, {"id": "other-work", "name": "other-work"}]},
        "joins": {},
    }
    (bundle / "data" / "index.json").write_text(json.dumps(index))
    if with_viewer:
        (bundle / "viewer" / "index.html").write_text("<!doctype html><title>viewer</title>")
    (store / "active").symlink_to(bundle.resolve())
    return hub


def _start_server(hub: Path) -> tuple[subprocess.Popen, int]:
    """Start http.server on an OS-assigned port, and write the pid and log files as View mode does."""
    store = hub / ".cobuilder-architect"
    logfile = store / ".view-server.log"
    log = open(logfile, "w")
    proc = subprocess.Popen(
        [sys.executable, "-u", "-m", "http.server", "0", "--bind", "127.0.0.1", "--directory", str(store)],
        stdout=log,
        stderr=subprocess.STDOUT,
    )
    log.close()
    (store / ".view-server.pid").write_text(f"{proc.pid}\n")
    deadline = time.time() + 10
    while time.time() < deadline:
        m = re.findall(r"port (\d+)", logfile.read_text())
        if m:
            return proc, int(m[-1])
        time.sleep(0.05)
    proc.kill()
    proc.wait()
    raise RuntimeError("http.server did not report a port")


@pytest.fixture
def served_hub(tmp_path):
    hub = _make_hub(tmp_path)
    proc, port = _start_server(hub)
    try:
        yield hub, port
    finally:
        proc.terminate()
        proc.wait(timeout=5)


def _run(hub: Path, route: str) -> subprocess.CompletedProcess:
    return subprocess.run(
        ["uv", "run", str(SCRIPT), "--hub", str(hub), "--route", route],
        capture_output=True,
        text=True,
        timeout=60,
    )


def test_script_exists():
    assert SCRIPT.is_file(), f"missing {SCRIPT}"


def test_prints_checked_deep_link(served_hub):
    hub, port = served_hub
    result = _run(hub, ROUTE)
    assert result.returncode == 0, result.stderr
    lines = [line for line in result.stdout.splitlines() if line.strip()]
    assert lines == [f"http://127.0.0.1:{port}/active/viewer/index.html{ROUTE}"]


def test_unknown_work_id_exits_1_with_empty_stdout(served_hub):
    hub, _ = served_hub
    result = _run(hub, "#/no-such-work/build/epics")
    assert result.returncode == 1
    assert result.stdout.strip() == ""
    assert result.stderr.strip() != ""


def test_missing_pid_file_exits_1(tmp_path):
    hub = _make_hub(tmp_path)
    (hub / ".cobuilder-architect" / ".view-server.log").write_text("Serving HTTP on 127.0.0.1 port 1 ...\n")
    result = _run(hub, ROUTE)
    assert result.returncode == 1
    assert result.stdout.strip() == ""
    assert result.stderr.strip() != ""


def test_dead_pid_exits_1(tmp_path):
    hub = _make_hub(tmp_path)
    proc, port = _start_server(hub)
    proc.terminate()
    proc.wait(timeout=5)
    result = _run(hub, ROUTE)
    assert result.returncode == 1
    assert result.stdout.strip() == ""
    assert result.stderr.strip() != ""


def test_viewer_404_exits_1(tmp_path):
    hub = _make_hub(tmp_path, with_viewer=False)
    proc, _ = _start_server(hub)
    try:
        result = _run(hub, ROUTE)
    finally:
        proc.terminate()
        proc.wait(timeout=5)
    assert result.returncode == 1
    assert result.stdout.strip() == ""
    assert result.stderr.strip() != ""


def test_view_mode_documents_route_argument():
    text = SKILL.read_text()
    assert "--route" in text, "View mode does not document --route"
    assert re.search(r"\$\{CLAUDE_PLUGIN_ROOT\}/scripts/review_link\.py", text), (
        "View mode does not call review_link.py through ${CLAUDE_PLUGIN_ROOT}"
    )
