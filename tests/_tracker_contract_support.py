"""Shared builders and fixtures for the tracker contract tests. Not a test module.

Each builder makes one adapter over a corpus copy. The fixtures run a case on
every adapter in ADAPTER_BUILDERS. The tests import the fixtures by name.
"""
from __future__ import annotations

import json
import shutil
from pathlib import Path
from typing import Any, Callable

import pytest

import _tracker_port_support as support

CORPUS_DIR = support.CORPUS
BEADS_TRANSCRIPT = CORPUS_DIR.parent / "beads" / "transcripts" / "list.json"


def _build_fake(corpus_dir: Path) -> Any:
    from tracker_port.fake import FakeAdapter

    return FakeAdapter(corpus_dir)


def _seed_plan(corpus_dir: Path) -> list[tuple[dict[str, Any], str]]:
    # Parents come first, so each parent id exists when its child is created.
    def load(name: str) -> Any:
        return json.loads((corpus_dir / name).read_text(encoding="utf-8"))

    programs = load("program.json")
    records = [*(programs if isinstance(programs, list) else [programs]), *load("prs.json"), *load("epics.json"), *load("slices.json")]
    bd_types = {"program": "feature", "pr": "milestone", "epic": "epic", "slice": "task"}
    return [(record, bd_types[record["kind"]]) for record in records]


def _build_beads_scratch(corpus_dir: Path) -> Any:
    # Real bd in a scratch tracker, seeded from the corpus copy at build time.
    # Skips when bd is not on PATH, so the suite runs without bd.
    if shutil.which("bd") is None:
        pytest.skip("bd is not on PATH")
    from tracker_port.bd_runner import BdRunner
    from tracker_port.beads import BeadsAdapter

    root = corpus_dir.parent / "bd"
    root.mkdir()
    runner = BdRunner(cwd=root)
    runner.run(["init", "--quiet", "--prefix", "t", "--skip-agents", "--skip-hooks", "--non-interactive"])
    bd_ids: dict[str, str] = {}
    for record, bd_type in _seed_plan(corpus_dir):
        args = [
            "create", "--silent", "--type", bd_type, "--title", record["id"],
            "--priority", "1" if record["kind"] == "program" else "2", "--labels", "cb",
            "--metadata", json.dumps({"cb": {"v": 1, "id": record["id"], "kind": record["kind"], "envelope": record["envelope"]}}),
        ]
        if record["external_ref"]:
            args += ["--external-ref", record["external_ref"]]
        # A deferred epic gets the native defer date, so bd hides its slices as the fake does.
        if record["kind"] == "epic" and record["lifecycle"] == "open" and record["envelope"].get("deferred"):
            args += ["--defer", record["envelope"]["deferred"]]
        if record["parent"]:
            args += ["--parent", bd_ids[record["parent"]]]
        for blocker in record["blocked_by"]:
            args += ["--deps", f"blocked-by:{bd_ids[blocker]}"]
        bd_id = runner.run(args).strip()
        bd_ids[record["id"]] = bd_id
        if record["lifecycle"] == "closed":
            runner.run(["update", bd_id, "--status", "closed"])
        elif record["lifecycle"] == "in_progress":
            runner.run(["update", bd_id, "--status", "in_progress", *(["--assignee", record["assignee"]] if record["assignee"] else [])])
    # A pull request tracks its epics. The edge runs from the pull request to each epic, and it blocks nothing.
    for record, _ in _seed_plan(corpus_dir):
        for epic in record.get("tracks", []):
            runner.run(["dep", "add", bd_ids[record["id"]], bd_ids[epic], "--type", "tracks"])
    return BeadsAdapter(runner=runner)


# Each entry builds one adapter over a corpus copy.
ADAPTER_BUILDERS: dict[str, Callable[[Path], Any]] = {"fake": _build_fake, "beads": _build_beads_scratch}


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


@pytest.fixture
def corpus(tmp_path: Path) -> Path:
    # Writes run on a copy, so the checked-in corpus never changes.
    copy = tmp_path / "corpus"
    shutil.copytree(CORPUS_DIR, copy)
    return copy


@pytest.fixture(params=[pytest.param(name, marks=pytest.mark.slow) if name == "beads" else name for name in ADAPTER_BUILDERS])
def build(request: pytest.FixtureRequest) -> Callable[[Path], Any]:
    return ADAPTER_BUILDERS[request.param]


@pytest.fixture
def adapter(build: Callable[[Path], Any], corpus: Path) -> Any:
    return build(corpus)


def ids(records: list[Any]) -> list[str]:
    return [record.id for record in records]


def ready_sets(adapter: Any) -> dict[str, list[str]]:
    """The ids that next_ready gives for each ready kind."""
    return {kind: ids(adapter.next_ready(kind)) for kind in ("program", "epic", "slice")}


def tracked(adapter: Any, ref: str) -> list[str]:
    """The epic ids that the pull request `ref` tracks, sorted. bd may list the edges in any order."""
    return sorted(next(record for record in adapter.list_pull_requests() if record.id == ref).tracks)


def blocked_by_a_pr(adapter: Any) -> list[str]:
    """The ids of the epics that a pull request still blocks. A native tracker has none."""
    return [epic.id for epic in adapter.list_epics() if any(b.startswith("pr-") for b in epic.blocked_by)]


def assert_same_value(stored: Any, expected: Any, label: str) -> None:
    # Type first: True == 1 and 1 == 1.0 in Python, so equality alone hides a type change.
    assert type(stored) is type(expected), label
    if isinstance(expected, tuple):
        assert len(stored) == len(expected), label
        for index, (got, want) in enumerate(zip(stored, expected)):
            assert_same_value(got, want, f"{label}[{index}]")
    else:
        assert stored == expected, label
