"""E8 slice 34: strip_goal_stage removes `stage` only when the tracker holds the same value."""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

SCRIPT = Path(__file__).resolve().parent.parent / "shared" / "strip_goal_stage.py"
GOALS = {
    "same": ("approved", '{\n    "name": "same",\n    "stage": "approved",\n    "title": "T",\n    "outcome": "O"\n}\n'),
    "other": ("decided", '{\n  "name": "other",\n  "stage": "decided",\n  "title": "T"\n}\n'),
    "noprog": ("decided", '{\n  "name": "noprog",\n  "stage": "decided"\n}\n'),
}


def program(name: str, stage: str) -> dict:
    return {
        "id": name, "kind": "program", "parent": None, "blocked_by": [], "lifecycle": "open",
        "assignee": None, "envelope": {"stage": stage}, "external_ref": None,
    }


def make_repo(tmp_path: Path, tracker: bool = True) -> Path:
    repo = tmp_path / "repo"
    for name, (_, text) in GOALS.items():
        folder = repo / "docs" / "architecture" / "designs" / name
        folder.mkdir(parents=True)
        (folder / "goal.json").write_text(text, encoding="utf-8")
    if tracker:
        corpus = tmp_path / "corpus"
        corpus.mkdir()
        rows = [program("same", "approved"), program("other", "approved")]
        (corpus / "program.json").write_text(json.dumps(rows), encoding="utf-8")
        for name in ("epics", "slices", "prs"):
            (corpus / f"{name}.json").write_text("[]", encoding="utf-8")
        config = repo / ".cobuilder"
        config.mkdir()
        (config / "tracker.yaml").write_text(
            f"adapter: fake\ncorpus: {json.dumps(str(corpus))}\n", encoding="utf-8"
        )
    return repo


def goal_bytes(repo: Path) -> dict[str, bytes]:
    return {n: (repo / "docs/architecture/designs" / n / "goal.json").read_bytes() for n in GOALS}


def strip(repo: Path, *flags: str) -> dict:
    result = subprocess.run(
        [sys.executable, str(SCRIPT), "--repo", str(repo), *flags],
        capture_output=True, text=True, check=False,
    )
    assert result.returncode == 0, result.stderr
    return json.loads(result.stdout)


def test_real_run_strips_only_the_design_the_tracker_agrees_with(tmp_path: Path) -> None:
    repo = make_repo(tmp_path)
    before = goal_bytes(repo)
    report = strip(repo)
    after = goal_bytes(repo)
    assert report["stripped"] == ["same"]
    assert {"design": "other", "reason": "differs"} in report["kept"]
    assert {"design": "noprog", "reason": "no program"} in report["kept"]
    assert after["same"].decode() == '{\n    "name": "same",\n    "title": "T",\n    "outcome": "O"\n}\n'
    assert after["other"] == before["other"]
    assert after["noprog"] == before["noprog"]


def test_dry_run_writes_nothing(tmp_path: Path) -> None:
    repo = make_repo(tmp_path)
    before = goal_bytes(repo)
    report = strip(repo, "--dry-run")
    assert report["dry_run"] is True
    assert report["stripped"] == ["same"]
    assert goal_bytes(repo) == before


def test_second_run_strips_nothing(tmp_path: Path) -> None:
    repo = make_repo(tmp_path)
    strip(repo)
    report = strip(repo)
    assert report["stripped"] == []
    assert report["no_stage_field"] == ["same"]


def test_no_tracker_keeps_every_file(tmp_path: Path) -> None:
    repo = make_repo(tmp_path, tracker=False)
    before = goal_bytes(repo)
    report = strip(repo)
    assert report["stripped"] == []
    assert sorted(k["design"] for k in report["kept"]) == sorted(GOALS)
    assert {k["reason"] for k in report["kept"]} == {"no tracker"}
    assert goal_bytes(repo) == before


def test_uv_run_exits_zero_with_no_tracker_and_help_works(tmp_path: Path) -> None:
    repo = make_repo(tmp_path, tracker=False)
    run = subprocess.run(["uv", "run", str(SCRIPT), "--repo", str(repo)], capture_output=True, text=True, check=False)
    assert run.returncode == 0, run.stderr
    assert {k["reason"] for k in json.loads(run.stdout)["kept"]} == {"no tracker"}
    helped = subprocess.run(["uv", "run", str(SCRIPT), "--help"], capture_output=True, text=True, check=False)
    assert helped.returncode == 0 and "--dry-run" in helped.stdout
