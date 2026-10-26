"""Slice 27 (E7-5): live parity. On real bd 1.3.0 the adapter gives what the fake and the projector give.

One scratch tracker holds the parity corpus (corpus-ready): an epic with an open PR, a deferred epic with a
slice, an in_progress epic, and a program with two ordered epics. A foreign task of priority 0 sits beside them.
Each test compares sets, not the first item, because the order of `bd ready` is bd's own. The tests skip
without bd. Run with: uv run pytest tests/test_tracker_beads_native_ready.py -q -m ''
"""
from __future__ import annotations

import json
import shutil
from pathlib import Path
from typing import Any

import pytest

import _beads_edges_support as e
import _beads_ready_support as r
import _beads_support as support
import _tracker_contract_support as contract

pytestmark = pytest.mark.slow
PROGRAMS = ("demo", "alt", "later")
EPICS = ("demo-E1", "demo-E2", "demo-E3", "alt-E1", "alt-E2", "later-E1")


@pytest.fixture(scope="module")
def live(tmp_path_factory: pytest.TempPathFactory) -> tuple[Any, Path]:
    corpus = tmp_path_factory.mktemp("ready") / "corpus"
    shutil.copytree(r.PARITY_CORPUS, corpus)
    adapter = contract._build_beads_scratch(corpus)
    adapter.runner.run(["create", "foreign", "--type", "task", "--priority", "0", "--silent"])
    return adapter, corpus


def _compare(live: tuple[Any, Path], kind: str, under: str | None = None) -> list[str]:
    adapter, corpus = live
    got = r.sorted_ids(adapter.next_ready(kind, under=under))
    assert got == r.fake_ids(corpus, kind, under), f"{kind} under {under}"
    return got


def test_live_parity_for_the_program_kind(live: tuple[Any, Path]) -> None:
    assert _compare(live, "program") == ["alt", "demo", "later"]


def test_live_parity_for_the_epic_kind(live: tuple[Any, Path]) -> None:
    assert _compare(live, "epic") == ["demo-E1"]


def test_live_parity_for_the_slice_kind_with_the_fake_and_the_projector_frontier(live: tuple[Any, Path]) -> None:
    got = _compare(live, "slice")

    assert got == ["alt-E1-s1", "demo-E1-s3"]
    assert set(got) == e.projector_frontier(support.all_records(live[0]))


@pytest.mark.parametrize("kind", r.KINDS)
def test_live_parity_under_each_epic(live: tuple[Any, Path], kind: str) -> None:
    got = {epic: _compare(live, kind, epic) for epic in EPICS}

    if kind == "slice":
        assert got == {"demo-E1": ["demo-E1-s3"], "alt-E1": ["alt-E1-s1"], "demo-E2": [], "demo-E3": [], "alt-E2": [], "later-E1": []}


@pytest.mark.parametrize("kind", r.KINDS)
def test_live_parity_under_each_program(live: tuple[Any, Path], kind: str) -> None:
    got = {program: _compare(live, kind, program) for program in PROGRAMS}

    if kind == "slice":
        assert got == {"demo": ["demo-E1-s3"], "alt": ["alt-E1-s1"], "later": []}, "the deferred epic hides its slice under a program too"
    if kind == "epic":
        assert got == {"demo": ["demo-E1"], "alt": [], "later": []}


def test_a_slice_read_is_one_list_read_and_one_ready_call_on_real_bd(live: tuple[Any, Path]) -> None:
    from tracker_port.beads import BeadsAdapter

    counting = support.CountingRunner(live[0].runner)

    got = BeadsAdapter(counting).next_ready("slice", under="alt")

    assert r.sorted_ids(got) == ["alt-E1-s1"]
    assert (counting.count("ready"), counting.count("list"), len(counting.calls)) == (1, 1, 2)
    assert counting.calls[1][:5] == ["ready", "-t", "task", "--label", "cb"]


def test_a_foreign_task_is_ready_to_bd_without_the_label_and_never_appears_through_the_adapter(live: tuple[Any, Path]) -> None:
    adapter, _ = live
    titles = {row["title"] for row in json.loads(adapter.runner.run(["ready", "-t", "task", "--json", "--limit", "0"]))}
    filtered = {row["title"] for row in json.loads(adapter.runner.run(r.ready_argv()))}

    assert "foreign" in titles, "the unfiltered ready list holds the foreign task, so the fixture is meaningful"
    assert "foreign" not in filtered
    assert "foreign" not in [record.id for kind in r.KINDS for record in adapter.next_ready(kind)]
    assert len(support.all_records(adapter)) == 18, "the foreign task is no record: 3 programs, 6 epics, 8 slices, 1 PR"


def test_native_ready_is_true_and_the_scratch_tracker_reads_native(live: tuple[Any, Path]) -> None:
    adapter, _ = live

    assert adapter.capabilities.native_ready is True
    assert adapter.doctor_details()["mapping"] == "native"
