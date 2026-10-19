"""Slice 6 of E2: beads reads map to the fake corpus records.

Replays the recorded bd 1.3.0 output in tests/fixtures/tracker/beads through a stub
runner. The fresh-clone test calls real bd, only in a temp directory.

Run with: uv run pytest tests/test_tracker_beads.py -q
"""
from __future__ import annotations

from collections import Counter
import json
import os
import shutil
import subprocess
import sys
import tempfile
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


_FRESH_CLONE_ENV = {
    "GIT_AUTHOR_NAME": "beads-test",
    "GIT_AUTHOR_EMAIL": "beads-test@example.invalid",
    "GIT_COMMITTER_NAME": "beads-test",
    "GIT_COMMITTER_EMAIL": "beads-test@example.invalid",
    "BD_NON_INTERACTIVE": "1",
}


class _RecordingRunner:
    """Wraps a real BdRunner and keeps each argument list it runs."""

    def __init__(self, inner: Any) -> None:
        self.inner = inner
        self.calls: list[list[str]] = []

    def run(self, args: list[str]) -> str:
        self.calls.append(list(args))
        return self.inner.run(args)


def _step(argv: list[str], cwd: Path) -> subprocess.CompletedProcess[str]:
    completed = subprocess.run(
        argv,
        cwd=cwd,
        capture_output=True,
        text=True,
        env={**os.environ, **_FRESH_CLONE_ENV},
    )
    print(f"[{cwd.name}] {' '.join(argv)} -> exit {completed.returncode}")
    return completed


def _run(argv: list[str], cwd: Path) -> subprocess.CompletedProcess[str]:
    completed = _step(argv, cwd)
    output = completed.stdout + completed.stderr
    error_lines = [line for line in output.splitlines() if line.startswith("Error")]
    assert completed.returncode == 0, f"{argv} in {cwd.name} exited {completed.returncode}:\n{output}"
    assert not error_lines, f"{argv} in {cwd.name} printed error lines: {error_lines}"
    return completed


def test_fresh_clone_inits_and_syncs() -> None:
    if shutil.which("bd") is None:
        raise AssertionError("bd is not on PATH. This test needs bd 1.3.0 and fails without it.")

    from tracker_port.beads import BeadsAdapter
    from tracker_port.bd_runner import BdRunner
    from tracker_port.files import FilesAdapter
    from tracker_port.projector import project

    plan_dir = FIXTURE_DIR / "plans"
    expected = FilesAdapter(plan_dir).all_records()
    expected_ids = sorted(record.id for record in expected)
    expected_kinds = Counter(entity["kind"] for entity in project(expected)["entities"].values())

    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        origin = root / "origin.git"
        seed = root / "seed"
        seed.mkdir()
        _run(["git", "init", "--bare", "-q", str(origin)], root)
        _run(["git", "init", "-q", "-b", "main"], seed)
        _run(["git", "commit", "-q", "--allow-empty", "-m", "seed"], seed)
        _run(["git", "remote", "add", "origin", str(origin)], seed)
        _run(["git", "push", "-q", "origin", "main"], seed)
        _run(["bd", "init", "--skip-agents", "--skip-hooks", "-p", "demo", "--non-interactive"], seed)
        _run(["bd", "config", "set", "team.enabled", "true"], seed)
        _run(["bd", "config", "set", "team.sync_branch", "main"], seed)

        seed_runner = _RecordingRunner(BdRunner(bd="bd", cwd=seed))
        created = BeadsAdapter(seed_runner).seed_from_files(plan_dir)
        assert sorted(record.id for record in created) == expected_ids

        _run(["git", "-C", str(origin), "show-ref", "refs/dolt/data"], root)

        second_runner = _RecordingRunner(BdRunner(bd="bd", cwd=seed))
        assert BeadsAdapter(second_runner).seed_from_files(plan_dir) == []
        assert not [call for call in second_runner.calls if call[:1] == ["create"]]

        for name in ("clone1", "clone2"):
            clone = root / name
            _run(["git", "clone", "-q", str(origin), str(clone)], root)
            _run(["bd", "init", "--skip-agents", "--skip-hooks", "-p", "demo", "--non-interactive"], clone)
            _run(["bd", "sync"], clone)
            listed = _run(["bd", "list", "--json", "--all"], clone)
            cbs = [row["metadata"]["cb"] for row in json.loads(listed.stdout)]
            assert sorted(cb["id"] for cb in cbs) == expected_ids
            assert Counter(cb["kind"] for cb in cbs) == expected_kinds

        from tracker_port.record import TrackerRecord

        template = next(record for record in expected if record.kind == "slice")
        probe = TrackerRecord(
            id="demo-sync-probe",
            kind="slice",
            parent=template.parent,
            blocked_by=(),
            lifecycle="open",
            assignee=None,
            envelope={},
            external_ref=None,
        )
        BeadsAdapter(seed_runner).create_record(probe)

        clone3 = root / "clone3"
        _run(["git", "clone", "-q", str(origin), str(clone3)], root)
        _run(["bd", "init", "--skip-agents", "--skip-hooks", "-p", "demo", "--non-interactive"], clone3)
        _run(["bd", "sync"], clone3)
        listed = _run(["bd", "list", "--json", "--all"], clone3)
        cbs = [row["metadata"]["cb"] for row in json.loads(listed.stdout)]
        assert sorted(cb["id"] for cb in cbs) == sorted([*expected_ids, "demo-sync-probe"])


