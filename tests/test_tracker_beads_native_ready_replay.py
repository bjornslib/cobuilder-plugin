"""Slice 27 (E7-5): `next_ready("slice", under)` on beads runs one `bd ready`, and `native_ready` is true.

The replay tests run on the rows of transcripts/list.json and need no bd. The live parity test sits in
test_tracker_beads_native_ready.py, and the legacy refusal sits in test_tracker_beads_native_ready_legacy.py.
The bd rows of the demo corpus: demo t-anc, demo-E1 t-anc.1, demo-E1-s3 t-anc.1.3.

Run with: uv run pytest tests/test_tracker_beads_native_ready_replay.py -q
"""
from __future__ import annotations

import copy
import json

import pytest

import _beads_ready_support as r
import _beads_support as support
import _tracker_contract_support as contract
from _beads_mapping_support import need

READY = ["ready", "-t", "task", "--label", "cb", "--json", "--limit", "0"]
S3 = "t-anc.1.3"


def _ready_argv(*parent: str) -> list[str]:
    from tracker_port import bd_runner

    return need(bd_runner, "ready_argv")(*parent)


def test_ready_argv_without_under_is_exactly_bd_ready_task_label_cb_json_limit_0() -> None:
    assert _ready_argv() == READY


def test_ready_argv_puts_the_parent_after_the_label_and_before_json() -> None:
    assert _ready_argv("t-anc.1") == ["ready", "-t", "task", "--label", "cb", "--parent", "t-anc.1", "--json", "--limit", "0"]


def test_a_slice_read_is_one_list_read_then_one_ready_call_and_gives_the_cb_record() -> None:
    adapter, runner = r.adapter_over(r.list_rows(), [S3])

    got = adapter.next_ready("slice")

    assert list(runner.calls) == [r.LIST_ARGS, READY], "one list read, then one ready call"
    assert got == [record for record in r.adapter_over(r.list_rows())[0].list_slices() if record.id == "demo-E1-s3"]


@pytest.mark.parametrize("under,parent", [("demo-E1", "t-anc.1"), ("demo", "t-anc")])
def test_under_names_an_epic_or_a_program_and_the_adapter_maps_it_to_the_bd_id(under: str, parent: str) -> None:
    adapter, runner = r.adapter_over(r.list_rows(), [S3])

    got = adapter.next_ready("slice", under=under)

    assert list(runner.calls) == [r.LIST_ARGS, ["ready", "-t", "task", "--label", "cb", "--parent", parent, "--json", "--limit", "0"]]
    assert r.sorted_ids(got) == ["demo-E1-s3"]


def test_the_result_comes_from_bd_and_not_from_the_adapter_rule() -> None:
    # The adapter rule would give demo-E1-s3. bd gives nothing, so the result is empty.
    adapter, runner = r.adapter_over(r.list_rows(), [])

    assert adapter.next_ready("slice") == []
    assert len(runner.calls) == 2


def test_two_ready_rows_give_the_two_records_in_the_order_of_the_projector_result() -> None:
    rows = copy.deepcopy(r.list_rows())
    next(row for row in rows if row["id"] == "t-anc.1.2")["status"] = "open"
    adapter, _ = r.adapter_over(rows, ["t-anc.1.2", S3])

    got = adapter.next_ready("slice")

    assert [record.id for record in got] == [record.id for record in adapter.list_slices() if record.id != "demo-E1-s1"]
    assert [record.id for record in got] == ["demo-E1-s2", "demo-E1-s3"]


def test_a_foreign_task_and_the_foreign_molecule_rows_never_enter_the_result() -> None:
    listed = support.steps("ready-bd-molecule")[2]["stdout"]
    molecule = [row for row in json.loads(listed) if row["issue_type"] == "molecule" or row["id"].startswith("t-mol-")]
    assert molecule, "the transcript holds molecule rows"
    adapter, runner = r.adapter_over([*r.list_rows(), *support.foreign_only_rows(), *molecule], [S3])

    got = adapter.next_ready("slice")

    assert r.sorted_ids(got) == ["demo-E1-s3"]
    assert READY in list(runner.calls), "the label filter is on the argv, so bd drops a task with no label cb"


@pytest.mark.parametrize("under", [None, "demo", "demo-E1", "demo-E3"])
@pytest.mark.parametrize("kind", ["program", "epic"])
def test_program_and_epic_kinds_keep_the_adapter_rule_with_one_list_read_and_equal_the_fake(kind: str, under: str | None) -> None:
    adapter, runner = r.adapter_over(r.list_rows())

    got = adapter.next_ready(kind, under=under)

    assert r.sorted_ids(got) == r.fake_ids(contract.CORPUS_DIR, kind, under)
    assert [call[0] for call in list(runner.calls)] == ["list"], "no ready call for a program or an epic"


def test_a_failed_ready_call_raises_adapter_error_with_the_stderr_and_nothing_falls_back() -> None:
    from tracker_port.port import AdapterError

    adapter, runner = r.adapter_over(r.list_rows(), error="unknown flag: --label")

    with pytest.raises(AdapterError, match="unknown flag: --label"):
        adapter.next_ready("slice")

    assert [call[0] for call in list(runner.calls)] == ["list", "ready"], "no second call and no computed answer"


def test_an_unknown_kind_is_refused_before_any_bd_call() -> None:
    from tracker_port.port import ArgumentError

    adapter, runner = r.adapter_over(r.list_rows())

    with pytest.raises(ArgumentError, match="kind must be one of"):
        adapter.next_ready("pr")

    assert runner.calls == []


@pytest.mark.parametrize("holder,expected", [("beads", True), ("files", False), ("fake", False)])
def test_native_ready_is_true_for_beads_only(holder: str, expected: bool) -> None:
    from tracker_port.beads import BeadsAdapter
    from tracker_port.fake import FakeAdapter
    from tracker_port.files import FilesAdapter

    classes = {"beads": BeadsAdapter, "files": FilesAdapter, "fake": FakeAdapter}

    assert classes[holder].capabilities.native_ready is expected


def test_doctor_shows_native_ready_true_and_the_native_mapping() -> None:
    from tracker_port.cli_operations import _doctor

    adapter, _ = r.adapter_over(r.list_rows())
    report = _doctor(adapter, None)

    assert report["capabilities"].native_ready is True
    assert report["mapping"] == "native"
