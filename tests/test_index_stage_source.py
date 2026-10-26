"""E8 slice 33: the index reads the design stage from the tracker, with a fallback.

The six cases of the design's stage table run on the fake adapter, over the
corpora under tests/fixtures/tracker/stage/. Each corpus configures the
adapter through the repo's .cobuilder/tracker.yaml, the way the live install
does. One counting-runner test shows one build makes at most three bd calls.

Run with: uv run pytest tests/test_index_stage_source.py -q
"""
from __future__ import annotations

import json
import os
import shutil
import stat
import subprocess
import sys
from pathlib import Path

import _tracker_port_support as support

SHARED_DIR = support.SHARED_DIR
FIXTURE = Path(__file__).resolve().parent / "fixtures" / "tracker" / "stage"
BUILD_SCRIPT = SHARED_DIR / "build_index.py"

SELF_DATA = Path(".cobuilder-architect") / "self" / "data"


def make_repo(tmp_path: Path, corpus: str | None) -> Path:
    repo = tmp_path / "repo"
    shutil.copytree(FIXTURE / "repo", repo)
    support.init_git_repo(repo)
    if corpus is not None:
        config = repo / ".cobuilder"
        config.mkdir()
        (config / "tracker.yaml").write_text(
            f"adapter: fake\ncorpus: {json.dumps(str(FIXTURE / corpus))}\n", encoding="utf-8"
        )
    return repo


def build(repo: Path, tmp_path: Path, expect_success: bool = True) -> tuple[dict, list[str]]:
    """Run the real build as a separate process. Returns (index, stderr lines).

    A build with failures writes no index and exits 1, so the caller asserts
    on the stderr lines alone in those cases.
    """
    bin_dir = tmp_path / "bin"
    bin_dir.mkdir(exist_ok=True)
    gh = bin_dir / "gh"
    gh.write_text("#!/bin/sh\necho '[]'\n")
    gh.chmod(gh.stat().st_mode | stat.S_IEXEC)
    env = {**os.environ, "PATH": f"{bin_dir}{os.pathsep}{os.environ['PATH']}"}
    result = subprocess.run(
        [sys.executable, str(BUILD_SCRIPT), "--repo", str(repo)],
        capture_output=True, text=True, check=False, env=env,
    )
    if expect_success:
        assert result.returncode == 0, result.stderr
    index_path = repo / SELF_DATA / "index.json"
    index = json.loads(index_path.read_text(encoding="utf-8")) if index_path.is_file() else {}
    # Each failure and each warning reaches the stderr of the build.
    lines = [line.strip() for line in result.stderr.splitlines() if line.strip()]
    return index, lines


def designs_of(index: dict) -> dict[str, dict]:
    return {entity["id"]: entity for entity in index.get("entities", {}).get("design", [])}


# --- Case 1: the tracker holds a program with a valid stage ---


def test_tracker_stage_wins_with_stage_source_tracker(tmp_path: Path) -> None:
    repo = make_repo(tmp_path, "corpus-stage")
    shutil.rmtree(repo / "docs" / "architecture" / "designs" / "nothing")
    subprocess.run(["git", "-C", str(repo), "add", "-A"], check=True)
    index, _ = build(repo, tmp_path)
    mapped = designs_of(index)["mapped"]
    assert mapped["stage"] == "approved"
    assert mapped["stage_source"] == "tracker"


# --- Case 2: no tracker program, and goal.json holds a valid stage ---


def test_goal_stage_is_the_fallback_with_stage_source_goal(tmp_path: Path) -> None:
    repo = make_repo(tmp_path, "corpus-goal")
    shutil.rmtree(repo / "docs" / "architecture" / "designs" / "nothing")
    subprocess.run(["git", "-C", str(repo), "add", "-A"], check=True)
    index, _ = build(repo, tmp_path)
    goaled = designs_of(index)["goaled"]
    assert goaled["stage"] == "decided"
    assert goaled["stage_source"] == "goal"


# --- Case 3: both hold a valid stage and the values differ ---


