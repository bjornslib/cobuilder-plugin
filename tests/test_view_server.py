"""Tests for view_server.py, the fixed-port View server starter.

Each test builds a temporary hub, passes --port with a free port, and uses
real processes. No test touches port 62583 or a running View server.

Run with: uv run pytest tests/test_view_server.py -q
"""
from __future__ import annotations

import os
import signal
import socket
import subprocess
import sys
import time
from pathlib import Path

import pytest

REPO = Path(__file__).resolve().parent.parent
SCRIPT = REPO / "plugins" / "artifact" / "scripts" / "view_server.py"


def _free_port() -> int:
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


def _make_hub(root: Path) -> Path:
    store = root / ".cobuilder-architect"
    store.mkdir(parents=True)
    return root


def _wait_listening(port: int, timeout: float = 10) -> None:
    deadline = time.time() + timeout
    while time.time() < deadline:
        with socket.socket() as s:
            if s.connect_ex(("127.0.0.1", port)) == 0:
                return
        time.sleep(0.05)
    raise RuntimeError(f"nothing listens on {port}")


def _alive(pid: int) -> bool:
    try:
        os.kill(pid, 0)
    except ProcessLookupError:
        return False
    # A zombie still answers kill 0. Treat it as dead.
    out = subprocess.run(["ps", "-o", "stat=", "-p", str(pid)], capture_output=True, text=True).stdout
    return bool(out.strip()) and not out.strip().startswith("Z")


def _run(hub: Path, port: int) -> subprocess.CompletedProcess:
    return subprocess.run(
        [sys.executable, str(SCRIPT), "--hub", str(hub), "--port", str(port)],
        capture_output=True, text=True, timeout=30,
    )


@pytest.fixture
def cleanup():
    pids: list[int] = []
    procs: list[subprocess.Popen] = []
    yield pids, procs
    for p in procs:
        if p.poll() is None:
            p.kill()
        p.wait(timeout=5)
    for pid in pids:
        try:
            os.kill(pid, signal.SIGKILL)
        except ProcessLookupError:
            pass


def _started_pid(hub: Path) -> int:
    return int((hub / ".cobuilder-architect" / ".view-server.pid").read_text().strip())


def test_fresh_start_when_port_is_free(tmp_path, cleanup):
    pids, _ = cleanup
    hub = _make_hub(tmp_path / "hub")
    port = _free_port()
    r = _run(hub, port)
    assert SCRIPT.exists()
    pid = _started_pid(hub)
    pids.append(pid)
    assert r.returncode == 0, r.stderr
    _wait_listening(port)
    log = (hub / ".cobuilder-architect" / ".view-server.log").read_text()
    assert f"port {port}" in log
    assert f"http://localhost:{port}/active/viewer/" in r.stdout


def test_reuse_when_same_hub_is_served(tmp_path, cleanup):
    pids, _ = cleanup
    hub = _make_hub(tmp_path / "hub")
    port = _free_port()
    first = _run(hub, port)
    assert first.returncode == 0, first.stderr
    pid = _started_pid(hub)
    pids.append(pid)
    second = _run(hub, port)
    assert second.returncode == 0, second.stderr
    assert "reus" in second.stdout.lower()
    assert _started_pid(hub) == pid
    assert _alive(pid)


def test_restart_when_http_server_serves_another_directory(tmp_path, cleanup):
    pids, procs = cleanup
    hub = _make_hub(tmp_path / "hub")
    other = tmp_path / "other"
    other.mkdir()
    port = _free_port()
    foreign = subprocess.Popen(
        [sys.executable, "-m", "http.server", str(port), "--bind", "127.0.0.1", "--directory", str(other)],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    )
    procs.append(foreign)
    _wait_listening(port)
    r = _run(hub, port)
    assert r.returncode == 0, r.stderr
    new_pid = _started_pid(hub)
    pids.append(new_pid)
    foreign.wait(timeout=5)
    assert new_pid != foreign.pid
    assert _alive(new_pid)
    _wait_listening(port)


def test_refuse_when_other_program_holds_port(tmp_path, cleanup):
    _, procs = cleanup
    hub = _make_hub(tmp_path / "hub")
    port = _free_port()
    code = (
        "import socket,time\n"
        "s=socket.socket(); s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)\n"
        f"s.bind(('127.0.0.1',{port})); s.listen(); time.sleep(60)\n"
    )
    holder = subprocess.Popen([sys.executable, "-c", code])
    procs.append(holder)
    _wait_listening(port)
    r = _run(hub, port)
    assert r.returncode != 0
    assert str(holder.pid) in r.stderr
    assert holder.poll() is None
    assert not (hub / ".cobuilder-architect" / ".view-server.pid").exists()
