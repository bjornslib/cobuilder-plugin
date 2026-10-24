"""Slice 24 (E7-2): the native mapping on real bd 1.3.0 in a scratch tracker.

One test creates a program, an epic, a slice, and a pull request, and reads them back. One test checks the
external ref guard and the lookup. One test seeds the plans-mapping fixture. Each test needs bd and fails
without it. The scratch tracker has no custom issue type.

Run with: uv run pytest tests/test_tracker_beads_mapping_real.py -q -m ''
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pytest

import _beads_mapping_seed_support as seed
import _beads_mapping_support as m
import _beads_support as support
import _inprogress_support as ip

pytestmark = pytest.mark.slow
LIVE_NAMES = ("program", "epic", "slice", "pr")


def _adapter(root: Path) -> Any:
    support.require_bd()
    adapter = ip.beads_adapter(root)
    assert adapter.runner.run(["config", "get", "types.custom"]).startswith("types.custom (not set)")
    return adapter


def _raw_rows(adapter: Any) -> dict[str, dict[str, Any]]:
    rows = json.loads(adapter.runner.run(["list", "--json", "--all"]))
    return {row["metadata"]["cb"]["id"]: row for row in rows if "cb" in (row.get("metadata") or {})}


def test_create_program_epic_slice_and_pr_then_read_them_back(tmp_path: Path) -> None:
    adapter = _adapter(tmp_path)
    for name in LIVE_NAMES:
        adapter.create_record(m.create_record_of(name))

    rows = _raw_rows(adapter)
    expected_types = {"mapdemo": "feature", "mapdemo/E1": "epic", "mapdemo/1": "task", "pr-101": "milestone"}
    assert {cb_id: row["issue_type"] for cb_id, row in rows.items()} == expected_types
    assert {cb_id: row["title"] for cb_id, row in rows.items()} == {
        "mapdemo": "Mapping demo", "mapdemo/E1": "Epic name", "mapdemo/1": "Slice name", "pr-101": "pr-101",
    }
    assert {cb_id: row["external_ref"] for cb_id, row in rows.items()} == {
        "mapdemo": "mapdemo", "mapdemo/E1": "mapdemo/E1", "mapdemo/1": "mapdemo/1", "pr-101": "gh-101",
    }
    assert all(row["labels"] == ["cb"] for row in rows.values()), rows
    assert rows["mapdemo"]["description"] == "A program outcome."
    assert rows["mapdemo"]["acceptance_criteria"] == "First done-when\nSecond done-when"
    assert rows["mapdemo/E1"]["description"] == "The epic outcome."
    assert rows["mapdemo/1"]["acceptance_criteria"] == "The slice ends here"

    records = m.records_by_id(adapter)
    for cb_id, row in rows.items():
        record = records[cb_id]
        assert m.text_of(record) == (row["title"], row.get("description"), row.get("acceptance_criteria"), row.get("design"))
    assert records["mapdemo/1"].parent == "mapdemo/E1" and records["pr-101"].kind == "pr"


def test_a_second_create_with_the_same_external_ref_is_refused_and_find_record_reads_by_ref(tmp_path: Path) -> None:
    from tracker_port.port import ArgumentError

    adapter = _adapter(tmp_path)
    adapter.create_record(m.create_record_of("pr"))

    with pytest.raises(ArgumentError, match="already exists"):
        adapter.create_record(m.create_record_of("pr", id="pr-102"))

    assert list(_raw_rows(adapter)) == ["pr-101"], "bd keeps no duplicate of the ref"
    found = m.find_record(adapter, "pr-101")
    assert found is not None and (found.kind, found.external_ref) == ("pr", "gh-101")
    assert m.find_record(adapter, "pr-999") is None


def test_seed_from_files_fills_title_and_text_fields_and_a_second_seed_changes_nothing(tmp_path: Path) -> None:
    adapter = _adapter(tmp_path)
    adapter.seed_from_files(seed.PLANS)

    records = m.records_by_id(adapter)
    rows = _raw_rows(adapter)
    assert set(seed.EXPECTED) <= set(rows)
    for cb_id, (title, description, acceptance, design) in seed.EXPECTED.items():
        row, record = rows[cb_id], records[cb_id]
        assert (row["title"], row.get("description"), row.get("acceptance_criteria")) == (title, description, acceptance), cb_id
        seed.check_design(row.get("design"), design)
        assert row["labels"] == ["cb"] and row["external_ref"] == cb_id and row["issue_type"] == seed.KIND_TYPE[record.kind], cb_id
        assert m.text_of(record) == (row["title"], row.get("description"), row.get("acceptance_criteria"), row.get("design"))
    assert adapter.seed_from_files(seed.PLANS) == []
