"""Tests for build_index.py's Gate 1 / Gate 2 plan document projection.

review-link slice 2: data/index.json carries product_doc and
architecture_doc entities, with the same fields as program_design, and the
feature gates join Gate 1 and Gate 2 to their documents.
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


def write_doc(repo: Path, slug: str, name: str, title: str) -> Path:
    plan_dir = repo / "docs" / "plans" / slug
    plan_dir.mkdir(parents=True, exist_ok=True)
    path = plan_dir / name
    path.write_text(f"# {title}\n\n## Section\nbody text\n")
    return path


def write_status(repo: Path, slug: str) -> None:
    plan_dir = repo / "docs" / "plans" / slug
    plan_dir.mkdir(parents=True, exist_ok=True)
    (plan_dir / "00-status.md").write_text(
        f"# Status: {slug}\n\n"
        "- Gate 1 — Product: APPROVED 2026-09-01\n"
        "- Gate 2 — Architecture: APPROVED 2026-09-01\n"
        "- Gate 3 — Program Design: APPROVED 2026-09-01\n"
    )


def write_all(repo: Path, slug: str = "widget") -> None:
    write_doc(repo, slug, "01-product.md", "Product: Widget")
    write_doc(repo, slug, "02-architecture.md", "Architecture: Widget")
    write_doc(repo, slug, "03-program-design.md", "Program Design: Widget")
    write_status(repo, slug)


def build(repo: Path) -> dict:
    index, _, _, failures = build_index.build_index(repo, repo / ".cobuilder-architect" / "self")
    assert failures == []
    return index


def test_no_plans_dir_gives_empty_product_and_architecture_lists(tmp_path):
    init_repo(tmp_path)
    index = build(tmp_path)
    assert index["entities"]["product_doc"] == []
    assert index["entities"]["architecture_doc"] == []


def test_plan_dir_with_no_docs_gives_empty_lists(tmp_path):
    init_repo(tmp_path)
    write_status(tmp_path, "widget")
    index = build(tmp_path)
    assert index["entities"]["product_doc"] == []
    assert index["entities"]["architecture_doc"] == []
    assert index["entities"]["program_design"] == []


def test_three_plan_docs_produce_three_entity_kinds(tmp_path):
    init_repo(tmp_path)
    write_all(tmp_path)
    ents = build(tmp_path)["entities"]
    assert len(ents["product_doc"]) == 1
    assert len(ents["architecture_doc"]) == 1
    assert len(ents["program_design"]) == 1


def test_product_doc_fields(tmp_path):
    init_repo(tmp_path)
    write_all(tmp_path)
    doc = build(tmp_path)["entities"]["product_doc"][0]
    assert doc["id"] == "widget"
    assert doc["feature_slug"] == "widget"
    assert doc["gate"] == 1
    assert doc["title"] == "Product: Widget"
    assert "## Section" in doc["body_md"]
    assert doc["source_path"] == "docs/plans/widget/01-product.md"


def test_architecture_doc_fields(tmp_path):
    init_repo(tmp_path)
    write_all(tmp_path)
    doc = build(tmp_path)["entities"]["architecture_doc"][0]
    assert doc["id"] == "widget"
    assert doc["feature_slug"] == "widget"
    assert doc["gate"] == 2
    assert doc["title"] == "Architecture: Widget"
    assert "## Section" in doc["body_md"]
    assert doc["source_path"] == "docs/plans/widget/02-architecture.md"


def test_new_kinds_carry_same_field_set_as_program_design(tmp_path):
    init_repo(tmp_path)
    write_all(tmp_path)
    ents = build(tmp_path)["entities"]
    program_keys = set(ents["program_design"][0].keys())
    assert set(ents["product_doc"][0].keys()) == program_keys
    assert set(ents["architecture_doc"][0].keys()) == program_keys


def test_only_present_docs_are_projected(tmp_path):
    init_repo(tmp_path)
    write_doc(tmp_path, "widget", "02-architecture.md", "Architecture: Widget")
    write_status(tmp_path, "widget")
    ents = build(tmp_path)["entities"]
    assert ents["product_doc"] == []
    assert [d["id"] for d in ents["architecture_doc"]] == ["widget"]


def test_docs_from_two_features_are_kept_apart(tmp_path):
    init_repo(tmp_path)
    write_all(tmp_path, "alpha")
    write_doc(tmp_path, "beta", "01-product.md", "Product: Beta")
    ents = build(tmp_path)["entities"]
    assert sorted(d["id"] for d in ents["product_doc"]) == ["alpha", "beta"]
    assert [d["id"] for d in ents["architecture_doc"]] == ["alpha"]


def _gates(repo: Path, slug: str) -> dict[str, dict]:
    gates = build_index.resolve_feature_gates(repo)[slug]
    return {g["n"]: g for g in gates}


def test_gate_joins_link_gates_1_2_3_to_their_docs(tmp_path):
    init_repo(tmp_path)
    write_all(tmp_path)
    gates = _gates(tmp_path, "widget")
    assert gates["1"].get("doc") == "widget"
    assert gates["1"].get("doc_kind") == "product"
    assert gates["2"].get("doc") == "widget"
    assert gates["2"].get("doc_kind") == "architecture"
    assert gates["3"].get("doc") == "widget"
    assert gates["3"].get("doc_kind") == "program"


def test_gate_join_absent_when_doc_absent(tmp_path):
    init_repo(tmp_path)
    write_status(tmp_path, "widget")
    gates = _gates(tmp_path, "widget")
    assert "doc" not in gates["1"]
    assert "doc" not in gates["2"]
