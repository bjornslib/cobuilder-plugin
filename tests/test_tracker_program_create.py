"""Slice 32, step 2: writes refuse duplicate cb ids, and the doctor lists them.

The rows come from the recorded run map-read.json. No bd is needed.

Run with: uv run pytest tests/test_tracker_program_create.py -q
"""
from __future__ import annotations

import copy
from typing import Any

import pytest

import _beads_mapping_support as m
import _beads_support as support


class _ListRunner:
    """Answers the list read with fixed rows and records every call. Any other call fails the test."""

    def __init__(self, rows: list[dict[str, Any]]) -> None:
        self.rows = rows
        self.calls: list[list[str]] = []

    def run(self, args: list[str]) -> str:
        from tracker_port.beads import LIST_ARGS

        self.calls.append(list(args))
        if list(args) != LIST_ARGS:
            raise AssertionError(f"unexpected bd call {args}: only the list read is allowed here")
        return _json(self.rows)


def _json(rows: list[dict[str, Any]]) -> str:
    import json

    return json.dumps(rows)


def _duplicate_rows() -> list[dict[str, Any]]:
    """The program row twice, with the bd ids t-1 and t-2 and the same cb id."""
    rows = m.native_rows()
    program = m.row_of("mapdemo", rows)
    copy_row = copy.deepcopy(program)
    copy_row["id"] = "t-2"
    program["id"] = "t-1"
    return [program, copy_row]


def test_a_write_refuses_when_two_rows_hold_one_cb_id() -> None:
    from tracker_port.port import AdapterError

    runner = _ListRunner(_duplicate_rows())
    adapter = _adapter(runner)

    with pytest.raises(AdapterError) as excinfo:
        adapter.set_program_stage("mapdemo", "approved")

    message = str(excinfo.value)
    assert "t-1" in message and "t-2" in message, message
    assert runner.calls == [_list_call()], runner.calls


def _adapter(runner: Any) -> Any:
    from tracker_port.beads import BeadsAdapter

    return BeadsAdapter(runner)


def _list_call() -> list[str]:
    from tracker_port.beads import LIST_ARGS

    return list(LIST_ARGS)


def test_doctor_lists_the_duplicate_ids() -> None:
    adapter, _ = support.list_adapter(_duplicate_rows())

    assert adapter.doctor_details()["duplicates"] == ["mapdemo"]

    clean_adapter, _ = support.list_adapter(m.native_rows())

    assert clean_adapter.doctor_details()["duplicates"] == []
