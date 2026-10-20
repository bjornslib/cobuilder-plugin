"""The files adapter previews a backfill: seed-from-files --dry-run works, and a real seed refuses.

A files adapter holds none of the records in a tracker, so the dry run returns every record of the
plan tree. Without --dry-run the adapter still refuses with exit 2 and writes nothing.

Run with: uv run pytest tests/test_tracker_files_seed_dry_run.py -q
"""
from __future__ import annotations

import json
from pathlib import Path

import pytest

import _tracker_cli_support as support

PLANS_DIR = support.FIXTURES / "plans"


def _files_config(tmp_path: Path) -> Path:
    config = tmp_path / ".cobuilder" / "tracker.yaml"
    config.parent.mkdir(parents=True, exist_ok=True)
    config.write_text(f"adapter: files\nplans_dir: {json.dumps(str(PLANS_DIR))}\n", encoding="utf-8")
    return config


def test_files_adapter_dry_run_returns_every_plan_record() -> None:
    from tracker_port.files import FilesAdapter, seedable_records

    adapter = FilesAdapter(PLANS_DIR)

    creates = adapter.seed_from_files(PLANS_DIR, dry_run=True)

    planned, _ = seedable_records(PLANS_DIR)
    assert creates == planned
    assert {"beads-storage-mini", "beads-storage-mini/E1", "beads-storage-mini/1"} <= {r.id for r in creates}


def test_files_adapter_seed_without_dry_run_still_refuses() -> None:
    from tracker_port.port import NoAdapterError
    from tracker_port.files import FilesAdapter

    with pytest.raises(NoAdapterError):
        FilesAdapter(PLANS_DIR).seed_from_files(PLANS_DIR)


def test_cli_dry_run_on_the_files_adapter_exits_0_with_the_fake_adapter_shape(tmp_path: Path) -> None:
    from tracker_port.files import seedable_records

    files_run = support.cli(_files_config(tmp_path), tmp_path, "seed-from-files", str(PLANS_DIR), "--dry-run")
    fake_run = support.cli(support.fake_config(tmp_path / "fake"), tmp_path, "seed-from-files", str(PLANS_DIR), "--dry-run")

    assert files_run.returncode == 0, files_run.stderr + files_run.stdout
    files_body = json.loads(files_run.stdout)
    fake_body = json.loads(fake_run.stdout)
    assert files_body["ok"] is True
    assert set(files_body) == set(fake_body)
    assert files_body["result"], "the dry run lists the creates"
    assert set(files_body["result"][0]) == set(fake_body["result"][0])
    planned, _ = seedable_records(PLANS_DIR)
    assert [item["id"] for item in files_body["result"]] == [r.id for r in planned]


def test_cli_seed_without_dry_run_on_the_files_adapter_exits_2_and_writes_nothing(tmp_path: Path) -> None:
    config = _files_config(tmp_path)
    before = support.snapshot(tmp_path)

    result = support.cli(config, tmp_path, "seed-from-files", str(PLANS_DIR))

    assert result.returncode == 2, result.stderr + result.stdout
    assert json.loads(result.stdout)["ok"] is False
    assert support.snapshot(tmp_path) == before