class _Sequence:
    """Answers bd calls in recorded order. A non-zero exit raises BdError."""

    def __init__(self, steps: list[dict[str, Any]]) -> None:
        self.steps = steps
        self.calls: list[list[str]] = []

    def run(self, args: list[str]) -> str:
        from tracker_port.bd_runner import BdError

        self.calls.append(list(args))
        step = self.steps[len(self.calls) - 1]
        assert list(args) == step["args"], f"unexpected bd call: {args}"
        if step["exit"] != 0:
            raise BdError(f"bd {' '.join(args)} exited {step['exit']}", step["exit"], step["stderr"])
        return step["stdout"]


def test_sync_first_publish_pushes_dolt_then_syncs_again() -> None:
    from tracker_port.beads import BeadsAdapter

    steps = json.loads((BEADS_DIR / "transcripts" / "dolt_push_first_publish_steps.json").read_text(encoding="utf-8"))["steps"]
    runner = _Sequence(steps)
    BeadsAdapter(runner).sync()

    assert runner.calls == [["sync"], ["dolt", "push"], ["sync"]]


def test_sync_second_step_failure_raises_adapter_error() -> None:
    from tracker_port.beads import BeadsAdapter
    from tracker_port.port import AdapterError

    steps = [
        {"args": ["sync"], "stdout": "", "stderr": "Error: no branches found in remote 'origin'\n", "exit": 1},
        {"args": ["dolt", "push"], "stdout": "", "stderr": "Error: push rejected\n", "exit": 1},
    ]
    runner = _Sequence(steps)
    try:
        BeadsAdapter(runner).sync()
    except AdapterError:
        assert runner.calls == [["sync"], ["dolt", "push"]]
        return
    raise AssertionError("a failed dolt push must raise AdapterError")


def test_sync_failure_on_a_non_empty_remote_does_not_push() -> None:
    from tracker_port.beads import BeadsAdapter
    from tracker_port.port import AdapterError

    steps = [{"args": ["sync"], "stdout": "", "stderr": "bd: sync conflict on beads/team-sync\n", "exit": 1}]
    runner = _Sequence(steps)
    try:
        BeadsAdapter(runner).sync()
    except AdapterError:
        assert runner.calls == [["sync"]]
        return
    raise AssertionError("a sync failure without the empty-remote message must raise AdapterError")


class _Answers:
    """Answers the bd calls of one create and close. It needs no bd binary."""

    def __init__(self) -> None:
        self.calls: list[list[str]] = []

    def run(self, args: list[str]) -> str:
        self.calls.append(list(args))
        if args[0] == "list":
            return "[]"
        if args[0] == "create":
            return "demo-bxe\n"
        return ""


