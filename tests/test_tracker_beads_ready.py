"""E5-3: native ready on beads. bd 1.3.0 misses a ready slice, so the adapter computes ready itself.

The recorded transcripts hold the bd ready output as evidence of the difference.
Run with: uv run pytest tests/test_tracker_beads_ready.py -q
"""
from __future__ import annotations

import json
import shutil
from pathlib import Path
from typing import Any

import pytest

import _beads_support as support
import _tracker_contract_support as contract

KINDS = ("program", "epic", "slice")
READY_ARGS = ["ready", "--json", "--limit", "0"]


def _titles(stdout: str) -> list[str]:
    return sorted(row["title"] for row in json.loads(stdout))


def _projector(corpus: Path, kind: str, under: str | None = None) -> list[str]:
    from tracker_port.fake import FakeAdapter

    return sorted(contract.ids(FakeAdapter(corpus).next_ready(kind, under=under)))


def _replay_adapter() -> Any:
    return support.list_adapter(json.loads(support.BEADS_DIR.joinpath("list.json").read_text(encoding="utf-8")))[0]


def test_recorded_bd_ready_lists_a_pull_request_and_a_deferred_epic() -> None:
    step = support.steps("ready-bd-corpus")[0]

    assert step["args"] == READY_ARGS
    assert _titles(step["stdout"]) == ["demo", "demo-E3", "pr-101"]


def test_recorded_bd_ready_misses_the_slice_under_a_blocked_epic() -> None:
    steps = support.steps("ready-bd-corpus")

    assert "demo-E1-s3" not in _titles(steps[0]["stdout"])
    assert json.loads(steps[1]["stdout"]) == []
    assert _projector(contract.CORPUS_DIR, "slice") == ["demo-E1-s3"]


def test_recorded_molecule_root_has_type_molecule() -> None:
    steps = support.steps("ready-bd-molecule")
    listed = [step["issue"] for step in json.loads(steps[1]["stdout"])["steps"]]
    root = next(issue for issue in listed if issue["title"] == "tiny")

    assert root["issue_type"] == "molecule"
    assert "tiny" not in _titles(steps[0]["stdout"])


@pytest.mark.parametrize("flag_holder", ["beads", "files", "fake"])
def test_native_ready_is_false(flag_holder: str) -> None:
    from tracker_port.beads import BeadsAdapter
    from tracker_port.fake import FakeAdapter
    from tracker_port.files import FilesAdapter

    classes = {"beads": BeadsAdapter, "files": FilesAdapter, "fake": FakeAdapter}

    assert classes[flag_holder].capabilities.native_ready is False


def test_doctor_shows_native_ready_false() -> None:
    from tracker_port.cli_operations import _doctor

    report = _doctor(_replay_adapter(), None)

    assert report["capabilities"].native_ready is False


@pytest.mark.parametrize("kind", KINDS)
def test_replay_next_ready_equals_projector(kind: str) -> None:
    assert sorted(contract.ids(_replay_adapter().next_ready(kind))) == _projector(contract.CORPUS_DIR, kind)


def test_replay_next_ready_under_equals_projector() -> None:
    got = _replay_adapter().next_ready("slice", under="demo-E1")

    assert sorted(contract.ids(got)) == _projector(contract.CORPUS_DIR, "slice", "demo-E1")


@pytest.mark.slow
def test_live_bd_ready_differs_and_adapter_equals_projector(tmp_path: Path) -> None:
    support.require_bd()
    corpus = tmp_path / "corpus"
    shutil.copytree(contract.CORPUS_DIR, corpus)
    adapter = contract._build_beads_scratch(corpus)

    native = _titles(adapter.runner.run(READY_ARGS))

    assert native == ["demo", "demo-E3", "pr-101"]
    for kind in KINDS:
        assert contract.ids(adapter.next_ready(kind)) == _projector(corpus, kind), kind
    assert contract.ids(adapter.next_ready("slice", under="demo-E1")) == ["demo-E1-s3"]
    assert "demo-E1-s3" not in native