def test_drift_warns_and_the_tracker_wins(tmp_path: Path) -> None:
    # The drift warning is a warning, so the build still exits 0 and writes the index.
    repo = make_repo(tmp_path, "corpus-drift")
    # Remove the design with no stage, so only the drift remains in this corpus.
    shutil.rmtree(repo / "docs" / "architecture" / "designs" / "nothing")
    subprocess.run(["git", "-C", str(repo), "add", "-A"], check=True)
    index, lines = build(repo, tmp_path)
    drifted = designs_of(index)["drifted"]
    assert drifted["stage"] == "approved"
    assert drifted["stage_source"] == "tracker"
    drift = [line for line in lines if "stage drift" in line and "drifted" in line]
    assert drift, lines
    assert "'approved'" in drift[0] and "'decided'" in drift[0]


# --- Case 4: a value outside DESIGN_STAGES in the tracker ---


def test_bad_tracker_stage_fails_naming_the_source_and_value(tmp_path: Path) -> None:
    repo = make_repo(tmp_path, "corpus-bad")
    # Keep only the bad design, so its failure is the one this test reads.
    for design in ("mapped", "goaled", "drifted", "nothing"):
        shutil.rmtree(repo / "docs" / "architecture" / "designs" / design)
    subprocess.run(["git", "-C", str(repo), "add", "-A"], check=True)
    index, lines = build(repo, tmp_path, expect_success=False)
    assert index == {}
    failures = [line for line in lines if "bad" in line and "nonsense" in line]
    assert failures, lines
    assert "tracker" in failures[0]


# --- Case 5: no source holds a stage ---


def test_no_stage_fails_naming_the_set_program_stage_call(tmp_path: Path) -> None:
    repo = make_repo(tmp_path, "corpus-nothing")
    index, lines = build(repo, tmp_path, expect_success=False)
    assert index == {}
    failures = [line for line in lines if "nothing" in line and "stage" in line]
    assert failures, lines
    assert "tracker.py set-program-stage nothing backlog --plans-dir docs/plans" in failures[0]


# --- Case 6: the tracker cannot be read ---


def test_unreadable_tracker_warns_and_every_design_uses_its_goal_stage(tmp_path: Path, monkeypatch) -> None:
    # A stub adapter that raises AdapterError on its read stands in for a broken tracker.
    import build_index
    from tracker_port import reader
    from tracker_port.port import AdapterError

    class BrokenAdapter:
        name = "broken"

        def all_records(self):
            raise AdapterError("the tracker file is corrupt")

    repo = make_repo(tmp_path, None)
    monkeypatch.setattr(reader, "open_adapter", lambda repo_root: BrokenAdapter())
    snapshot = reader.snapshot(repo)
    assert snapshot.error == "the tracker file is corrupt"

    warnings: list[str] = []
    designs, _, _, failures = build_index.collect_designs(repo, snapshot, warnings)
    by_id = {entity["id"]: entity for entity in designs}

    assert any("the tracker file is corrupt" in line for line in warnings), warnings
    for design in ("mapped", "goaled", "drifted", "bad"):
        assert by_id[design]["stage"] == "decided" or by_id[design]["stage"] == "approved"
        assert by_id[design]["stage_source"] == "goal"
    assert "nothing" not in by_id
    assert any("nothing" in line and "tracker is unreadable" in line for line in failures), failures


# --- one build makes at most three bd calls ---


class _CountingBdRunner:
    """Answers the list read from the recorded transcript and the ready read with no rows."""

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
    # Keep the program rows only: the recorded slices carry no `feature` key for the projector.
    rows = [r for r in json.loads(transcript["stdout"]) if r["metadata"]["cb"]["kind"] == "program"]
    runner = _CountingBdRunner(json.dumps(rows))
    repo = make_repo(tmp_path, None)
    shutil.rmtree(repo / "docs" / "architecture" / "designs" / "nothing")
    monkeypatch.setattr(reader, "open_adapter", lambda repo_root: BeadsAdapter(runner, sync="off"))
    monkeypatch.setattr(build_index, "gh_pr_for_branch", lambda branch, warnings, gh_state: None)
    bundle = repo / ".cobuilder-architect" / "self"
    bundle.mkdir(parents=True)

    _, _, _, failures = build_index.build_index(repo, bundle)

    assert failures == []
    assert len(runner.calls) <= 3, runner.calls
    # The snapshot lists once. next_ready lists again, then asks bd for the ready rows.
    assert [call[0] for call in runner.calls] == ["list", "list", "ready"]