def _closed_probe(assignee: str | None) -> Any:
    from tracker_port.record import TrackerRecord

    return TrackerRecord(
        id="demo-closed-probe",
        kind="slice",
        parent=None,
        blocked_by=(),
        lifecycle="closed",
        assignee=assignee,
        envelope={},
        external_ref=None,
    )


def test_create_record_closes_a_closed_slice_after_create() -> None:
    from tracker_port.beads import BeadsAdapter

    steps = json.loads((BEADS_DIR / "transcripts" / "create_closed_slice_steps.json").read_text(encoding="utf-8"))["steps"]
    runner = _Answers()
    BeadsAdapter(runner).create_record(_closed_probe(None))

    assert steps[0]["args"] in runner.calls, runner.calls
    assert steps[1]["args"] in runner.calls, runner.calls
    assert runner.calls.index(steps[0]["args"]) < runner.calls.index(steps[1]["args"]), runner.calls
    assert runner.calls[-1] == ["sync"], runner.calls


def test_create_record_sets_the_assignee_of_a_closed_slice() -> None:
    from tracker_port.beads import BeadsAdapter

    runner = _Answers()
    BeadsAdapter(runner).create_record(_closed_probe("agent-x"))

    create = next(call for call in runner.calls if call[0] == "create")
    assert "--assignee" in create, create
    assert create[create.index("--assignee") + 1] == "agent-x", create

def test_create_record_closed_slice_keeps_parent_assignee_blocker_and_envelope() -> None:
    from tracker_port.beads import BeadsAdapter
    from tracker_port.record import TrackerRecord

    class _ListThenCreate:
        def __init__(self) -> None:
            self.calls: list[list[str]] = []

        def run(self, args: list[str]) -> str:
            self.calls.append(list(args))
            if args[0] == "list":
                return (BEADS_DIR / "list.json").read_text(encoding="utf-8")
            if args[0] == "create":
                return "t-new\n"
            return ""

    runner = _ListThenCreate()
    record = TrackerRecord(
        id="demo-E1-s4",
        kind="slice",
        parent="demo-E1",
        blocked_by=("demo-E1-s1",),
        lifecycle="closed",
        assignee="agent-x",
        envelope={"score": 0.92, "attempts": 2, "escalated": True, "evidence": ["a", "b"]},
        external_ref=None,
    )
    BeadsAdapter(runner).create_record(record)

    create = next(call for call in runner.calls if call[0] == "create")
    assert create[create.index("--parent") + 1] == "t-anc.1", create
    assert create[create.index("--assignee") + 1] == "agent-x", create
    cb = json.loads(create[create.index("--metadata") + 1])["cb"]
    assert cb["id"] == "demo-E1-s4" and cb["kind"] == "slice", cb
    assert cb["envelope"] == {"score": 0.92, "attempts": 2, "escalated": True, "evidence": ["a", "b"]}, cb
    assert ["dep", "add", "t-new", "t-anc.1.1"] in runner.calls, runner.calls
    assert runner.calls.index(["close", "t-new", "--force"]) > runner.calls.index(["dep", "add", "t-new", "t-anc.1.1"]), runner.calls



def _scratch_tracker(root: Path) -> Path:
    origin = root / "origin.git"
    seed = root / "seed"
    seed.mkdir()
    _run(["git", "init", "--bare", "-q", str(origin)], root)
    _run(["git", "init", "-q", "-b", "main"], seed)
    _run(["git", "commit", "-q", "--allow-empty", "-m", "seed"], seed)
    _run(["git", "remote", "add", "origin", str(origin)], seed)
    _run(["git", "push", "-q", "origin", "main"], seed)
    _run(["bd", "init", "--skip-agents", "--skip-hooks", "-p", "demo", "--non-interactive"], seed)
    _run(["bd", "config", "set", "team.enabled", "true"], seed)
    _run(["bd", "config", "set", "team.sync_branch", "main"], seed)
    return seed


