"""Slice 29 (E7-7): the port operation `migrate_mapping`, and `tracker.py migrate-mapping [--dry-run] [--plans-dir DIR]`.

The port signature is `migrate_mapping(self, dry_run=False, plans_dir=None)`. The CLI prints the report as the
result and exits 0, with no write on a dry run. A bd failure exits 3, a bad flag exits 4, and the files adapter
exits 2 for a dry run too. The fake adapter holds the native mapping already, so it gives the report with
`changed` 0 and keeps its records. A spy adapter checks how the CLI calls the port. BdSim (tests/_migrate_sim.py)
plays bd for the beads adapter. The report shape is in tests/_migrate_support.py.

Run with: uv run pytest tests/test_tracker_migrate_mapping_cli.py -q
"""
from __future__ import annotations

import inspect
import json
from pathlib import Path
from typing import Any

import pytest

import _beads_support as support
import _migrate_support as s
import _tracker_cli_support as cli_support
from _beads_mapping_support import need
from _migrate_sim import syncs, writes


class _Spy:
    name = "spy"

    def __init__(self) -> None:
        self.calls: list[tuple[Any, Any]] = []

    def migrate_mapping(self, dry_run: bool = False, plans_dir: Path | None = None) -> dict[str, Any]:
        self.calls.append((dry_run, plans_dir))
        return {"changed": 1, "dry_run": dry_run, "changes": [{"id": "x", "change": "label", "detail": "d"}], "counts": {"label": 1}, "missing": []}


def _cli(monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str], adapter: Any, *argv: str) -> tuple[int, dict[str, Any]]:
    import tracker

    monkeypatch.setattr(tracker, "require_adapter", lambda *args, **kwargs: adapter)
    try:
        code = tracker.main(["migrate-mapping", *argv])
    except SystemExit as exited:
        code = exited.code
    return code, json.loads(capsys.readouterr().out)


def test_the_port_names_the_operation_with_the_pinned_signature() -> None:
    from tracker_port.beads import BeadsAdapter
    from tracker_port.fake import FakeAdapter
    from tracker_port.files import FilesAdapter
    from tracker_port.port import MappingMigrationPort

    for owner in (MappingMigrationPort, FakeAdapter, BeadsAdapter):
        parameters = inspect.signature(need(owner, "migrate_mapping")).parameters
        assert list(parameters) == ["self", "dry_run", "plans_dir"], owner.__name__
        assert (parameters["dry_run"].default, parameters["plans_dir"].default) == (False, None), owner.__name__
    assert hasattr(FilesAdapter, "migrate_mapping")


def test_help_lists_migrate_mapping() -> None:
    assert "migrate-mapping" in cli_support.cli_ops()


@pytest.mark.parametrize(
    ("argv", "expected"),
    [((), (False, None)), (("--dry-run",), (True, None)), (("--plans-dir", "docs/plans"), (False, Path("docs/plans"))),
     (("--plans-dir", "docs/plans", "--dry-run"), (True, Path("docs/plans"))), (("--dry-run", "--plans-dir", "p"), (True, Path("p")))],
)
def test_the_flags_reach_the_port_as_a_flag_and_a_path_and_the_report_is_the_result(
    monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str], argv: tuple[str, ...], expected: tuple[bool, Path | None]
) -> None:
    spy = _Spy()

    code, payload = _cli(monkeypatch, capsys, spy, *argv)

    assert code == 0 and payload["ok"] is True
    assert spy.calls == [expected] and isinstance(spy.calls[0][1], (Path, type(None)))
    assert payload["result"]["changed"] == 1 and payload["result"]["changes"] == [{"id": "x", "change": "label", "detail": "d"}]
    assert payload["result"]["dry_run"] is expected[0]


@pytest.mark.parametrize("argv", [("--plans-dir",), ("--bogus",), ("extra",)])
def test_a_bad_flag_or_argument_exits_4_and_calls_nothing(monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str], argv: tuple[str, ...]) -> None:
    spy = _Spy()
    assert _cli(monkeypatch, capsys, spy, "--dry-run")[0] == 0, "the operation exists, so only the bad flag fails"
    spy.calls.clear()

    code, payload = _cli(monkeypatch, capsys, spy, *argv)

    assert (code, payload["ok"], payload["exit"]) == (4, False, 4) and spy.calls == []


def test_the_beads_adapter_prints_the_dry_run_with_no_write_and_exits_0(monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]) -> None:
    sim = s.legacy_sim()

    code, payload = _cli(monkeypatch, capsys, s.adapter_over(sim), "--dry-run", "--plans-dir", str(s.PLANS))

    assert code == 0 and payload["result"]["dry_run"] is True
    assert s.pairs(s.as_dict(payload["result"])) == s.FULL
    assert writes(sim.calls) == [] and syncs(sim.calls) == 0


def test_the_beads_adapter_migrates_with_one_sync_and_a_second_call_prints_zero_changes(monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]) -> None:
    sim = s.legacy_sim()

    code, payload = _cli(monkeypatch, capsys, s.adapter_over(sim), "--plans-dir", str(s.PLANS))
    done = syncs(sim.calls)
    sim.reset_log()
    again_code, again = _cli(monkeypatch, capsys, s.adapter_over(sim), "--plans-dir", str(s.PLANS))

    assert (code, again_code) == (0, 0) and done == 1
    assert payload["result"]["changed"] == sum(s.FULL.values())
    assert again["result"]["changed"] == 0 and writes(sim.calls) == [] and syncs(sim.calls) == 0


def test_a_bd_failure_in_the_run_exits_3_with_a_message(monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]) -> None:
    sim = s.legacy_sim(fail_after=3)

    code, payload = _cli(monkeypatch, capsys, s.adapter_over(sim), "--plans-dir", str(s.PLANS))

    assert (code, payload["ok"], payload["exit"]) == (3, False, 3) and payload["error"]
    assert syncs(sim.calls) == 0


@pytest.mark.parametrize("argv", [(), ("--dry-run",)])
def test_the_files_adapter_exits_2_for_the_run_and_for_the_dry_run(
    monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str], tmp_path: Path, argv: tuple[str, ...]
) -> None:
    from tracker_port.files import FilesAdapter

    code, payload = _cli(monkeypatch, capsys, FilesAdapter(tmp_path), *argv)

    assert (code, payload["ok"], payload["exit"]) == (2, False, 2)


def test_the_fake_adapter_gives_the_report_with_no_change_and_keeps_its_records() -> None:
    from tracker_port.fake import FakeAdapter

    adapter = FakeAdapter(cli_support.FIXTURES / "corpus")
    before = support.all_records(adapter)

    reports = [s.migrate(adapter, dry_run=dry, plans_dir=plans) for dry in (True, False) for plans in (None, s.PLANS)]

    assert all((r["changed"], r["changes"], r["counts"], r["missing"]) == (0, [], {}, []) for r in reports)
    assert [r["dry_run"] for r in reports] == [True, True, False, False]
    assert support.all_records(adapter) == before


def test_the_script_on_the_fake_adapter_prints_changed_0_and_exits_0(tmp_path: Path) -> None:
    config = cli_support.fake_config(tmp_path, cli_support.FIXTURES / "corpus", tmp_path / "state" / "tracker-state.json")

    run = cli_support.ok(cli_support.cli(config, tmp_path, "migrate-mapping"))
    dry = cli_support.ok(cli_support.cli(config, tmp_path, "migrate-mapping", "--dry-run"))

    assert (run["changed"], run["changes"], run["dry_run"]) == (0, [], False)
    assert (dry["changed"], dry["dry_run"]) == (0, True)
