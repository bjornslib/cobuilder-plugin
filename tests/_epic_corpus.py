"""Builds a fake-adapter repo with one design for each stage. Not a test module."""
from __future__ import annotations

import json
from pathlib import Path

import _tracker_port_support as support

STAGES = ("backlog", "decided", "approved", "review", "implemented", "superseded")
LIFECYCLES = {"E1": "open", "E2": "closed", "E3": "in_progress"}


def _record(id: str, kind: str, parent: str | None, lifecycle: str, envelope: dict, **extra) -> dict:
    return {
        "id": id, "kind": kind, "parent": parent, "blocked_by": [], "lifecycle": lifecycle,
        "assignee": None, "envelope": envelope, "external_ref": None, **extra,
    }


def make_stage_repo(tmp_path: Path, adapter: str = "fake") -> Path:
    """One design per stage, each with epics E1 (open), E2 (closed), E3 (in_progress)."""
    repo = tmp_path / "repo"
    corpus = tmp_path / "corpus"
    corpus.mkdir()
    programs, epics, slices = [], [], []
    for stage in STAGES:
        design = f"d-{stage}"
        designs = repo / "docs" / "architecture" / "designs" / design
        designs.mkdir(parents=True)
        goal_epics = [{"id": epic} for epic in LIFECYCLES]
        (designs / "goal.json").write_text(
            json.dumps({"name": design, "title": design, "outcome": "x", "stage": stage, "epics": goal_epics}),
            encoding="utf-8",
        )
        programs.append(_record(design, "program", None, "open", {"stage": stage}))
        for epic, lifecycle in LIFECYCLES.items():
            epics.append(_record(f"{design}/{epic}", "epic", design, lifecycle, {}))
        for n, epic in ((2, "E1"), (1, "E1")):
            slices.append(
                _record(
                    f"{design}/{epic}/{n}", "slice", f"{design}/{epic}", "open",
                    {"feature": design, "n": n, "title": f"s{n}", "ends_with": "done"},
                )
            )
        slices.append(
            _record(
                f"{design}/E3/9", "slice", f"{design}/E3", "in_progress",
                {"feature": design, "n": 9, "title": "s9", "ends_with": "done"},
            )
        )
    prs = [
        _record("pr-43", "pr", None, "open", {}, tracks=["d-approved/E1", "d-approved/E3"]),
        {**_record("pr-40", "pr", None, "closed", {}, tracks=["d-approved/E2"]), "external_ref": "gh-40"},
    ]
    prs[0]["external_ref"] = "gh-43"
    for name, rows in (("program", programs), ("epics", epics), ("slices", slices), ("prs", prs)):
        (corpus / f"{name}.json").write_text(json.dumps(rows), encoding="utf-8")
    support.init_git_repo(repo)
    if adapter == "files":
        (repo / "docs" / "plans").mkdir(parents=True)
        config = repo / ".cobuilder"
        config.mkdir()
        (config / "tracker.yaml").write_text(support.files_tracker(), encoding="utf-8")
    if adapter == "fake":
        config = repo / ".cobuilder"
        config.mkdir()
        (config / "tracker.yaml").write_text(
            f"adapter: fake\ncorpus: {json.dumps(str(corpus))}\n", encoding="utf-8"
        )
    return repo


def build_joins(repo: Path, monkeypatch) -> tuple[dict, dict, list[str]]:
    """Run the build in process. Returns (index, failures-free joins, stderr-free warnings)."""
    import build_index

    monkeypatch.setattr(build_index, "gh_pr_for_branch", lambda branch, warnings, gh_state: None)
    bundle = repo / ".cobuilder-architect" / "self"
    bundle.mkdir(parents=True, exist_ok=True)
    index, _, _, failures = build_index.build_index(repo, bundle)
    assert failures == [], failures
    return index, index["joins"], []