def _copy_plans(root: Path) -> Path:
    plans = root / "plans"
    plans.mkdir()
    shutil.copytree(FIXTURE_DIR / "plans-real" / "score-attempt", plans / "score-attempt")
    return plans


def test_seed_closes_records_whose_files_say_closed() -> None:
    if shutil.which("bd") is None:
        raise AssertionError("bd is not on PATH. This test needs bd 1.3.0 and fails without it.")

    from tracker_port.beads import BeadsAdapter
    from tracker_port.bd_runner import BdRunner
    from tracker_port.files import FilesAdapter

    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        plans = _copy_plans(root)
        expected = FilesAdapter(plans).all_records()
        assert any(record.lifecycle == "closed" for record in expected), "the fixture must hold a closed record"

        seed = _scratch_tracker(root)
        adapter = BeadsAdapter(BdRunner(bd="bd", cwd=seed))
        adapter.seed_from_files(plans)
        by_id = {record.id: record for record in _all_records(adapter)}

        for record in expected:
            assert record.id in by_id, f"{record.id} was not seeded"
            assert by_id[record.id].lifecycle == record.lifecycle, f"{record.id}: {by_id[record.id].lifecycle}"


def test_seed_repairs_an_open_record_whose_files_now_say_closed() -> None:
    if shutil.which("bd") is None:
        raise AssertionError("bd is not on PATH. This test needs bd 1.3.0 and fails without it.")

    from tracker_port.beads import BeadsAdapter
    from tracker_port.bd_runner import BdRunner
    from tracker_port.files import FilesAdapter

    source = FIXTURE_DIR / "plans-real" / "score-attempt"

    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        plans = _copy_plans(root)
        closed_ids = [record.id for record in FilesAdapter(plans).all_records() if record.lifecycle == "closed"]
        assert closed_ids, "the fixture must hold a closed record"

        seed = _scratch_tracker(root)
        slices = plans / "score-attempt" / "04-slices.md"
        status = plans / "score-attempt" / "00-status.md"
        slices.write_text(slices.read_text(encoding="utf-8").replace("| done |", "| pending |"), encoding="utf-8")
        status.write_text(status.read_text(encoding="utf-8").replace("- [x] Slice 1", "- [ ] Slice 1"), encoding="utf-8")

        adapter = BeadsAdapter(BdRunner(bd="bd", cwd=seed))
        adapter.seed_from_files(plans)
        before = {record.id: record for record in _all_records(adapter)}
        for record_id in closed_ids:
            assert before[record_id].lifecycle == "open", f"{record_id} should start open"

        shutil.copyfile(source / "04-slices.md", slices)
        shutil.copyfile(source / "00-status.md", status)
        adapter.seed_from_files(plans)
        after = {record.id: record for record in _all_records(adapter)}

        for record_id in closed_ids:
            assert after[record_id].lifecycle == "closed", f"{record_id}: {after[record_id].lifecycle}"
            assert after[record_id].envelope == before[record_id].envelope, f"{record_id} envelope changed"


def test_seed_closes_a_slice_blocked_by_a_completed_slice() -> None:
    if shutil.which("bd") is None:
        raise AssertionError("bd is not on PATH. This test needs bd 1.3.0 and fails without it.")

    from tracker_port.beads import BeadsAdapter
    from tracker_port.bd_runner import BdRunner
    from tracker_port.files import FilesAdapter

    source = FIXTURE_DIR / "plans-real" / "blocked-close"

    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        plans = root / "plans"
        shutil.copytree(source, plans / "blocked-close")
        expected = FilesAdapter(plans).all_records()
        slices = [record for record in expected if record.kind == "slice"]
        assert len(slices) == 2, "the fixture must hold two slices"
        assert all(record.lifecycle == "closed" for record in slices), "both slices must be completed"
        assert any(record.blocked_by for record in slices), "one slice must be blocked by the other"

        seed = _scratch_tracker(root)
        adapter = BeadsAdapter(BdRunner(bd="bd", cwd=seed))
        adapter.seed_from_files(plans)
        by_id = {record.id: record for record in _all_records(adapter)}

        for record in slices:
            assert record.id in by_id, f"{record.id} was not seeded"
            assert by_id[record.id].lifecycle == "closed", f"{record.id}: {by_id[record.id].lifecycle}"


