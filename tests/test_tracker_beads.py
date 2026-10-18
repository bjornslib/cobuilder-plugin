"""Slice 6 of E2: beads reads map to the fake corpus records.

Replays the recorded bd 1.3.0 output in tests/fixtures/tracker/beads through a stub
runner. No test calls bd.

Run with: uv run pytest tests/test_tracker_beads.py -q
"""
from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any

SHARED_DIR = Path(__file__).resolve().parent.parent / "shared"
sys.path.insert(0, str(SHARED_DIR))

FIXTURE_DIR = Path(__file__).resolve().parent / "fixtures" / "tracker"
CORPUS_DIR = FIXTURE_DIR / "corpus"
BEADS_DIR = FIXTURE_DIR / "beads"
LIST_ARGS = ["list", "--json", "--all"]


class ReplayRunner:
    """Stands in for BdRunner. It answers only the recorded argument list."""

    def __init__(self, args: list[str], stdout: str) -> None:
        self.expected_args = args
        self.stdout = stdout
        self.calls: list[list[str]] = []

    def run(self, args: list[str]) -> str:
        self.calls.append(list(args))
        assert list(args) == self.expected_args, f"unexpected bd call: {args}"
        return self.stdout


def _transcript() -> dict[str, Any]:
    return json.loads((BEADS_DIR / "transcripts" / "list.json").read_text(encoding="utf-8"))


def _list_rows() -> list[dict[str, Any]]:
    return json.loads((BEADS_DIR / "list.json").read_text(encoding="utf-8"))


def _beads_adapter(stdout: str | None = None) -> Any:
    from tracker_port.beads import BeadsAdapter

    transcript = _transcript()
    runner = ReplayRunner(LIST_ARGS, transcript["stdout"] if stdout is None else stdout)
    return BeadsAdapter(runner)


def _all_records(adapter: Any) -> list[Any]:
    records = adapter.list_programs() + adapter.list_epics() + adapter.list_slices()
    return sorted(records + adapter.list_pull_requests(), key=lambda record: record.id)


def _fake_records() -> list[Any]:
    from tracker_port.fake import FakeAdapter

    fake = FakeAdapter(CORPUS_DIR)
    records = fake.list_programs() + fake.list_epics() + fake.list_slices()
    return sorted(records + fake.list_pull_requests(), key=lambda record: record.id)


def test_transcript_stdout_is_the_list_fixture() -> None:
    assert _transcript()["args"] == LIST_ARGS
    assert json.loads(_transcript()["stdout"]) == _list_rows()


def test_list_json_maps_to_fake_records() -> None:
    beads = _all_records(_beads_adapter())
    fake = _fake_records()

    assert len(beads) == 8
    assert [record.id for record in beads] == [record.id for record in fake]
    assert beads == fake


def test_hooked_status_maps_to_in_progress() -> None:
    rows = _list_rows()
    for row in rows:
        if row["id"] == "t-anc.1.2":
            row["status"] = "hooked"

    adapter = _beads_adapter(json.dumps(rows))
    record = next(item for item in adapter.list_slices() if item.id == "demo-E1-s2")

    assert record.lifecycle == "in_progress"


def test_unknown_metadata_version_raises() -> None:
    from tracker_port.port import AdapterError

    rows = _list_rows()
    rows[0]["metadata"]["cb"]["v"] = 2
    adapter = _beads_adapter(json.dumps(rows))

    try:
        _all_records(adapter)
    except AdapterError as error:
        assert "2" in str(error)
    else:
        raise AssertionError("metadata.cb.v = 2 must raise AdapterError")


def test_capabilities_flags() -> None:
    adapter = _beads_adapter()
    caps = adapter.capabilities
    caps = caps() if callable(caps) else caps

    assert caps.atomic_claim is False
    assert caps.rich_envelope is True
