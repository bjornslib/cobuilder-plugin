"""Slice 24 (E7-2): a beads read fills the record from the bd row fields, and a lookup runs the ref filter.

The transcripts map-read.json and map-lookup.json hold real bd 1.3.0 runs. No bd is needed.

Run with: uv run pytest tests/test_tracker_beads_mapping_read.py -q
"""
from __future__ import annotations

import dataclasses
import json
from typing import Any

import pytest

import _beads_mapping_support as m
import _beads_support as support


def test_the_recorded_lookup_of_a_known_ref_gives_one_row_and_of_an_unknown_ref_none() -> None:
    known, unknown = support.steps("map-lookup")

    assert known["args"] == m.lookup_argv("gh-101") and unknown["args"] == m.lookup_argv("mapdemo/E9")
    assert [row["external_ref"] for row in json.loads(known["stdout"])] == ["gh-101"]
    assert json.loads(unknown["stdout"]) == []


@pytest.mark.parametrize("cb_id", [spec["id"] for spec in m.CREATES.values()])
def test_a_read_fills_the_text_fields_from_the_row_fields(cb_id: str) -> None:
    row = m.row_of(cb_id)
    record = m.records_by_id(m.read_adapter())[cb_id]

    assert m.text_of(record) == (row["title"], row.get("description"), row.get("acceptance_criteria"), row.get("design"))


def test_a_read_gives_the_human_title_and_the_texts_of_a_program() -> None:
    program = m.records_by_id(m.read_adapter())["mapdemo"]

    assert m.text_of(program) == (
        "Mapping demo", "A program outcome.", "First done-when\nSecond done-when", "docs/architecture/designs/mapdemo",
    )


def test_a_read_leaves_an_unset_text_field_as_none() -> None:
    bare = m.records_by_id(m.read_adapter())["mapdemo-bare"]

    assert m.text_of(bare)[1:] == (None, None, None)


def test_a_read_maps_the_native_types_to_kinds_and_keeps_links_and_refs() -> None:
    records = m.records_by_id(m.read_adapter())

    assert records["mapdemo"].kind == "program" and m.row_of("mapdemo")["issue_type"] == "feature"
    assert records["pr-101"].kind == "pr" and m.row_of("pr-101")["issue_type"] == "milestone"
    assert records["mapdemo/1"].parent == "mapdemo/E1" and records["mapdemo/E1"].parent == "mapdemo"
    assert [records[i].external_ref for i in ("mapdemo", "pr-101", "mapdemo-bare")] == ["mapdemo", "gh-101", None]


def test_a_legacy_program_typed_row_and_a_task_typed_pr_row_still_read_by_their_metadata_kind() -> None:
    # Until migrate-mapping exists, a tracker in the old mapping stays readable: the kind comes from metadata.cb.kind.
    legacy = json.loads((support.BEADS_DIR / "list.json").read_text(encoding="utf-8"))
    types = {row["metadata"]["cb"]["id"]: row["issue_type"] for row in legacy}
    assert (types["demo"], types["pr-101"]) == ("program", "task")

    records = m.records_by_id(m.read_adapter(legacy))

    assert (records["demo"].kind, records["pr-101"].kind) == ("program", "pr")
    assert m.text_of(records["demo"])[0] == next(row["title"] for row in legacy if row["id"] == "t-anc")


def _same_but(record: Any, **fields: Any) -> Any:
    return dataclasses.replace(record, **fields)


def test_the_four_text_fields_stay_out_of_record_equality() -> None:
    first = m.create_record_of("slice")
    second = _same_but(first, title="Another", description="d", acceptance_criteria="a", design="g")

    assert first == second
    for field in ("title", "description", "acceptance_criteria", "design"):
        assert _same_but(first, **{field: "changed"}) == first, field


def test_a_record_defaults_its_text_fields_to_none_and_tracks_to_an_empty_tuple() -> None:
    record = m.make_record(id="x", kind="slice")

    assert m.text_of(record) == (None,) * 4
    assert m.need(record, "tracks") == ()


def test_tracks_stays_in_record_equality() -> None:
    record = m.make_record(id="pr-1", kind="pr")

    assert _same_but(record, tracks=("e1",)) != record


def test_a_beads_record_equals_a_record_that_differs_only_in_text() -> None:
    records = m.records_by_id(m.read_adapter())
    slice_record = records["mapdemo/1"]

    assert m.text_of(slice_record)[0] == "Slice name"
    assert slice_record == m.create_record_of("slice", title="Another title", acceptance_criteria="other", lifecycle="open")


@pytest.mark.parametrize(
    ("cb_id", "ref"),
    [("mapdemo", "mapdemo"), ("mapdemo/E1", "mapdemo/E1"), ("mapdemo/1", "mapdemo/1"), ("pr-101", "gh-101")],
)
def test_find_record_runs_the_external_ref_list_and_returns_the_record(cb_id: str, ref: str) -> None:
    from tracker_port.beads import BeadsAdapter

    runner = m.RowsRunner(m.read_rows())
    record = m.find_record(BeadsAdapter(runner), cb_id)

    assert runner.calls[0] == m.lookup_argv(ref)
    assert record is not None and record.id == cb_id
    assert m.text_of(record)[:2] == (m.row_of(cb_id)["title"], m.row_of(cb_id).get("description"))
    assert record.external_ref == m.row_of(cb_id)["external_ref"]


def test_find_record_of_an_unknown_ref_gives_no_record_after_one_bd_call() -> None:
    from tracker_port.beads import BeadsAdapter

    runner = m.RowsRunner(m.read_rows())

    assert m.find_record(BeadsAdapter(runner), "mapdemo/E9") is None
    assert runner.calls == [m.lookup_argv("mapdemo/E9")]


def test_find_record_never_reads_the_full_list_first() -> None:
    from tracker_port.beads import BeadsAdapter

    runner = m.RowsRunner(m.read_rows())
    m.find_record(BeadsAdapter(runner), "mapdemo/1")

    assert runner.calls[0][:2] == ["list", "--external-ref"], runner.calls
