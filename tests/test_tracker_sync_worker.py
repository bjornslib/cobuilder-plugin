"""The sync worker, the CLI sync and sync-worker operations, and one real-bd async run.

Run with: uv run pytest tests/test_tracker_sync_worker.py -q
"""
from __future__ import annotations

import pytest
import json
import tempfile
import threading
from pathlib import Path

import _beads_support as support
import _sync_support as s
from _tracker_cli_support import cli, cli_ops, ok

DOC = Path(__file__).resolve().parent.parent / "shared" / "tracker-usage.md"


def _run(repo, adapter):
    from tracker_port import sync_worker

    sync_worker.run(repo, lambda: adapter)


def test_worker_syncs_clears_flag_and_writes_status(tmp_path):
    s.mark_dirty(tmp_path)
    adapter = s.StubAdapter()
    _run(tmp_path, adapter)
    assert adapter.syncs == 1
    assert not (tmp_path / s.DIRTY).exists()
    body = s.status(tmp_path)
    assert body["ok"] is True and body["error"] in (None, "") and body["at"]
    assert not (tmp_path / ".cobuilder" / "runtime").exists()
    assert (tmp_path / s.GITIGNORE).read_text().splitlines().count("sync-*") == 1


def test_worker_loops_while_a_write_sets_the_flag_again(tmp_path):
    s.mark_dirty(tmp_path)
    adapter = s.StubAdapter(repo=tmp_path, redirty=2)
    _run(tmp_path, adapter)
    assert adapter.syncs == 3
    assert not (tmp_path / s.DIRTY).exists()


def test_worker_without_the_flag_does_not_sync(tmp_path):
    adapter = s.StubAdapter()
    _run(tmp_path, adapter)
    assert adapter.syncs == 0


def test_failed_sync_keeps_flag_records_error_and_stops(tmp_path):
    s.mark_dirty(tmp_path)
    adapter = s.StubAdapter(plan=["remote refused", None, None])
    _run(tmp_path, adapter)
    assert adapter.syncs == 1
    assert (tmp_path / s.DIRTY).is_file()
    body = s.status(tmp_path)
    assert body["ok"] is False and "remote refused" in body["error"]


def test_second_worker_exits_at_once_without_sync(tmp_path):
    s.mark_dirty(tmp_path)
    (tmp_path / s.COBUILDER).mkdir(parents=True, exist_ok=True)
    release = threading.Event()
    inside = threading.Event()

    class Slow(s.StubAdapter):
        def sync(self) -> None:
            super().sync()
            inside.set()
            assert release.wait(10)

    first, second = Slow(), s.StubAdapter()
    thread = threading.Thread(target=_run, args=(tmp_path, first))
    thread.start()
    try:
        assert inside.wait(10)
        _run(tmp_path, second)
        assert second.syncs == 0
    finally:
        release.set()
        thread.join(10)
    assert first.syncs == 1


def test_cli_sync_clears_flag_and_writes_status(tmp_path):
    repo = s.tracked_repo(tmp_path, "async")
    s.mark_dirty(repo)
    ok(cli(repo / ".cobuilder" / "tracker.yaml", repo, "sync"))
    assert not (repo / s.DIRTY).exists()
    assert s.status(repo)["ok"] is True


def test_cli_sync_worker_runs_in_the_foreground(tmp_path):
    assert "sync-worker" in cli_ops()
    repo = s.tracked_repo(tmp_path, "async")
    s.mark_dirty(repo)
    result = cli(repo / ".cobuilder" / "tracker.yaml", repo, "sync-worker")
    assert result.returncode == 0, result.stderr + result.stdout
    assert not (repo / s.DIRTY).exists()
    assert s.status(repo)["ok"] is True


def test_usage_doc_names_sync_worker():
    assert "sync-worker" in DOC.read_text(encoding="utf-8")


@pytest.mark.slow
def test_real_bd_async_write_then_worker_reaches_a_fresh_clone() -> None:
    support.require_bd()
    from tracker_port import sync_worker
    from tracker_port.bd_runner import BdRunner
    from tracker_port.beads import BeadsAdapter

    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        seed = support.scratch_tracker(root)
        spawner = s.RecordingSpawner()
        make = lambda: BeadsAdapter(BdRunner(bd="bd", cwd=seed))
        make().sync()  # the adapter handles the first publish to an empty remote
        BeadsAdapter(BdRunner(bd="bd", cwd=seed), sync="async", spawner=spawner, repo_root=seed).create_record(s.probe())
        assert len(spawner.calls) == 1 and (seed / s.DIRTY).is_file()
        sync_worker.run(seed, make)
        assert not (seed / s.DIRTY).exists() and s.status(seed)["ok"] is True
        clone = root / "clone"
        support.run(["git", "clone", "-q", str(root / "origin.git"), str(clone)], root)
        support.run(["bd", "init", "--skip-agents", "--skip-hooks", "-p", "demo", "--non-interactive"], clone)
        support.run(["bd", "sync"], clone)
        rows = json.loads(support.run(["bd", "list", "--json", "--all"], clone).stdout)
        assert "demo-probe" in [row["metadata"]["cb"]["id"] for row in rows]
