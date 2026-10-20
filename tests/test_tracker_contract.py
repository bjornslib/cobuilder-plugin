"""Contract cases for the tracker port. Slice 1 runs one case on the fake adapter.

Slice 2 runs cases 1 to 6 on every adapter in ADAPTER_BUILDERS. E2 adds the beads
builder there, so the same cases run on beads. The write effects and case 7
(projector parity, E2 slice 6) sit in test_tracker_contract_writes.py.

Run with: uv run pytest tests/test_tracker_contract.py -q
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Callable

import pytest

from _tracker_contract_support import CORPUS_DIR, assert_same_value, ids

# The module holds the corpus, build, and adapter fixtures.
pytest_plugins = ["_tracker_contract_support"]


READY_KINDS = ("program", "epic", "slice")


def test_next_ready_slice_under_epic() -> None:
    # Imports stay inside the test so a missing package fails this test only.
    from tracker_port.fake import FakeAdapter

    ready = FakeAdapter(CORPUS_DIR).next_ready("slice", under="demo-E1")

    assert [record.id for record in ready] == ["demo-E1-s3"]


# Case 1: next_ready never returns a pull request, and never returns a deferred epic.
def test_next_ready_excludes_pr_and_deferred(adapter: Any) -> None:
    for kind in READY_KINDS:
        for record in adapter.next_ready(kind):
            assert record.kind == kind, record.id
    assert "demo-E3" not in ids(adapter.next_ready("epic"))
    assert "pr-101" not in ids(adapter.next_ready("slice"))


# Case 2: next_ready returns the right records for each kind, with and without under.
def test_next_ready_kinds(adapter: Any) -> None:
    assert ids(adapter.next_ready("program")) == ["demo"]
    assert ids(adapter.next_ready("slice")) == ["demo-E1-s3"]
    assert ids(adapter.next_ready("slice", under="demo-E1")) == ["demo-E1-s3"]
    assert ids(adapter.next_ready("slice", under="demo-E2")) == []
    assert ids(adapter.next_ready("epic")) == []


# Case 3: claim_slice leaves the claimant in assignee. Read-back covers atomic_claim false.
def test_claim_leaves_assignee(adapter: Any) -> None:
    adapter.claim_slice("demo-E1-s3", "agent-x")

    assert adapter.get_slice("demo-E1-s3").assignee == "agent-x"


# Case 4a: a typed envelope survives the read path, with list items kept item by item.
# The seed goes into the corpus copy as JSON, so the write path is the file, not the port.
ENVELOPE_VALUES: dict[str, Any] = {
    "rt_str": "design",
    "rt_int": 3,
    "rt_float": 0.5,
    "rt_bool": False,
    "rt_none": None,
    "rt_list": ["docs/a.md", 2, 1.25, True, None],
}


def test_envelope_round_trip(build: Callable[[Path], Any], corpus: Path) -> None:
    program_file = corpus / "program.json"
    program = json.loads(program_file.read_text(encoding="utf-8"))
    program["envelope"].update(ENVELOPE_VALUES)
    program_file.write_text(json.dumps(program), encoding="utf-8")

    envelope = build(corpus).list_programs()[0].envelope

    for key, value in ENVELOPE_VALUES.items():
        assert key in envelope, key
        # The adapter returns lists as tuples, so the expected list is a tuple.
        expected = tuple(value) if isinstance(value, list) else value
        assert_same_value(envelope[key], expected, key)


# Case 4b: a string written through the port reads back as the same string.
def test_gate_value_round_trip(adapter: Any) -> None:
    adapter.set_gate_value("demo", "gate4", "done")

    assert_same_value(adapter.list_programs()[0].envelope["gate4"], "done", "gate4")


# Case 5: a pull request blocks two epics. Both epics show as ready only after the merge.
def test_pr_blocks_two_epics(adapter: Any) -> None:
    # The corpus has pr-101 blocking demo-E1 and demo-E2.
    assert ids(adapter.next_ready("epic")) == []

    adapter.set_pull_request_state("pr-101", merged=True)

    assert ids(adapter.next_ready("epic")) == ["demo-E1", "demo-E2"]


def test_open_pull_request_blocks_two_epics(adapter: Any) -> None:
    adapter.set_pull_request_state("pr-101", merged=True)
    assert ids(adapter.next_ready("epic")) == ["demo-E1", "demo-E2"]

    adapter.open_pull_request("pr-102", ["demo-E1", "demo-E2"])

    assert "pr-102" in ids(adapter.list_pull_requests())
    assert ids(adapter.next_ready("epic")) == []

    adapter.set_pull_request_state("pr-102", merged=True)

    assert ids(adapter.next_ready("epic")) == ["demo-E1", "demo-E2"]


# Case 6: no adapter. load_adapter returns None for a missing config.
def test_load_adapter_without_config_returns_none(tmp_path: Path) -> None:
    from tracker_port.config import load_adapter

    assert load_adapter(tmp_path / ".cobuilder" / "tracker.yaml", tmp_path) is None


class NoAdapter:
    """Stub for a repo with no configured adapter. Every write raises NoAdapterError."""

    def _refuse(self, *args: Any, **kwargs: Any) -> None:
        from tracker_port.port import NoAdapterError

        raise NoAdapterError("no tracker adapter configured")

    claim_slice = _refuse
    set_slice_state = _refuse
    record_attempt = _refuse
    escalate = _refuse
    set_gate_value = _refuse
    set_epic_state = _refuse
    set_program_stage = _refuse
    open_pull_request = _refuse
    set_pull_request_state = _refuse
    add_note = _refuse
    sync = _refuse
    seed_from_files = _refuse


NO_ADAPTER_WRITES: list[tuple[str, tuple[Any, ...]]] = [
    ("claim_slice", ("demo-E1-s3", "agent-x")),
    ("set_slice_state", ("demo-E1-s3", "closed")),
    ("record_attempt", ("demo-E1-s3", 0.5)),
    ("escalate", ("demo-E1-s3", 0.5, "attempt limit reached")),
    ("set_gate_value", ("demo", "gate4", "done")),
    ("set_epic_state", ("demo-E1", "closed")),
    ("set_program_stage", ("demo", "build")),
    ("open_pull_request", ("pr-102", ["demo-E1"])),
    ("set_pull_request_state", ("pr-101", True)),
    ("add_note", ("demo-E1-s3", "a note")),
    ("sync", ()),
    ("seed_from_files", (Path("plans"),)),
]


@pytest.mark.parametrize("method,args", NO_ADAPTER_WRITES, ids=[m for m, _ in NO_ADAPTER_WRITES])
def test_write_without_adapter_raises(method: str, args: tuple[Any, ...]) -> None:
    from tracker_port.port import NoAdapterError

    with pytest.raises(NoAdapterError):
        getattr(NoAdapter(), method)(*args)
