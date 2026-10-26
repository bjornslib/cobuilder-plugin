"""Contract case 8 (E7-6): `claim_next` gives the same answers on the fake adapter and on real bd.

The corpus copy of this module adds one slice, demo-E1-s4, that waits for demo-E1-s3. So the frontier of
demo-E1 is: s2 (held by agent-1), s3 (ready), and s4 (behind s3). The beads cases run on a scratch bd and
carry the pytest mark `slow`, through the `build` fixture. They skip without bd.

Run with: uv run pytest tests/test_tracker_contract_claim_next.py -q -m ''
"""
from __future__ import annotations

import json
import shutil
from pathlib import Path
from typing import Any

import pytest

from _beads_mapping_support import need
from _tracker_contract_support import CORPUS_DIR

pytest_plugins = ["_tracker_contract_support"]


@pytest.fixture
def corpus(tmp_path: Path) -> Path:
    # This module's corpus copy: the base corpus and one more slice behind demo-E1-s3.
    copy = tmp_path / "corpus"
    shutil.copytree(CORPUS_DIR, copy)
    slices = json.loads((copy / "slices.json").read_text(encoding="utf-8"))
    slices.append({**slices[-1], "id": "demo-E1-s4", "lifecycle": "open", "blocked_by": ["demo-E1-s3"], "assignee": None, "envelope": {}})
    (copy / "slices.json").write_text(json.dumps(slices), encoding="utf-8")
    return copy


def _epic(adapter: Any, id: str) -> Any:
    return next(record for record in adapter.list_epics() if record.id == id)


def test_claim_next_walks_the_frontier_one_slice_at_a_time(adapter: Any) -> None:
    claim = need(adapter, "claim_next")

    first = claim("agent-a")

    assert (first.id, first.kind, first.lifecycle, first.assignee) == ("demo-E1-s3", "slice", "in_progress", "agent-a")
    assert adapter.get_slice("demo-E1-s3") == first
    assert _epic(adapter, "demo-E1").lifecycle == "in_progress", "the claim starts the epic of the slice"
    assert claim("agent-b") is None, "s3 is held, s4 waits for it, and s2 is held by agent-1: nothing is ready"
    assert adapter.get_slice("demo-E1-s3").assignee == "agent-a", "a held slice is skipped and stays held"

    adapter.set_slice_state("demo-E1-s3", "closed", score=0.9)
    second = claim("agent-b")

    assert (second.id, second.lifecycle, second.assignee) == ("demo-E1-s4", "in_progress", "agent-b")
    assert claim("agent-c") is None
    assert _epic(adapter, "demo-E1").lifecycle == "in_progress"


@pytest.mark.parametrize("under", ["demo", "demo-E1"])
def test_claim_next_under_an_epic_or_a_program_takes_the_slice_below_it(adapter: Any, under: str) -> None:
    assert need(adapter, "claim_next")("agent-a", under=under).id == "demo-E1-s3"


@pytest.mark.parametrize("under", ["demo-E2", "demo-E3"])
def test_claim_next_under_an_epic_with_nothing_ready_gives_none_and_leaves_the_epic_as_it_was(adapter: Any, under: str) -> None:
    before = _epic(adapter, under).lifecycle

    assert need(adapter, "claim_next")("agent-a", under=under) is None

    assert _epic(adapter, under).lifecycle == before
    assert adapter.get_slice("demo-E1-s3").assignee is None


@pytest.mark.parametrize("under", ["no-such-id", "demo-E1-s3", "pr-101"])
def test_claim_next_under_no_record_a_slice_or_a_pull_request_raises_argument_error(adapter: Any, under: str) -> None:
    from tracker_port.port import ArgumentError

    with pytest.raises(ArgumentError):
        need(adapter, "claim_next")("agent-a", under=under)

    assert adapter.get_slice("demo-E1-s3").assignee is None
