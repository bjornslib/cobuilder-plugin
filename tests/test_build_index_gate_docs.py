"""Tests for build_index.py's Gate 3 / Gate 4b document projection (ADR-0022).

Run with: uv run --with pytest pytest tests/test_build_index_gate_docs.py -v
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


def write_program_design(repo: Path, slug: str, title: str = "Program Design: Widget", body: str = "## Files\nfoo.py\n") -> Path:
    plan_dir = repo / "docs" / "plans" / slug
    plan_dir.mkdir(parents=True, exist_ok=True)
    path = plan_dir / "03-program-design.md"
    path.write_text(f"# {title}\n\n{body}")
    return path


def write_epic_design(repo: Path, slug: str, epic_id: str, title: str | None = None) -> Path:
    plan_dir = repo / "docs" / "plans" / slug
    plan_dir.mkdir(parents=True, exist_ok=True)
    path = plan_dir / f"epic-{epic_id}-design.md"
    title = title or f"Epic Technical Solution Design: {epic_id}"
    path.write_text(f"# {title}\n\n## Scope and Intent\nsomething\n")
    return path


def write_status(repo: Path, slug: str, gate3_state: str = "APPROVED 2026-09-01") -> None:
    plan_dir = repo / "docs" / "plans" / slug
    plan_dir.mkdir(parents=True, exist_ok=True)
    (plan_dir / "00-status.md").write_text(
        f"# Status: {slug}\n\n"
        f"- Gate 1 — Product: APPROVED 2026-09-01\n"
        f"- Gate 2 — Architecture: APPROVED 2026-09-01\n"
        f"- Gate 3 — Program Design: {gate3_state}\n"
    )


# ---------------------------------------------------------------------
# C1 (slice 1) — index.json always carries both new entity keys
# ---------------------------------------------------------------------


def test_build_index_has_program_design_and_epic_design_keys_with_no_plans_dir(tmp_path):
    init_repo(tmp_path)
    index, _, _, failures = build_index.build_index(tmp_path, tmp_path / ".cobuilder-architect" / "self")
    assert failures == []
    assert index["entities"]["program_design"] == []
    assert index["entities"]["epic_design"] == []


# ---------------------------------------------------------------------
# Slice 2 — real parsing
# ---------------------------------------------------------------------


def test_project_program_design_reads_title_and_body(tmp_path):
    init_repo(tmp_path)
    path = write_program_design(tmp_path, "widget-feature", title="Program Design: Widget Feature")
    text = path.read_text()
    record = build_index.project_program_design("widget-feature", path, text)
    assert record["id"] == "widget-feature"
    assert record["feature_slug"] == "widget-feature"
    assert record["gate"] == 3
    assert record["title"] == "Program Design: Widget Feature"
    assert "## Files" in record["body_md"]


def test_project_epic_design_id_is_scoped_feature_slug_and_epic_id(tmp_path):
    init_repo(tmp_path)
    path = write_epic_design(tmp_path, "widget-feature", "E1")
    text = path.read_text()
    record = build_index.project_epic_design("E1", "widget-feature", path, text)
    assert record["id"] == "widget-feature/E1"
    assert record["epic_id"] == "E1"
    assert record["feature_slug"] == "widget-feature"


def test_discover_plan_gate_docs_finds_program_and_epic_docs(tmp_path):
    init_repo(tmp_path)
    write_program_design(tmp_path, "widget-feature")
    write_epic_design(tmp_path, "widget-feature", "E1")
    write_epic_design(tmp_path, "widget-feature", "E2")
    found = build_index.discover_plan_gate_docs(tmp_path)
    kinds = sorted((f["kind"], f.get("epic_id")) for f in found)
    assert kinds == [("epic", "E1"), ("epic", "E2"), ("program", None)]


def test_build_index_end_to_end_projects_real_gate_docs(tmp_path):
    init_repo(tmp_path)
    write_program_design(tmp_path, "widget-feature", title="Program Design: Widget Feature")
    write_epic_design(tmp_path, "widget-feature", "E1")
    write_status(tmp_path, "widget-feature")
    index, _, _, failures = build_index.build_index(tmp_path, tmp_path / ".cobuilder-architect" / "self")
    assert failures == []
    pd_ids = {r["id"] for r in index["entities"]["program_design"]}
    ed_ids = {r["id"] for r in index["entities"]["epic_design"]}
    assert pd_ids == {"widget-feature"}
    assert ed_ids == {"widget-feature/E1"}


def test_resolve_feature_gates_attaches_doc_when_program_design_exists(tmp_path):
    init_repo(tmp_path)
    write_program_design(tmp_path, "widget-feature")
    write_status(tmp_path, "widget-feature")
    gates = build_index.resolve_feature_gates(tmp_path)
    gate3 = next(g for g in gates["widget-feature"] if g["n"] == 3)
    assert gate3.get("doc") == "widget-feature"


def test_resolve_feature_gates_gate3_doc_key_absent_when_no_md_file(tmp_path):
    init_repo(tmp_path)
    write_status(tmp_path, "widget-feature")  # status exists, but no 03-program-design.md
    gates = build_index.resolve_feature_gates(tmp_path)
    gate3 = next(g for g in gates["widget-feature"] if g["n"] == 3)
    assert "doc" not in gate3


# ---------------------------------------------------------------------
# Slice 3 — edge cases
# ---------------------------------------------------------------------


def test_discover_plan_gate_docs_no_plans_dir_returns_empty_list(tmp_path):
    init_repo(tmp_path)
    assert build_index.discover_plan_gate_docs(tmp_path) == []


def test_discover_plan_gate_docs_skips_malformed_epic_filename(tmp_path):
    init_repo(tmp_path)
    plan_dir = tmp_path / "docs" / "plans" / "widget-feature"
    plan_dir.mkdir(parents=True)
    (plan_dir / "epic-design.md").write_text("# no id segment\n")
    write_epic_design(tmp_path, "widget-feature", "E1")
    found = build_index.discover_plan_gate_docs(tmp_path)
    epic_ids = sorted(f["epic_id"] for f in found if f["kind"] == "epic")
    assert epic_ids == ["E1"]


def test_discover_plan_gate_docs_slug_with_only_slices_has_no_program_design(tmp_path):
    init_repo(tmp_path)
    plan_dir = tmp_path / "docs" / "plans" / "no-gate3"
    plan_dir.mkdir(parents=True)
    (plan_dir / "04-slices.md").write_text("| # | Epic | Slice | Ends with | Score | State |\n|---|---|---|---|---|---|\n")
    found = build_index.discover_plan_gate_docs(tmp_path)
    assert found == []
