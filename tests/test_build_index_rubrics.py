"""Tests for build_index.py's slice-rubric projection.

review-link slice 3: `data/index.json` carries one `rubric` entity per
`.cobuilder/rubrics/<slug>/slice-N.md` file. The entity's id is
`<slug>/<n>`, the same id space the slice entity uses, so the viewer joins
the two on a plain id comparison. A repo with no rubrics directory projects
an empty list, and a slice with no rubric file simply has no entity.
"""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "shared"))

import build_index  # noqa: E402


def init_repo(repo: Path) -> None:
    subprocess.run(["git", "init", "-q"], cwd=repo, check=True)
    subprocess.run(["git", "config", "user.email", "test@example.com"], cwd=repo, check=True)
    subprocess.run(["git", "config", "user.name", "Test"], cwd=repo, check=True)
    (repo / "README.md").write_text("placeholder\n")
    subprocess.run(["git", "add", "."], cwd=repo, check=True)
    subprocess.run(["git", "commit", "-q", "-m", "init"], cwd=repo, check=True)


def write_rubric(repo: Path, slug: str, n: int, title: str = "A slice acceptance test") -> Path:
    rubric_dir = repo / ".cobuilder" / "rubrics" / slug
    rubric_dir.mkdir(parents=True, exist_ok=True)
    path = rubric_dir / f"slice-{n}.md"
    path.write_text(
        f"# Rubric: Slice {n} — {title}\n\n"
        f"Feature: {slug}\n\n"
        "## Criterion one\n\nThe work meets the criterion.\n"
    )
    return path


def write_manifest(repo: Path, slug: str) -> None:
    rubric_dir = repo / ".cobuilder" / "rubrics" / slug
    rubric_dir.mkdir(parents=True, exist_ok=True)
    (rubric_dir / "manifest.yaml").write_text(f"feature: {slug}\n")


def write_status(repo: Path, slug: str) -> None:
    plan_dir = repo / "docs" / "plans" / slug
    plan_dir.mkdir(parents=True, exist_ok=True)
    (plan_dir / "00-status.md").write_text(
        f"# Status: {slug}\n\n"
        "- Gate 1 — Product: APPROVED 2026-09-01\n"
        "- Gate 2 — Architecture: APPROVED 2026-09-01\n"
        "- Gate 3 — Program Design: APPROVED 2026-09-01\n"
        "- Gate 4 — Blind rubrics: APPROVED 2026-09-01\n"
    )


def write_slices(repo: Path, slug: str, rows: list[str]) -> None:
    plan_dir = repo / "docs" / "plans" / slug
    plan_dir.mkdir(parents=True, exist_ok=True)
    header = "| # | Epic | Slice | Ends with |\n|---|---|---|---|\n"
    (plan_dir / "04-slices.md").write_text(header + "\n".join(rows) + "\n")


def build(repo: Path) -> dict:
    index, _, _, failures = build_index.build_index(repo, repo / ".cobuilder-architect" / "self")
    assert failures == []
    return index


# --- the entity kind reads empty wherever no rubric exists ---


def test_repo_with_no_rubrics_dir_projects_empty_list(tmp_path):
    init_repo(tmp_path)
    index = build(tmp_path)
    assert index["entities"]["rubric"] == []


def test_slice_with_no_rubric_file_has_no_entity(tmp_path):
    init_repo(tmp_path)
    write_status(tmp_path, "widget")
    write_slices(
        tmp_path,
        "widget",
        [
            "| | **`widget/E1` — One epic.** Prose. | | |",
            "| 1 | | First slice | A working state |",
            "| 2 | | Second slice | Another working state |",
        ],
    )
    write_rubric(tmp_path, "widget", 1)
    ents = build(tmp_path)["entities"]
    assert [e["id"] for e in ents["rubric"]] == ["widget/1"]


# --- one rubric file projects with the pinned field set ---


def test_rubric_fields(tmp_path):
    init_repo(tmp_path)
    write_rubric(tmp_path, "widget", 1, "Tracer bullet")
    doc = build(tmp_path)["entities"]["rubric"][0]
    assert doc["id"] == "widget/1"
    assert doc["feature_slug"] == "widget"
    assert doc["n"] == 1
    assert doc["title"] == "Slice 1 — Tracer bullet"
    assert "## Criterion one" in doc["body_md"]
    assert doc["source_path"] == ".cobuilder/rubrics/widget/slice-1.md"
    assert set(doc.keys()) == {"id", "feature_slug", "n", "title", "body_md", "source_path"}


def test_body_md_is_the_whole_file_text(tmp_path):
    init_repo(tmp_path)
    path = write_rubric(tmp_path, "widget", 2)
    doc = build(tmp_path)["entities"]["rubric"][0]
    assert doc["body_md"] == path.read_text()


def test_title_comes_from_the_heading_and_drops_the_rubric_prefix(tmp_path):
    init_repo(tmp_path)
    write_rubric(tmp_path, "widget", 1, "A named acceptance test")
    doc = build(tmp_path)["entities"]["rubric"][0]
    assert doc["title"] == "Slice 1 — A named acceptance test"
    assert "Rubric:" not in doc["title"]


def test_manifest_and_evidence_files_are_not_rubrics(tmp_path):
    init_repo(tmp_path)
    write_rubric(tmp_path, "widget", 1)
    write_manifest(tmp_path, "widget")
    evidence = tmp_path / ".cobuilder" / "rubrics" / "widget" / "evidence"
    evidence.mkdir(parents=True, exist_ok=True)
    (evidence / "slice-1-attempt-1.md").write_text("# attempt one\n")
    ents = build(tmp_path)["entities"]
    assert [e["id"] for e in ents["rubric"]] == ["widget/1"]


def test_rubrics_of_two_features_are_kept_apart(tmp_path):
    init_repo(tmp_path)
    write_rubric(tmp_path, "alpha", 1)
    write_rubric(tmp_path, "beta", 1)
    write_rubric(tmp_path, "beta", 2)
    ents = build(tmp_path)["entities"]
    assert [(e["feature_slug"], e["n"]) for e in ents["rubric"]] == [
        ("alpha", 1),
        ("beta", 1),
        ("beta", 2),
    ]


def test_rubrics_sort_by_number_not_by_filename(tmp_path):
    init_repo(tmp_path)
    for n in (2, 10, 1):
        write_rubric(tmp_path, "widget", n)
    ents = build(tmp_path)["entities"]
    assert [e["n"] for e in ents["rubric"]] == [1, 2, 10]


# --- a rubric edit marks the index stale ---


def test_changing_a_rubric_marks_the_index_stale(tmp_path):
    init_repo(tmp_path)
    write_rubric(tmp_path, "widget", 1)
    index = build(tmp_path)
    assert build_index.is_stale(index, tmp_path) is False

    write_rubric(tmp_path, "widget", 1, "A revised acceptance test")
    assert build_index.is_stale(index, tmp_path) is True


def test_the_rubrics_tree_is_a_tracked_source(tmp_path):
    init_repo(tmp_path)
    write_rubric(tmp_path, "widget", 1)
    index = build(tmp_path)
    assert ".cobuilder/rubrics" in index["sources"]["trees"]