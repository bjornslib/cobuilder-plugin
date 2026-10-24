"""The `prepare` port operation: bd needs no custom issue type, so prepare sets none and changes nothing.

Real-bd tests run in a temp dir. A tracker whose `types.custom` lacks `program`, or holds other entries,
still takes a program create, because a program is the native type `feature` (ADR-0044).
The replay test of the argv is in test_tracker_beads_mapping_legacy.py.

Run with: uv run pytest tests/test_tracker_prepare.py -q
"""
from __future__ import annotations

import json
import tempfile
from pathlib import Path
from typing import Any

import pytest

import _beads_support as support
import _inprogress_support as ip
import _tracker_cli_support as cli_support
from _tracker_port_support import CORPUS


def _types(adapter: Any) -> str:
    return adapter.runner.inner.run(["config", "get", "types.custom"]).strip()


def _set_types(adapter: Any, value: str) -> None:
    adapter.runner.inner.run(["config", "set", "types.custom", value])


def _program() -> Any:
    from tracker_port.record import TrackerRecord

    return TrackerRecord(
        id="demo-prog", kind="program", parent=None, blocked_by=(), lifecycle="open",
        assignee=None, envelope={}, external_ref=None,
    )


@pytest.mark.slow
def test_prepare_on_bd_without_custom_types_sets_nothing() -> None:
    support.require_bd()

    with tempfile.TemporaryDirectory() as tmp:
        adapter = ip.beads_adapter(Path(tmp), ip.CountingRunner)
        assert _types(adapter).startswith("types.custom (not set)")

        assert adapter.prepare() == {"changed": False}

        assert _types(adapter).startswith("types.custom (not set)")
        assert not any(call[:2] == ["config", "set"] for call in adapter.runner.calls), adapter.runner.calls


@pytest.mark.slow
def test_prepare_keeps_the_existing_custom_types() -> None:
    support.require_bd()

    with tempfile.TemporaryDirectory() as tmp:
        adapter = ip.beads_adapter(Path(tmp), ip.CountingRunner)
        _set_types(adapter, "foo,bar")

        assert adapter.prepare() == {"changed": False}

        assert _types(adapter) == "foo,bar"


@pytest.mark.slow
def test_create_record_of_a_program_succeeds_on_bd_without_the_program_type() -> None:
    support.require_bd()

    with tempfile.TemporaryDirectory() as tmp:
        adapter = ip.beads_adapter(Path(tmp), ip.CountingRunner)
        assert _types(adapter).startswith("types.custom (not set)"), "the scratch tracker must start without types.custom"

        adapter.create_record(_program())

        assert ip.lifecycles(support.all_records(adapter)) == {"demo-prog": "open"}
        assert _types(adapter).startswith("types.custom (not set)"), "a create must not set a custom type"


@pytest.mark.slow
def test_create_record_of_a_program_succeeds_on_a_tracker_whose_custom_types_lack_program() -> None:
    support.require_bd()

    with tempfile.TemporaryDirectory() as tmp:
        adapter = ip.beads_adapter(Path(tmp), ip.CountingRunner)
        _set_types(adapter, "foo,bar")

        adapter.create_record(_program())

        assert ip.lifecycles(support.all_records(adapter)) == {"demo-prog": "open"}
        assert _types(adapter) == "foo,bar"
        assert not any(call[:2] == ["config", "set"] for call in adapter.runner.calls), adapter.runner.calls


def test_prepare_on_the_fake_and_files_adapters_changes_nothing(tmp_path: Path) -> None:
    from tracker_port.fake import FakeAdapter
    from tracker_port.files import FilesAdapter

    assert FakeAdapter(CORPUS, state_file=tmp_path / "state.json").prepare() == {"changed": False}
    assert FilesAdapter(ip.PLANS_DIR).prepare() == {"changed": False}
    assert not (tmp_path / "state.json").exists(), "prepare wrote fake state"


def test_cli_prepare_prints_changed_false_for_fake_and_files(tmp_path: Path) -> None:
    fake = cli_support.fake_config(tmp_path)
    assert cli_support.ok(cli_support.cli(fake, tmp_path, "prepare")) == {"changed": False}

    files = tmp_path / "files.yaml"
    files.write_text(f"adapter: files\nplans_dir: {json.dumps(str(ip.PLANS_DIR))}\n", encoding="utf-8")
    assert cli_support.ok(cli_support.cli(files, tmp_path, "prepare")) == {"changed": False}


def test_cli_prepare_without_an_adapter_exits_2(tmp_path: Path) -> None:
    result = cli_support.cli(tmp_path / "none.yaml", tmp_path, "prepare")

    assert result.returncode == 2, result.stderr + result.stdout
    assert json.loads(result.stdout)["ok"] is False


@pytest.mark.slow
def test_cli_prepare_on_real_bd_changes_nothing_twice(tmp_path: Path) -> None:
    support.require_bd()

    seed = support.scratch_tracker(tmp_path)
    config = tmp_path / "beads.yaml"
    config.write_text("adapter: beads\nsync: write\n", encoding="utf-8")

    assert cli_support.ok(cli_support.cli(config, seed, "prepare")) == {"changed": False}
    assert cli_support.ok(cli_support.cli(config, seed, "prepare")) == {"changed": False}
