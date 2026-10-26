"""Slice 24 (E7-2): prepare sets no custom type, a deferred row reads, and the legacy check reports its reasons.

The native rows come from the recorded run map-read.json. The legacy rows come from the older recording list.json.
No bd is needed.

Run with: uv run pytest tests/test_tracker_beads_mapping_legacy.py -q
"""
from __future__ import annotations

import json
from typing import Any

import pytest

import _beads_mapping_support as m
import _beads_support as support


class _Runner:
    """Answers every call with an empty text, a created id, or the list. It keeps each argument list."""

    def __init__(self, create_error: str | None = None) -> None:
        self.create_error = create_error
        self.calls: list[list[str]] = []

    def run(self, args: list[str]) -> str:
        from tracker_port.bd_runner import BdError

        self.calls.append(list(args))
        if args[0] == "create" and self.create_error:
            raise BdError(f"bd {' '.join(args)} exited 1", 1, self.create_error)
        return "[]" if args[0] == "list" else "demo-new\n" if args[0] == "create" else ""


def _legacy_rows() -> list[dict[str, Any]]:
    return json.loads((support.BEADS_DIR / "list.json").read_text(encoding="utf-8"))


def _with_type(rows: list[dict[str, Any]], cb_id: str, issue_type: str) -> list[dict[str, Any]]:
    m.row_of(cb_id, rows)["issue_type"] = issue_type
    return rows


def _epic_blocked_by_pr(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    epic, pr = m.row_of("mapdemo/E1", rows), m.row_of("pr-101", rows)
    epic["dependencies"] = [*(epic.get("dependencies") or []), {"issue_id": epic["id"], "depends_on_id": pr["id"], "type": "blocks"}]
    return rows


def test_prepare_makes_no_types_custom_call_and_changes_nothing() -> None:
    from tracker_port.beads import BeadsAdapter

    runner = _Runner()

    assert BeadsAdapter(runner).prepare() == {"changed": False}
    assert not any("types.custom" in call for call in runner.calls), runner.calls
    assert not any(call[:2] == ["config", "set"] for call in runner.calls), runner.calls


def test_a_program_create_on_a_tracker_without_the_program_type_sends_one_create_and_no_config_call() -> None:
    from tracker_port.beads import BeadsAdapter

    runner = _Runner()
    BeadsAdapter(runner).create_record(m.create_record_of("program", external_ref=None))

    assert [call[0] for call in runner.calls if call[0] == "config"] == []
    create = next(call for call in runner.calls if call[0] == "create")
    assert create[create.index("--type") + 1] == "feature"


def test_create_does_not_retry_after_an_invalid_issue_type_error() -> None:
    from tracker_port.bd_runner import BdError
    from tracker_port.beads import BeadsAdapter

    runner = _Runner(create_error="Error: validation failed: invalid issue type: feature\n")

    with pytest.raises(BdError):
        BeadsAdapter(runner).create_record(m.create_record_of("program", external_ref=None))

    assert [call[0] for call in runner.calls].count("create") == 1, runner.calls
    assert not any(call[0] == "config" for call in runner.calls), runner.calls


def test_status_map_maps_deferred_to_open_and_keeps_the_other_words() -> None:
    from tracker_port.beads_rows import STATUS_MAP

    assert "deferred" in STATUS_MAP, sorted(STATUS_MAP)
    assert STATUS_MAP["deferred"] == "open"
    assert [STATUS_MAP[word] for word in ("open", "in_progress", "hooked", "closed")] == ["open", "in_progress", "in_progress", "closed"]


def test_a_deferred_row_reads_as_open_with_no_error() -> None:
    rows = m.native_rows()
    m.row_of("mapdemo/E1", rows)["status"] = "deferred"

    from tracker_port.port import AdapterError

    try:
        records = m.records_by_id(m.read_adapter(rows))
    except AdapterError as error:
        raise AssertionError(f"a deferred row must read, and it raised: {error}") from error

    assert records["mapdemo/E1"].lifecycle == "open"


def test_legacy_reasons_is_empty_for_a_native_tracker() -> None:
    assert m.legacy_reasons(m.native_rows()) == []


def test_legacy_reasons_ignores_foreign_rows_and_a_tracks_edge() -> None:
    rows = [*m.native_rows(), *support.foreign_only_rows()]
    epic, pr = m.row_of("mapdemo/E1", rows), m.row_of("pr-101", rows)
    pr["dependencies"] = [{"issue_id": pr["id"], "depends_on_id": epic["id"], "type": "tracks"}]

    assert m.legacy_reasons(rows) == []


def test_legacy_reasons_names_a_cb_row_of_type_program() -> None:
    reasons = m.legacy_reasons(_with_type(m.native_rows(), "mapdemo", "program"))

    assert len(reasons) == 1 and all(isinstance(reason, str) and reason for reason in reasons)


def test_legacy_reasons_names_a_pr_row_of_type_task() -> None:
    assert len(m.legacy_reasons(_with_type(m.native_rows(), "pr-101", "task"))) == 1


def test_legacy_reasons_names_an_epic_with_a_blocks_edge_to_a_pr_row() -> None:
    assert len(m.legacy_reasons(_epic_blocked_by_pr(m.native_rows()))) == 1


def test_legacy_reasons_finds_each_legacy_mark_of_the_recorded_old_tracker() -> None:
    # list.json holds one program row, one task-typed pr row, and two epics that the pr row blocks.
    assert len(m.legacy_reasons(_legacy_rows())) >= 4


def test_doctor_reports_mapping_legacy_for_the_old_tracker() -> None:
    adapter, _ = support.list_adapter(_legacy_rows())

    assert m.doctor_mapping(adapter) == "legacy"


def test_doctor_reports_mapping_native_for_the_native_tracker() -> None:
    adapter, _ = support.list_adapter(m.native_rows())

    assert m.doctor_mapping(adapter) == "native"


def test_doctor_keeps_the_foreign_count_and_the_sync_details_beside_mapping() -> None:
    adapter, _ = support.list_adapter([*m.native_rows(), *support.foreign_only_rows()])
    details = adapter.doctor_details()

    assert details["foreign_issues"] == 1 and "sync" in details
    assert m.doctor_mapping(adapter) == "native"
