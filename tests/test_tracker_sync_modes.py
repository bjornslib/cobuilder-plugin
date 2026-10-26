"""Async sync: the tracker.yaml `sync` key, the adapter modes, and the doctor result.

Run with: uv run pytest tests/test_tracker_sync_modes.py -q
"""
from __future__ import annotations

import json

import pytest

import _beads_support as support
import _sync_support as s


def _adapter_of(tmp_path, sync):
    from tracker_port.config import load_adapter

    config = s.beads_config(tmp_path, sync)
    return load_adapter(config, tmp_path)


@pytest.mark.parametrize("mode", ["write", "async", "off"])
def test_load_adapter_reads_the_sync_mode(tmp_path, mode):
    assert _adapter_of(tmp_path, mode).sync_mode == mode


def test_load_adapter_defaults_to_async_for_beads(tmp_path):
    adapter = _adapter_of(tmp_path, None)
    assert adapter.sync_mode == "async"
    assert adapter.doctor_details()["sync"] == "async"


@pytest.mark.parametrize("kind", ["files", "fake"])
def test_other_adapters_ignore_the_sync_key(tmp_path, kind):
    from tracker_port.config import load_adapter

    config = tmp_path / ".cobuilder" / "tracker.yaml"
    config.parent.mkdir(parents=True)
    lines = {"files": f"adapter: files\nplans_dir: {tmp_path}\n", "fake": f"adapter: fake\ncorpus: {support.FIXTURE_DIR / 'corpus'}\n"}
    config.write_text(lines[kind] + "sync: async\n", encoding="utf-8")
    assert not hasattr(load_adapter(config, tmp_path), "sync_mode")


def test_load_adapter_rejects_an_unknown_sync_value(tmp_path):
    from tracker_port.port import AdapterError

    with pytest.raises(AdapterError, match="sync"):
        _adapter_of(tmp_path, "sometimes")


def test_write_mode_still_syncs_and_never_spawns(tmp_path):
    spawner = s.RecordingSpawner()
    runner = support.CreateAnswers()
    s.async_adapter(tmp_path, runner, spawner, "write").create_record(s.probe())
    assert runner.calls[-1] == ["sync"], runner.calls
    assert spawner.calls == []
    assert not (tmp_path / s.DIRTY).exists()


def test_async_write_skips_bd_sync_sets_flag_and_spawns_once(tmp_path):
    spawner = s.RecordingSpawner()
    runner = support.CreateAnswers()
    s.async_adapter(tmp_path, runner, spawner).create_record(s.probe())
    assert ["sync"] not in runner.calls, runner.calls
    assert (tmp_path / s.DIRTY).is_file()
    assert len(spawner.calls) == 1


def test_async_write_spawns_nothing_while_the_worker_lock_is_held(tmp_path):
    import fcntl

    spawner = s.RecordingSpawner()
    (tmp_path / s.COBUILDER).mkdir(parents=True)
    with open(tmp_path / s.LOCK, "w") as held:
        fcntl.flock(held, fcntl.LOCK_EX | fcntl.LOCK_NB)
        s.async_adapter(tmp_path, support.CreateAnswers(), spawner).create_record(s.probe())
    assert (tmp_path / s.DIRTY).is_file()
    assert spawner.calls == []


def test_off_mode_never_syncs_and_never_spawns(tmp_path):
    spawner = s.RecordingSpawner()
    runner = support.CreateAnswers()
    s.async_adapter(tmp_path, runner, spawner, "off").create_record(s.probe())
    assert ["sync"] not in runner.calls, runner.calls
    assert spawner.calls == []


def test_doctor_reports_mode_pending_and_last_sync(tmp_path):
    adapter = s.async_adapter(tmp_path, support.ListOnlyRunner([]), s.RecordingSpawner())
    details = adapter.doctor_details()
    assert details["sync"] == "async" and details["sync_pending"] is False
    s.mark_dirty(tmp_path)
    (tmp_path / s.STATUS).write_text(json.dumps({"ok": False, "at": "2026-10-22T10:00:00Z", "error": "boom"}))
    details = adapter.doctor_details()
    assert details["sync_pending"] is True
    assert details["last_sync"] == {"ok": False, "at": "2026-10-22T10:00:00Z", "error": "boom"}


def test_doctor_in_write_mode_has_no_pending_keys(tmp_path):
    details = s.async_adapter(tmp_path, support.ListOnlyRunner([]), s.RecordingSpawner(), "write").doctor_details()
    assert details["sync"] == "write"
    assert "sync_pending" not in details and "last_sync" not in details
