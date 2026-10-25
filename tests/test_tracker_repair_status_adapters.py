"""repair-status on the fake and files adapters, and through the CLI.

Rules: a dry run writes nothing. A live run applies the plan, and a second run finds no change.
A missing index file exits 4. The files adapter refuses with exit 2. The beads side has its own test.

Run with: uv run pytest tests/test_tracker_repair_status_adapters.py -q
"""
from __future__ import annotations

import inspect
import json
from pathlib import Path
from typing import Any

import pytest

import _program_stage_support as ps
import _tracker_cli_support as cli_support


def _row(rid: str, kind: str, parent: str | None = None, envelope: dict[str, Any] | None = None) -> dict[str, Any]:
    return {
        "id": rid, "kind": kind, "parent": parent, "blocked_by": [], "lifecycle": "open",
        "assignee": None, "envelope": envelope or {}, "external_ref": None,
    }


def _corpus(tmp: Path, stage: str) -> Path:
    """A program d at `stage`, two open epics under it, and one open slice under d-E1."""
    corpus = tmp / "corpus"
    corpus.mkdir()
    files = {
        "program.json": [_row("d", "program", envelope={"stage": stage})],
        "epics.json": [_row("d/E1", "epic", "d", {"state": "backlog"}), _row("d/E2", "epic", "d", {"state": "backlog"})],
        "slices.json": [_row("d/E1/1", "slice", "d/E1")],
        "prs.json": [],
    }
    for name, rows in files.items():
        (corpus / name).write_text(json.dumps(rows), encoding="utf-8")
    return corpus


def _fake(tmp: Path, stage: str = "implemented") -> tuple[Any, Path, Path]:
    from tracker_port.fake import FakeAdapter

    corpus = _corpus(tmp, stage)
    state = tmp / "state.json"
    return FakeAdapter(corpus, state_file=state), state, corpus


def _closes(plan: dict[str, Any]) -> list[tuple[str, str]]:
    return sorted((c["id"], c["kind"]) for c in plan["changes"] if c["action"] == "close")


def _code(monkeypatch: pytest.MonkeyPatch, adapter: Any, *argv: str) -> Any:
    import tracker

    monkeypatch.setattr(tracker, "require_adapter", lambda *args, **kwargs: adapter)
    try:
        return tracker.main(["repair-status", *argv])
    except SystemExit as exited:
        return exited.code


def test_the_three_adapters_share_the_pinned_signature() -> None:
    from tracker_port.beads import BeadsAdapter
    from tracker_port.fake import FakeAdapter
    from tracker_port.files import FilesAdapter
    from tracker_port.port import StatusRepairPort

    for owner in (StatusRepairPort, FakeAdapter, BeadsAdapter, FilesAdapter):
        parameters = inspect.signature(owner.repair_status).parameters
        assert list(parameters) == ["self", "dry_run", "plans_dir", "index"], owner.__name__
        assert (parameters["dry_run"].default, parameters["plans_dir"].default) == (False, None), owner.__name__


def test_dry_run_writes_nothing_and_live_run_closes_then_settles(tmp_path: Path) -> None:
    from tracker_port.fake import FakeAdapter

    adapter, state, corpus = _fake(tmp_path)
    dry = adapter.repair_status(dry_run=True)
    assert _closes(dry), "an implemented program with open epics must close them"
    assert not state.exists(), "a dry run wrote fake state"

    live = adapter.repair_status()
    assert live["changes"] == dry["changes"]
    reread = FakeAdapter(corpus, state_file=state)
    assert {epic.id: epic.lifecycle for epic in reread.list_epics()}["d/E1"] == "closed"
    assert adapter.repair_status()["changes"] == [], "a second run must find nothing to repair"


def test_legacy_design_stages_are_applied_once(tmp_path: Path) -> None:
    adapter, _, _ = _fake(tmp_path, "approved")
    plans = ps.stage_tree(tmp_path)

    dry = adapter.repair_status(dry_run=True, plans_dir=plans)
    assert {c["rule"] for c in dry["changes"]} & {"stamp-from-goal", "create-from-design"}

    adapter.repair_status(plans_dir=plans)
    again = adapter.repair_status(plans_dir=plans)
    assert [c for c in again["changes"] if c["action"] in {"stamp", "create"}] == []


def test_merged_epic_in_the_index_holds_its_close(tmp_path: Path) -> None:
    adapter, _, _ = _fake(tmp_path, "approved")
    index = tmp_path / "index.json"
    index.write_text(json.dumps({"joins": {"epic_status": {"d/E1": "merged"}}}), encoding="utf-8")

    plan = adapter.repair_status(dry_run=True, index=index)

    assert ("d/E1", "epic") not in _closes(plan)
    assert plan["holds"], "a merged epic under an approved design must hold"
    assert plan["checked"]["index"] is True


def test_missing_index_file_exits_four(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    adapter, _, _ = _fake(tmp_path)
    missing = tmp_path / "missing.json"

    assert _code(monkeypatch, adapter, "--dry-run", "--index", str(missing)) == 4


def test_files_adapter_refuses_with_exit_two(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    from tracker_port.files import FilesAdapter

    files = FilesAdapter(cli_support.FIXTURES / "plans")

    assert _code(monkeypatch, files, "--dry-run") == 2
    assert _code(monkeypatch, files) == 2


def test_help_lists_repair_status() -> None:
    assert "repair-status" in cli_support.cli_ops()
