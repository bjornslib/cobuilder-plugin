"""Contract cases for the tracker port. Slice 1 runs one case on the fake adapter.

Slice 2 runs cases 1 to 6 on every adapter in ADAPTER_BUILDERS. E2 adds the beads
builder there, so the same cases run on beads. Case 7 (projector parity) is E2 slice 6.

Run with: uv run pytest tests/test_tracker_contract.py -q
"""
from __future__ import annotations

import json
import shutil
import sys
from pathlib import Path
from typing import Any, Callable

import pytest

SHARED_DIR = Path(__file__).resolve().parent.parent / "shared"
sys.path.insert(0, str(SHARED_DIR))

CORPUS_DIR = Path(__file__).resolve().parent / "fixtures" / "tracker" / "corpus"
EXPECTED_INDEX = CORPUS_DIR.parent / "expected-index.json"
BEADS_TRANSCRIPT = CORPUS_DIR.parent / "beads" / "transcripts" / "list.json"

READY_KINDS = ("program", "epic", "slice")


def _build_fake(corpus_dir: Path) -> Any:
    from tracker_port.fake import FakeAdapter

    return FakeAdapter(corpus_dir)


# Each entry builds one adapter over a corpus copy. E2 adds "beads" here.
ADAPTER_BUILDERS: dict[str, Callable[[Path], Any]] = {"fake": _build_fake}


class _ReplayRunner:
    """Stands in for BdRunner. It answers only the recorded bd call."""

    def __init__(self, args: list[str], stdout: str) -> None:
        self.expected_args = args
        self.stdout = stdout

    def run(self, args: list[str]) -> str:
        assert list(args) == self.expected_args, f"unexpected bd call: {args}"
        return self.stdout


def _build_beads_replay(_corpus_dir: Path) -> Any:
    # Replays the recorded bd 1.3.0 list call. The corpus is unused: beads reads come from the transcript.
    from tracker_port.beads import BeadsAdapter

    transcript = json.loads(BEADS_TRANSCRIPT.read_text(encoding="utf-8"))
    return BeadsAdapter(runner=_ReplayRunner(transcript["args"], transcript["stdout"]))


# Case 7 only. Replay adapters need no bd. Slice 7 adds real-bd writes to ADAPTER_BUILDERS.
READ_ADAPTER_BUILDERS: dict[str, Callable[[Path], Any]] = {"fake": _build_fake, "beads": _build_beads_replay}


def test_next_ready_slice_under_epic() -> None:
    # Imports stay inside the test so a missing package fails this test only.
    from tracker_port.fake import FakeAdapter

    ready = FakeAdapter(CORPUS_DIR).next_ready("slice", under="demo-E1")

    assert [record.id for record in ready] == ["demo-E1-s3"]


@pytest.fixture
def corpus(tmp_path: Path) -> Path:
    # Writes run on a copy, so the checked-in corpus never changes.
    copy = tmp_path / "corpus"
    shutil.copytree(CORPUS_DIR, copy)
    return copy


@pytest.fixture(params=list(ADAPTER_BUILDERS))
def build(request: pytest.FixtureRequest) -> Callable[[Path], Any]:
    return ADAPTER_BUILDERS[request.param]


@pytest.fixture
def adapter(build: Callable[[Path], Any], corpus: Path) -> Any:
    return build(corpus)


def _ids(records: list[Any]) -> list[str]:
    return [record.id for record in records]


def _assert_same_value(stored: Any, expected: Any, label: str) -> None:
    # Type first: True == 1 and 1 == 1.0 in Python, so equality alone hides a type change.
    assert type(stored) is type(expected), label
    if isinstance(expected, tuple):
        assert len(stored) == len(expected), label
        for index, (got, want) in enumerate(zip(stored, expected)):
            _assert_same_value(got, want, f"{label}[{index}]")
    else:
        assert stored == expected, label


# Case 1: next_ready never returns a pull request, and never returns a deferred epic.
def test_next_ready_excludes_pr_and_deferred(adapter: Any) -> None:
    for kind in READY_KINDS:
        for record in adapter.next_ready(kind):
            assert record.kind == kind, record.id
    assert "demo-E3" not in _ids(adapter.next_ready("epic"))
    assert "pr-101" not in _ids(adapter.next_ready("slice"))


# Case 2: next_ready returns the right records for each kind, with and without under.
def test_next_ready_kinds(adapter: Any) -> None:
    assert _ids(adapter.next_ready("program")) == ["demo"]
    assert _ids(adapter.next_ready("slice")) == ["demo-E1-s3"]
    assert _ids(adapter.next_ready("slice", under="demo-E1")) == ["demo-E1-s3"]
    assert _ids(adapter.next_ready("slice", under="demo-E2")) == []
    assert _ids(adapter.next_ready("epic")) == []


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
        _assert_same_value(envelope[key], expected, key)


