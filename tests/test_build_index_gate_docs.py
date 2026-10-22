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


def write_interaction_design(repo: Path, slug: str, title: str = "Interaction Design: Widget") -> Path:
    plan_dir = repo / "docs" / "plans" / slug
    plan_dir.mkdir(parents=True, exist_ok=True)
    path = plan_dir / "interaction-design.md"
    path.write_text(f"# {title}\n\n## 3.2 Component States\nsome states\n")
    return path


def test_build_index_has_program_design_and_epic_design_keys_with_no_plans_dir(tmp_path):
    init_repo(tmp_path)
    index, _, _, failures = build_index.build_index(tmp_path, tmp_path / ".cobuilder-architect" / "self")
    assert failures == []
    assert index["entities"]["program_design"] == []
    assert index["entities"]["epic_design"] == []


# ---------------------------------------------------------------------
# Slice 6 — the interaction_design entity
# ---------------------------------------------------------------------


def test_build_index_has_interaction_design_key_with_no_plans_dir(tmp_path):
    init_repo(tmp_path)
    index, _, _, failures = build_index.build_index(tmp_path, tmp_path / ".cobuilder-architect" / "self")
    assert failures == []
    assert index["entities"]["interaction_design"] == []


def test_discover_interaction_design_docs_returns_empty_list_without_a_file(tmp_path):
    init_repo(tmp_path)
    write_program_design(tmp_path, "widget-feature")
    assert build_index.discover_interaction_design_docs(tmp_path) == []


def test_discover_interaction_design_docs_projects_one_entity_per_file(tmp_path):
    init_repo(tmp_path)
    write_interaction_design(tmp_path, "widget-feature", title="Interaction Design: Widget Feature")
    write_program_design(tmp_path, "other-feature")
    write_status(tmp_path, "widget-feature")
    found = build_index.discover_interaction_design_docs(tmp_path)
    assert len(found) == 1
    record = found[0]
    assert record["feature_slug"] == "widget-feature"
    assert record["gate"] == "2b"
    assert record["title"] == "Interaction Design: Widget Feature"
    assert "## 3.2 Component States" in record["body_md"]
    assert record["source_path"] == "docs/plans/widget-feature/interaction-design.md"
    assert record["state"] == "n/a"


def test_build_index_end_to_end_projects_the_interaction_design(tmp_path):
    init_repo(tmp_path)
    write_interaction_design(tmp_path, "widget-feature")
    write_status(tmp_path, "widget-feature")
    index, _, _, failures = build_index.build_index(tmp_path, tmp_path / ".cobuilder-architect" / "self")
    assert failures == []
    assert [r["feature_slug"] for r in index["entities"]["interaction_design"]] == ["widget-feature"]


# ---------------------------------------------------------------------
# Slice 2 — real parsing
# ---------------------------------------------------------------------


def test_project_program_design_reads_title_and_body(tmp_path):
    init_repo(tmp_path)
    path = write_program_design(tmp_path, "widget-feature", title="Program Design: Widget Feature")
    text = path.read_text()
    record = build_index.project_program_design("widget-feature", path, text, tmp_path)
    assert record["id"] == "widget-feature"
    assert record["feature_slug"] == "widget-feature"
    assert record["gate"] == 3
    assert record["title"] == "Program Design: Widget Feature"
    assert "## Files" in record["body_md"]
    assert record["source_path"] == "docs/plans/widget-feature/03-program-design.md"


def test_project_epic_design_id_is_scoped_feature_slug_and_epic_id(tmp_path):
    init_repo(tmp_path)
    path = write_epic_design(tmp_path, "widget-feature", "E1")
    text = path.read_text()
    record = build_index.project_epic_design("E1", "widget-feature", path, text, tmp_path)
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
    gate3 = next(g for g in gates["widget-feature"] if g["n"] == "3")
    assert gate3.get("doc") == "widget-feature"


def test_resolve_feature_gates_gate3_doc_key_absent_when_no_md_file(tmp_path):
    init_repo(tmp_path)
    write_status(tmp_path, "widget-feature")  # status exists, but no 03-program-design.md
    gates = build_index.resolve_feature_gates(tmp_path)
    gate3 = next(g for g in gates["widget-feature"] if g["n"] == "3")
    assert "doc" not in gate3


# ---------------------------------------------------------------------
# The view line of a gate block (ADR-0032, amendment of 2026-09-28)
# ---------------------------------------------------------------------


