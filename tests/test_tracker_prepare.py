"""The `prepare` port operation: bd gets the `program` custom issue type, once and without loss.

Real-bd tests run in a temp dir. The transcript create_in_progress_steps.json holds the real bd
1.3.0 answers: `config get types.custom` prints `types.custom (not set)` when the key is unset.

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


class _RejectsType:
    """Answers a create with bd's invalid-issue-type error. Every other call works."""

    def __init__(self, stderr: str = "Error: validation failed: invalid issue type: program\n") -> None:
        self.stderr = stderr
        self.calls: list[list[str]] = []

    def run(self, args: list[str]) -> str:
        from tracker_port.bd_runner import BdError

        self.calls.append(list(args))
        if args[0] == "create":
            raise BdError(f"bd {' '.join(args)} exited 1", 1, self.stderr)
        return "types.custom (not set)\n" if args[:2] == ["config", "get"] else ""


def test_prepare_on_bd_without_custom_types_sets_exactly_program() -> None:
    support.require_bd()

    with tempfile.TemporaryDirectory() as tmp:
        adapter = ip.beads_adapter(Path(tmp), ip.CountingRunner)

        assert adapter.prepare() == {"changed": True}
        assert _types(adapter) == "program"


def test_prepare_twice_changes_once_and_the_second_call_sets_nothing() -> None:
    support.require_bd()

    with tempfile.TemporaryDirectory() as tmp:
        adapter = ip.beads_adapter(Path(tmp), ip.CountingRunner)
        adapter.prepare()
        adapter.runner.calls.clear()

        assert adapter.prepare() == {"changed": False}
        assert adapter.runner.count("config") == 1 and adapter.runner.calls[0][:2] == ["config", "get"], adapter.runner.calls


def test_prepare_keeps_the_existing_custom_types() -> None:
    support.require_bd()

    with tempfile.TemporaryDirectory() as tmp:
        adapter = ip.beads_adapter(Path(tmp), ip.CountingRunner)
        _set_types(adapter, "foo,bar")

        assert adapter.prepare() == {"changed": True}
        assert _types(adapter) == "foo,bar,program"


def test_prepare_does_nothing_when_program_is_among_the_types() -> None:
    support.require_bd()

    with tempfile.TemporaryDirectory() as tmp:
        adapter = ip.beads_adapter(Path(tmp), ip.CountingRunner)
        _set_types(adapter, "foo,program,bar")
        adapter.runner.calls.clear()

        assert adapter.prepare() == {"changed": False}
        assert _types(adapter) == "foo,program,bar"
        assert not any(call[:2] == ["config", "set"] for call in adapter.runner.calls), adapter.runner.calls


def test_prepare_replays_the_recorded_bd_answers() -> None:
    from tracker_port.beads import BeadsAdapter

    recorded = support.steps("create_in_progress_steps")
    runner = support.SequenceRunner([recorded[0], recorded[2]])

    assert BeadsAdapter(runner).prepare() == {"changed": True}
    assert runner.calls == [["config", "get", "types.custom"], ["config", "set", "types.custom", "program"]]


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


def test_cli_prepare_on_real_bd_changes_once(tmp_path: Path) -> None:
    support.require_bd()

    seed = support.scratch_tracker(tmp_path)
    config = tmp_path / "beads.yaml"
    config.write_text("adapter: beads\n", encoding="utf-8")

    assert cli_support.ok(cli_support.cli(config, seed, "prepare")) == {"changed": True}
    assert cli_support.ok(cli_support.cli(config, seed, "prepare")) == {"changed": False}


def test_create_record_of_a_program_succeeds_on_bd_without_custom_types() -> None:
    support.require_bd()

    with tempfile.TemporaryDirectory() as tmp:
        adapter = ip.beads_adapter(Path(tmp), ip.CountingRunner)
        assert _types(adapter).startswith("types.custom (not set)"), "the scratch tracker must start without types.custom"

        adapter.create_record(_program())

        assert ip.lifecycles(support.all_records(adapter)) == {"demo-prog": "open"}
        assert _types(adapter) == "program"


def test_create_record_retries_once_after_invalid_issue_type() -> None:
    from tracker_port.bd_runner import BdError
    from tracker_port.beads import BeadsAdapter

    runner = _RejectsType()
    with pytest.raises(BdError):
        BeadsAdapter(runner).create_record(_program())

    verbs = [call[0] for call in runner.calls]
    assert verbs.count("create") == 2, runner.calls
    assert runner.calls.count(["config", "set", "types.custom", "program"]) == 1, runner.calls


def test_create_record_does_not_retry_another_error() -> None:
    from tracker_port.bd_runner import BdError
    from tracker_port.beads import BeadsAdapter

    runner = _RejectsType(stderr="Error: database is locked\n")
    with pytest.raises(BdError):
        BeadsAdapter(runner).create_record(_program())

    assert [call[0] for call in runner.calls] == ["create"], runner.calls
