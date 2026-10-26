"""E8 slice 36: joins.tracker and joins.design_tracker."""
from __future__ import annotations

import json
import shutil
from pathlib import Path

import _epic_corpus as corpus
import _tracker_port_support as support


def test_next_ready_is_the_first_slice_by_epic_then_number(tmp_path: Path, monkeypatch) -> None:
    repo = corpus.make_stage_repo(tmp_path)
    index, joins, _ = corpus.build_joins(repo, monkeypatch)
    assert index["schema_version"] == "1.5"
    assert joins["tracker"] == {"adapter": "fake", "read": True}
    assert joins["design_tracker"]["d-approved"]["next_ready"] == "d-approved/E1/1"
    assert joins["design_tracker"]["d-approved"]["stage_source"] == "tracker"


def test_next_ready_is_null_for_implemented_and_superseded(tmp_path: Path, monkeypatch, capsys) -> None:
    repo = corpus.make_stage_repo(tmp_path)
    _, joins, _ = corpus.build_joins(repo, monkeypatch)
    err = capsys.readouterr().err
    for stage in ("implemented", "superseded"):
        assert joins["design_tracker"][f"d-{stage}"]["next_ready"] is None
        assert f"d-{stage}/E1/1" in err and f"design d-{stage}" in err


def test_files_adapter_gives_null_for_every_design(tmp_path: Path, monkeypatch) -> None:
    repo = corpus.make_stage_repo(tmp_path, adapter="files")
    _, joins, _ = corpus.build_joins(repo, monkeypatch)
    assert joins["tracker"]["adapter"] == "files"
    assert all(entry["next_ready"] is None for entry in joins["design_tracker"].values())


def test_pull_request_entries(tmp_path: Path, monkeypatch) -> None:
    repo = corpus.make_stage_repo(tmp_path)
    _, joins, _ = corpus.build_joins(repo, monkeypatch)
    rows = sorted(joins["design_tracker"]["d-approved"]["pull_requests"], key=lambda r: r["ref"])
    assert rows == [
        {"ref": "pr-40", "number": 40, "state": "merged", "epics": ["d-approved/E2"]},
        {"ref": "pr-43", "number": 43, "state": "open", "epics": ["d-approved/E1", "d-approved/E3"]},
    ]
    assert joins["design_tracker"]["d-backlog"]["pull_requests"] == []


def test_unreadable_tracker_gives_read_false(tmp_path: Path, monkeypatch) -> None:
    import build_index
    from tracker_port import reader
    from tracker_port.port import AdapterError

    class BrokenAdapter:
        name = "broken"

        def all_records(self):
            raise AdapterError("corrupt")

    repo = corpus.make_stage_repo(tmp_path, adapter="none")
    monkeypatch.setattr(reader, "open_adapter", lambda repo_root: BrokenAdapter())
    monkeypatch.setattr(build_index, "gh_pr_for_branch", lambda branch, warnings, gh_state: None)
    snapshot = reader.snapshot(repo)
    designs = [{"id": "d-approved", "stage": "approved", "stage_source": "goal"}]
    joins = {
        "tracker": build_index.tracker_join(snapshot, repo),
        "design_tracker": build_index.resolve_design_tracker(designs, snapshot, []),
    }
    assert joins["tracker"]["read"] is False
    assert joins["design_tracker"]["d-approved"] == {
        "stage_source": "goal", "next_ready": None, "pull_requests": [],
    }


class _CountingRunner:
    def __init__(self, list_stdout: str) -> None:
        self.list_stdout = list_stdout
        self.calls: list[list[str]] = []

    def run(self, args: list[str]) -> str:
        from tracker_port.beads import LIST_ARGS

        self.calls.append(list(args))
        if list(args) == list(LIST_ARGS):
            return self.list_stdout
        if args[0] == "ready":
            return "[]"
        raise AssertionError(f"unexpected bd call: {args}")


def test_one_build_makes_at_most_three_bd_calls(tmp_path: Path, monkeypatch) -> None:
    import build_index
    from tracker_port import reader
    from tracker_port.beads import BeadsAdapter

    transcript = json.loads(
        (support.FIXTURES / "beads" / "transcripts" / "list.json").read_text(encoding="utf-8")
    )
    rows = [r for r in json.loads(transcript["stdout"]) if r["metadata"]["cb"]["kind"] == "program"]
    runner = _CountingRunner(json.dumps(rows))
    repo = corpus.make_stage_repo(tmp_path, adapter="none")
    for stage in corpus.STAGES:
        if stage != "approved":
            shutil.rmtree(repo / "docs" / "architecture" / "designs" / f"d-{stage}")
    monkeypatch.setattr(reader, "open_adapter", lambda repo_root: BeadsAdapter(runner, sync="off"))
    monkeypatch.setattr(build_index, "gh_pr_for_branch", lambda branch, warnings, gh_state: None)
    bundle = repo / ".cobuilder-architect" / "self"
    bundle.mkdir(parents=True)

    build_index.build_index(repo, bundle)

    assert len(runner.calls) <= 3, runner.calls