def write_status_with_view_links(repo: Path, slug: str) -> None:
    """A status whose gate blocks carry the ``view:`` line that ADR-0032
    pins: directly under the gate line, indented two spaces. One token
    carries no ``#``, and one gate carries no view line."""
    plan_dir = repo / "docs" / "plans" / slug
    plan_dir.mkdir(parents=True, exist_ok=True)
    (plan_dir / "00-status.md").write_text(
        f"# Status: {slug}\n\n"
        "- Gate 1 — Product: APPROVED 2026-09-28\n"
        "  view: http://127.0.0.1:62583/active/viewer/index.html#/widget/build/plan/product\n"
        "- Gate 2 — Architecture: APPROVED 2026-09-28\n"
        "  view: http://example.test/gate-2\n"
        "- Gate 3 — Program Design: APPROVED 2026-09-28\n"
        "  view: #/widget/build/plan/program\n"
        "- Gate 4 — Slice plan: APPROVED 2026-09-28\n"
        "- Gate 2b — Interaction design: APPROVED 2026-09-28\n"
    )


def test_resolve_feature_gates_reads_the_view_line(tmp_path):
    init_repo(tmp_path)
    write_status_with_view_links(tmp_path, "widget-feature")
    gates = {g["n"]: g for g in build_index.resolve_feature_gates(tmp_path)["widget-feature"]}
    # The state line holds the approval text only; the link is another line.
    assert gates["1"]["state"] == "APPROVED 2026-09-28"
    assert gates["2"]["state"] == "APPROVED 2026-09-28"
    assert gates["3"]["state"] == "APPROVED 2026-09-28"
    # `view` keeps the portable route from the token's first `#`.
    assert gates["1"]["view"] == "#/widget/build/plan/product"
    # A token with no `#` is kept whole.
    assert gates["2"]["view"] == "http://example.test/gate-2"
    # A bare route token works too.
    assert gates["3"]["view"] == "#/widget/build/plan/program"
    # The machine-specific absolute URL reaches no projected field.
    for gate in gates.values():
        assert "127.0.0.1" not in str(gate)


def test_resolve_feature_gates_gate_without_a_view_line_projects_no_view_key(tmp_path):
    init_repo(tmp_path)
    write_status_with_view_links(tmp_path, "widget-feature")
    gates = {g["n"]: g for g in build_index.resolve_feature_gates(tmp_path)["widget-feature"]}
    # A gate block with no view line projects no `view` key, and Gate 2b keeps
    # its link exemption.
    assert gates["4"]["state"] == "APPROVED 2026-09-28"
    assert "view" not in gates["4"]
    assert gates["2b"]["state"] == "APPROVED 2026-09-28"
    assert "view" not in gates["2b"]


def test_resolve_feature_gates_requires_the_view_line_to_be_adjacent(tmp_path):
    init_repo(tmp_path)
    plan_dir = tmp_path / "docs" / "plans" / "widget-feature"
    plan_dir.mkdir(parents=True)
    (plan_dir / "00-status.md").write_text(
        "# Status: widget-feature\n\n"
        "- Gate 1 — Product: APPROVED 2026-09-28\n"
        "\n"
        "  view: http://127.0.0.1:62583/active/viewer/index.html#/widget/build/plan/product\n"
    )
    gates = {g["n"]: g for g in build_index.resolve_feature_gates(tmp_path)["widget-feature"]}
    # A blank line between the two ends the block, so the gate carries no link.
    assert gates["1"]["state"] == "APPROVED 2026-09-28"
    assert "view" not in gates["1"]


def test_gate_2b_state_reads_the_same_block(tmp_path):
    init_repo(tmp_path)
    plan_dir = tmp_path / "docs" / "plans" / "widget-feature"
    plan_dir.mkdir(parents=True)
    (plan_dir / "00-status.md").write_text(
        "# Status: widget-feature\n\n"
        "- Gate 2b — Interaction design: APPROVED 2026-09-28\n"
        "  view: http://127.0.0.1:62583/active/viewer/index.html#/widget/build/plan\n"
    )
    # Gate 2b is link-exempt today, but a block that carried one would still
    # project a clean state: nothing shows a 2b link, so the view half is dropped.
    assert build_index._gate_2b_state(plan_dir) == "APPROVED 2026-09-28"


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