# Case 4b: a string written through the port reads back as the same string.
def test_gate_value_round_trip(adapter: Any) -> None:
    adapter.set_gate_value("demo", "gate4", "done")

    _assert_same_value(adapter.list_programs()[0].envelope["gate4"], "done", "gate4")


# Case 5: a pull request blocks two epics. Both epics show as ready only after the merge.
def test_pr_blocks_two_epics(adapter: Any) -> None:
    # The corpus has pr-101 blocking demo-E1 and demo-E2.
    assert _ids(adapter.next_ready("epic")) == []

    adapter.set_pull_request_state("pr-101", merged=True)

    assert _ids(adapter.next_ready("epic")) == ["demo-E1", "demo-E2"]


def test_open_pull_request_blocks_two_epics(adapter: Any) -> None:
    adapter.set_pull_request_state("pr-101", merged=True)
    assert _ids(adapter.next_ready("epic")) == ["demo-E1", "demo-E2"]

    adapter.open_pull_request("pr-102", ["demo-E1", "demo-E2"])

    assert "pr-102" in _ids(adapter.list_pull_requests())
    assert _ids(adapter.next_ready("epic")) == []

    adapter.set_pull_request_state("pr-102", merged=True)

    assert _ids(adapter.next_ready("epic")) == ["demo-E1", "demo-E2"]


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


# Write effects that the fake adapter must keep for the other cases.
def test_set_program_stage_writes_envelope(adapter: Any) -> None:
    adapter.set_program_stage("demo", "build")

    assert adapter.list_programs()[0].envelope["stage"] == "build"


def test_set_epic_state_writes_lifecycle(adapter: Any) -> None:
    adapter.set_epic_state("demo-E1", "closed")

    assert {r.id: r.lifecycle for r in adapter.list_epics()}["demo-E1"] == "closed"


def test_set_slice_state_writes_lifecycle_and_score(adapter: Any) -> None:
    adapter.set_slice_state("demo-E1-s2", "closed", score=0.8)

    slice_record = adapter.get_slice("demo-E1-s2")
    assert slice_record.lifecycle == "closed"
    _assert_same_value(slice_record.envelope["score"], 0.8, "score")


def test_record_attempt_writes_score_and_count(adapter: Any) -> None:
    adapter.record_attempt("demo-E1-s3", 0.6)

    slice_record = adapter.get_slice("demo-E1-s3")
    _assert_same_value(slice_record.envelope["score"], 0.6, "score")
    _assert_same_value(slice_record.envelope["attempts"], 1, "attempts")


def test_escalate_sets_flag(adapter: Any) -> None:
    adapter.escalate("demo-E1-s3", 0.4, "attempt limit reached")

    assert adapter.get_slice("demo-E1-s3").envelope["escalated"] is True


def test_add_note_keeps_record_fields(adapter: Any) -> None:
    before = adapter.get_slice("demo-E1-s3")

    adapter.add_note("demo-E1-s3", "a note")

    after = adapter.get_slice("demo-E1-s3")
    assert (after.lifecycle, after.assignee, dict(after.envelope)) == (
        before.lifecycle,
        before.assignee,
        dict(before.envelope),
    )


def test_sync_keeps_ready_list(adapter: Any) -> None:
    before = _ids(adapter.next_ready("slice"))

    adapter.sync()

    assert _ids(adapter.next_ready("slice")) == before


def test_capabilities_reports_four_flags(adapter: Any) -> None:
    caps = adapter.capabilities

    for flag in ("native_ready", "atomic_claim", "rich_envelope", "offline_read"):
        assert isinstance(getattr(caps, flag), bool), flag


def test_seed_dry_run_returns_creates_and_writes_nothing() -> None:
    from tracker_port.fake import FakeAdapter

    plans_dir = Path(__file__).resolve().parent / "fixtures" / "tracker" / "plans"
    adapter = FakeAdapter(CORPUS_DIR)
    before = _ids(adapter.list_programs()) + _ids(adapter.list_epics()) + _ids(adapter.list_slices())
    dry = _ids(adapter.seed_from_files(plans_dir, dry_run=True))
    assert dry, "the dry run returns the records it would create"
    after_dry = _ids(adapter.list_programs()) + _ids(adapter.list_epics()) + _ids(adapter.list_slices())
    assert after_dry == before, "a dry run writes nothing"
    created = _ids(adapter.seed_from_files(plans_dir))
    assert created == dry, "the real call creates the records the dry run named"


# Case 7: every read adapter projects the same index as the golden file. Beads replays bd output.
@pytest.mark.parametrize("adapter_id", list(READ_ADAPTER_BUILDERS))
def test_contract_case_7_projector_parity(adapter_id: str) -> None:
    from tracker_port.projector import project

    adapter = READ_ADAPTER_BUILDERS[adapter_id](CORPUS_DIR)
    records = [
        *adapter.list_programs(),
        *adapter.list_epics(),
        *adapter.list_slices(),
        *adapter.list_pull_requests(),
    ]
    expected = json.loads(EXPECTED_INDEX.read_text(encoding="utf-8"))

    assert project(records) == expected