def test_create_record_round_trip_on_real_bd() -> None:
    if shutil.which("bd") is None:
        raise AssertionError("bd is not on PATH. This test needs bd 1.3.0.")

    from tracker_port.beads import BeadsAdapter
    from tracker_port.bd_runner import BdRunner
    from tracker_port.files import FilesAdapter
    from tracker_port.record import TrackerRecord

    source = FIXTURE_DIR / "plans-real" / "blocked-close"

    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        plans = root / "plans"
        shutil.copytree(source, plans / "blocked-close")
        expected = FilesAdapter(plans).all_records()
        epic = next(record for record in expected if record.kind == "epic")
        blocker = next(record for record in expected if record.kind == "slice")

        seed = _scratch_tracker(root)
        adapter = BeadsAdapter(BdRunner(bd="bd", cwd=seed))
        adapter.seed_from_files(plans)

        written = TrackerRecord(
            id=f"{blocker.id}-round-trip",
            kind="slice",
            parent=epic.id,
            blocked_by=(blocker.id,),
            lifecycle="closed",
            assignee="agent-x",
            envelope={"score": 0.92, "attempts": 2, "escalated": True, "evidence": ["a", "b"]},
            external_ref=None,
        )
        adapter.create_record(written)
        read = adapter.get_slice(written.id)

        assert read.parent == written.parent, read.parent
        assert read.blocked_by == written.blocked_by, read.blocked_by
        assert read.lifecycle == written.lifecycle, read.lifecycle
        assert read.assignee == written.assignee, f"assignee after close --force: {read.assignee!r}"
        # Lists come back as tuples, so the envelope compares with a tuple.
        assert read.envelope == {"score": 0.92, "attempts": 2, "escalated": True, "evidence": ("a", "b")}, read.envelope
        assert type(read.envelope["score"]) is float
        assert type(read.envelope["attempts"]) is int
        assert type(read.envelope["escalated"]) is bool


def test_seed_repair_closes_two_slices_that_turn_completed_on_real_bd() -> None:
    if shutil.which("bd") is None:
        raise AssertionError("bd is not on PATH. This test needs bd 1.3.0.")

    from tracker_port.beads import BeadsAdapter
    from tracker_port.bd_runner import BdRunner
    from tracker_port.files import FilesAdapter

    source = FIXTURE_DIR / "plans-real" / "blocked-close"

    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        plans = root / "plans"
        copy = plans / "blocked-close"
        shutil.copytree(source, copy)
        slice_ids = [record.id for record in FilesAdapter(plans).all_records() if record.kind == "slice"]
        assert len(slice_ids) == 2, "the fixture must hold two slices"

        slices_md = copy / "04-slices.md"
        status_md = copy / "00-status.md"
        slices_md.write_text(slices_md.read_text(encoding="utf-8").replace("| done |", "| pending |"), encoding="utf-8")
        status_md.write_text(status_md.read_text(encoding="utf-8").replace("- [x] Slice", "- [ ] Slice"), encoding="utf-8")

        seed = _scratch_tracker(root)
        adapter = BeadsAdapter(BdRunner(bd="bd", cwd=seed))
        adapter.seed_from_files(plans)
        before = {record.id: record for record in _all_records(adapter)}
        for record_id in slice_ids:
            assert before[record_id].lifecycle == "open", f"{record_id}: {before[record_id].lifecycle}"

        shutil.copyfile(source / "04-slices.md", slices_md)
        shutil.copyfile(source / "00-status.md", status_md)
        adapter.seed_from_files(plans)
        after = {record.id: record for record in _all_records(adapter)}
        for record_id in slice_ids:
            assert after[record_id].lifecycle == "closed", f"{record_id}: {after[record_id].lifecycle}"
