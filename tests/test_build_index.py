"""Tests for scripts/build_index.py: the ADR-0018 record index builder.

Run with: uv run --with pytest pytest tests/ -v
"""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

import pytest
import yaml

SHARED_DIR = Path(__file__).resolve().parent.parent / "shared"
sys.path.insert(0, str(SHARED_DIR))

import build_index  # noqa: E402


def init_repo(repo: Path) -> None:
    subprocess.run(["git", "init", "-q"], cwd=repo, check=True)
    subprocess.run(["git", "config", "user.email", "test@example.com"], cwd=repo, check=True)
    subprocess.run(["git", "config", "user.name", "Test"], cwd=repo, check=True)
    (repo / "README.md").write_text("placeholder\n")
    subprocess.run(["git", "add", "."], cwd=repo, check=True)
    subprocess.run(["git", "commit", "-q", "-m", "init"], cwd=repo, check=True)


def write_adr(
    repo: Path,
    adr_id: str,
    name: str,
    state: str = "approved",
    source_pr: int | None = None,
    district: str | None = None,
    related: list[str] | None = None,
) -> None:
    adr_dir = repo / "docs" / "architecture" / "adr"
    adr_dir.mkdir(parents=True, exist_ok=True)
    maps_to_lines = ["maps_to:", "  context: test-context"]
    if district:
        maps_to_lines = ["maps_to:", f"  district: {district}", "  unanchored: true"]
    maps_to_lines += ["  modules: [scripts/test.py]", '  rule: "A rule."']
    source_pr_line = f"source_pr: {source_pr}\n" if source_pr is not None else ""
    related_block = ""
    if related:
        related_block = "related:\n" + "\n".join(f'  - "{r}"' for r in related) + "\n"
    text = f"""---
title: "{adr_id} — {name}"
status: active
type: architecture
last_verified: 2026-08-20
owner: test
id: {adr_id}
name: "{name}"
state: {state}
groups: [test]
approved_by: "test"
{source_pr_line}problem: "A problem."
decision: "A decision."
alternatives:
  - option: "An option"
    rejected_because: "A reason."
forces:
  - "A force."
history:
  - {{ state: tentative, date: 2026-08-20 }}
  - {{ state: decided, date: 2026-08-20 }}
  - {{ state: approved, date: 2026-08-20 }}
{chr(10).join(maps_to_lines)}
{related_block}delivers:
  capability: "A capability."
  benefit: "A benefit."
  beneficiary: [operator]
---

# {adr_id} — {name}

## Context

Some context.
"""
    (adr_dir / f"{adr_id}-{name.lower().replace(' ', '-')}.md").write_text(text)


def write_design(
    repo: Path, design_id: str, epic_ids: list[str], branches: dict[str, str] | None = None,
    adrs: list[str] | None = None, notes: dict[str, str] | None = None,
) -> None:
    design_dir = repo / "docs" / "architecture" / "designs" / design_id
    design_dir.mkdir(parents=True, exist_ok=True)
    branches = branches or {}
    notes = notes or {}
    goal = {
        "name": design_id,
        "outcome": "An outcome.",
        "epics": [
            {"id": e, "branch": branches.get(e), "state": "pending", "note": notes.get(e, "")}
            for e in epic_ids
        ],
    }
    if adrs:
        goal["adrs"] = adrs
    (design_dir / "goal.json").write_text(json.dumps(goal))


def write_context(repo: Path, context_id: str, verifies: list[str] | None = None) -> None:
    context_dir = repo / "docs" / "architecture" / "contexts" / context_id
    context_dir.mkdir(parents=True, exist_ok=True)
    boundary = {
        "id": context_id,
        "name": "A context",
        "path": ".",
        "forbidden_dependencies": [{"target": "x", "why": "y"}],
        "modules": [{"id": "m1", "rule": "a rule"}, {"id": "m2", "rule": "another rule"}],
        "context_map": [{"with": "other", "pattern": "open-host-service"}],
    }
    if verifies is not None:
        boundary["verifies"] = verifies
    (context_dir / "boundary.yaml").write_text(yaml.safe_dump(boundary))


def write_slices_md(repo: Path, feature: str, rows: list[str]) -> None:
    """``rows`` is a list of raw markdown table lines, already grouped
    epic-first the way ``04-slices.md`` groups its real table."""
    plans_dir = repo / "docs" / "plans" / feature
    plans_dir.mkdir(parents=True, exist_ok=True)
    header = "| # | Epic | Slice | Ends with |\n|---|---|---|---|\n"
    (plans_dir / "04-slices.md").write_text(header + "\n".join(rows) + "\n")


def make_bundle(bundle_dir: Path) -> None:
    bundle_dir.mkdir(parents=True, exist_ok=True)
    (bundle_dir / "inventory.yaml").write_text(
        yaml.safe_dump({"contexts": [{"id": "skills", "label": "Skills", "paths": ["skills"]}]})
    )
    data_dir = bundle_dir / "data"
    data_dir.mkdir(parents=True, exist_ok=True)
    story = {
        "meta": {"schema_version": "1.3"},
        "world": {"districts": []},
        "timeline": [{"pr": 1, "title": "First PR", "status": "merged", "commit": "abc123"}],
    }
    (data_dir / "story.json").write_text(json.dumps(story))


@pytest.fixture
def repo(tmp_path):
    init_repo(tmp_path)
    return tmp_path


@pytest.fixture
def bundle_dir(repo):
    b = repo / ".cobuilder-architect" / "self"
    make_bundle(b)
    return b


# --- C1: every entity type appears with a matching count ---


def test_every_entity_type_appears_with_correct_count(repo, bundle_dir):
    write_adr(repo, "ADR-0001", "First Decision")
    write_adr(repo, "ADR-0002", "Second Decision")
    write_design(repo, "design-a", ["E1", "E2"])
    write_context(repo, "ctx-a")

    index, adrs_viewer, designs_viewer, failures = build_index.build_index(repo, bundle_dir)
    assert failures == []

    entities = index["entities"]
    assert len(entities["adr"]) == 2
    assert len(entities["design"]) == 1
    assert len(entities["epic"]) == 2
    assert len(entities["context"]) == 1
    assert len(entities["boundary_rule"]) == 4  # 1 forbidden + 2 modules + 1 context_map
    assert len(entities["district"]) == 1
    assert len(entities["pull_request"]) == 1
    assert len(entities["publication"]) == 0


# --- C2: an epic id is scoped to its design; two E1s must not collide ---


def test_epic_id_scoped_to_design_no_collision(repo, bundle_dir):
    write_design(repo, "design-a", ["E1"])
    write_design(repo, "design-b", ["E1"])

    index, _, _, failures = build_index.build_index(repo, bundle_dir)
    assert failures == []

    epic_ids = [e["id"] for e in index["entities"]["epic"]]
    assert len(epic_ids) == 2
    assert len(set(epic_ids)) == 2
    assert "design-a/E1" in epic_ids
    assert "design-b/E1" in epic_ids


# --- C3: the build is a full rebuild ---


def test_deleting_a_source_document_removes_it_on_rebuild(repo, bundle_dir):
    write_adr(repo, "ADR-0001", "First Decision")
    write_adr(repo, "ADR-0002", "Second Decision")

    index, _, _, failures = build_index.build_index(repo, bundle_dir)
    assert failures == []
    assert len(index["entities"]["adr"]) == 2

    for path in (repo / "docs" / "architecture" / "adr").glob("ADR-0002-*.md"):
        path.unlink()

    index2, _, _, failures2 = build_index.build_index(repo, bundle_dir)
    assert failures2 == []
    ids = [a["id"] for a in index2["entities"]["adr"]]
    assert ids == ["ADR-0001"]


# --- C6: nothing is written into the authored tree ---


def test_writes_nothing_into_docs(repo, bundle_dir, monkeypatch):
    write_adr(repo, "ADR-0001", "First Decision")
    write_design(repo, "design-a", ["E1"])
    write_context(repo, "ctx-a")

    docs_dir = repo / "docs"
    before = {
        p: p.stat().st_mtime for p in docs_dir.rglob("*") if p.is_file()
    }
    before_count = sum(1 for _ in docs_dir.rglob("*") if _.is_file())

    monkeypatch.setattr(sys, "argv", ["build_index.py", "--repo", str(repo), "--bundle-dir", str(bundle_dir)])
    build_index.main()

    after_count = sum(1 for _ in docs_dir.rglob("*") if _.is_file())
    after = {p: p.stat().st_mtime for p in docs_dir.rglob("*") if p.is_file()}
    assert before_count == after_count
    assert before == after


# --- the compatibility gate runs before the first write ---


def test_calls_compatibility_gate_before_first_write(repo, bundle_dir, monkeypatch):
    from _bundle_meta import BundleIncompatible

    def fake_require_compatible(bundle, plugin):
        raise BundleIncompatible("refused for the test")

    monkeypatch.setattr(build_index, "require_compatible", fake_require_compatible)

    write_adr(repo, "ADR-0001", "First Decision")
    index_json = bundle_dir / "data" / "index.json"
    assert not index_json.exists()

    monkeypatch.setattr(sys, "argv", ["build_index.py", "--repo", str(repo), "--bundle-dir", str(bundle_dir)])
    with pytest.raises(BundleIncompatible):
        build_index.main()

    # The gate ran before any write: index.json still does not exist.
    assert not index_json.exists()


def test_gate_source_scan():
    """A crude source scan matching test_gate_hardening.py's convention."""
    source = (SHARED_DIR / "build_index.py").read_text()
    assert "require_compatible(" in source
    assert "stamp_generator(" in source


# --------------------------------------------------------------------------
# Slice 9: joins, and freshness. See ADR-0018 and 03-program-design.md.
# --------------------------------------------------------------------------


def make_bundle_with_districts(bundle_dir: Path, district_ids: list[str]) -> None:
    bundle_dir.mkdir(parents=True, exist_ok=True)
    (bundle_dir / "inventory.yaml").write_text(
        yaml.safe_dump({"contexts": [{"id": d, "label": d, "paths": [d]} for d in district_ids]})
    )
    data_dir = bundle_dir / "data"
    data_dir.mkdir(parents=True, exist_ok=True)
    (data_dir / "story.json").write_text(
        json.dumps({"meta": {"schema_version": "1.3"}, "world": {"districts": []}, "timeline": []})
    )


# --- C1: an ADR reaches its pull request by both the direct and the epic path ---


def test_adr_reaches_pull_request_direct_path(repo, bundle_dir):
    write_adr(repo, "ADR-0001", "First Decision", source_pr=42)

    index, _, _, failures = build_index.build_index(repo, bundle_dir)
    assert failures == []

    join = index["joins"]["adr_to_pull_request"]["ADR-0001"]
    assert join == {"pr": 42, "via": "direct", "path": []}


def test_adr_reaches_pull_request_through_design_and_epic(repo, bundle_dir, monkeypatch):
    write_adr(repo, "ADR-0002", "Second Decision")
    write_design(
        repo, "design-a", ["E1"], branches={"E1": "feature/e1"}, adrs=["ADR-0002"]
    )

    def fake_gh_lookup(branch, warnings, gh_state):
        assert branch == "feature/e1"
        return 99

    monkeypatch.setattr(build_index, "gh_pr_for_branch", fake_gh_lookup)

    index, _, _, failures = build_index.build_index(repo, bundle_dir)
    assert failures == []

    join = index["joins"]["adr_to_pull_request"]["ADR-0002"]
    assert join["pr"] == 99
    assert join["via"] == "epic"
    assert join["path"] == ["design-a/E1"]


def test_adr_with_no_reachable_design_is_unresolved_not_guessed(repo, bundle_dir):
    write_adr(repo, "ADR-0003", "Unreachable Decision")

    index, _, _, failures = build_index.build_index(repo, bundle_dir)
    assert failures == []

    join = index["joins"]["adr_to_pull_request"]["ADR-0003"]
    assert join == {"pr": None, "via": "none", "path": []}


# --- C2: an epic with no branch is reported unstarted, not missing or errored ---


def test_epic_with_no_branch_is_unstarted(repo, bundle_dir):
    write_design(repo, "design-b", ["E1"])  # no branches given -> branch is None

    index, _, _, failures = build_index.build_index(repo, bundle_dir)
    assert failures == []

    assert index["joins"]["epic_status"]["design-b/E1"] == "unstarted"
    assert "design-b/E1" not in index["joins"]["epic_to_pull_request"]


def test_epic_with_branch_but_no_pull_request_is_reported_not_errored(repo, bundle_dir, monkeypatch):
    write_design(repo, "design-c", ["E1"], branches={"E1": "feature/not-opened"})
    monkeypatch.setattr(build_index, "gh_pr_for_branch", lambda branch, warnings, gh_state: None)

    index, _, _, failures = build_index.build_index(repo, bundle_dir)
    assert failures == []

    assert index["joins"]["epic_status"]["design-c/E1"] == "no-pull-request"
    assert "design-c/E1" not in index["joins"]["epic_to_pull_request"]


# --- C3: a district reaches a context, and a context reaches a district ---


def test_district_and_context_resolve_both_ways(repo, bundle_dir):
    make_bundle_with_districts(bundle_dir, ["dist-a", "dist-b"])
    write_context(repo, "ctx-a", verifies=["dist-a"])

    index, _, _, failures = build_index.build_index(repo, bundle_dir)
    assert failures == []

    joins = index["joins"]
    assert joins["context_verifies_district"]["ctx-a"] == ["dist-a"]
    assert "dist-a" not in joins["district_uncovered"]
    assert "dist-b" in joins["district_uncovered"]


def test_uncovered_district_is_listed(repo, bundle_dir):
    make_bundle_with_districts(bundle_dir, ["dist-only"])

    index, _, _, failures = build_index.build_index(repo, bundle_dir)
    assert failures == []

    assert index["joins"]["district_uncovered"] == ["dist-only"]


# --- C4: every slice declares an epic that exists ---


def test_every_slice_declares_an_existing_epic(repo, bundle_dir):
    write_design(
        repo,
        "plugin-split",
        ["E1", "E2"],
        notes={"E1": "One plugin becomes five renames", "E2": "Shared code survives an install"},
    )
    write_slices_md(
        repo,
        "cobuilder-family",
        [
            "| | **`plugin-split/E1` — One plugin becomes five renames.** More prose here. | | |",
            "| 4 | | Renames inside today's single plugin | A working state |",
            "| 5 | | The cross-pillar references are fixed | Another working state |",
            "| | **`plugin-split/E2` — Shared code survives an install.** More prose here too. | | |",
            "| 1 | | Tracer bullet | A third working state |",
        ],
    )

    index, _, _, failures = build_index.build_index(repo, bundle_dir)
    assert failures == []

    slice_to_epic = index["joins"]["slice_to_epic"]
    epic_ids = {e["id"] for e in index["entities"]["epic"]}
    assert slice_to_epic  # not empty
    for slice_id, epic_id in slice_to_epic.items():
        assert epic_id in epic_ids, f"{slice_id} names {epic_id!r}, which is not a real epic"
    assert slice_to_epic["cobuilder-family/4"] == "plugin-split/E1"
    assert slice_to_epic["cobuilder-family/5"] == "plugin-split/E1"
    assert slice_to_epic["cobuilder-family/1"] == "plugin-split/E2"
    assert index["joins"]["slice_to_epic_unresolved"] == {}


# --- C4b: no join guesses. A bare or unknown epic header is unresolved ---


def test_a_bare_epic_header_id_is_unresolved_not_guessed(repo, bundle_dir):
    """Three designs in this repo can each declare epic ``E1``. A slice
    table header that carries the bare id, not the scoped one, must not
    resolve by guessing which design owns it. It must report unresolved."""
    write_design(repo, "plugin-split", ["E1"], notes={"E1": "One plugin becomes five renames"})
    write_design(repo, "cobuilder-implement", ["E1"], notes={"E1": "Renames inside a plugin too"})
    write_slices_md(
        repo,
        "cobuilder-family",
        [
            "| | **`E1` — One plugin becomes five renames.** More prose here. | | |",
            "| 4 | | Renames inside today's single plugin | A working state |",
        ],
    )

    index, _, _, failures = build_index.build_index(repo, bundle_dir)
    assert failures == []

    assert "cobuilder-family/4" not in index["joins"]["slice_to_epic"]
    reason = index["joins"]["slice_to_epic_unresolved"]["cobuilder-family/4"]
    assert "bare id" in reason


def test_an_epic_header_naming_an_undeclared_epic_is_unresolved(repo, bundle_dir):
    write_design(repo, "plugin-split", ["E1"], notes={"E1": "One plugin becomes five renames"})
    write_slices_md(
        repo,
        "cobuilder-family",
        [
            "| | **`plugin-split/E9` — No design declares this epic.** More prose here. | | |",
            "| 4 | | Renames inside today's single plugin | A working state |",
        ],
    )

    index, _, _, failures = build_index.build_index(repo, bundle_dir)
    assert failures == []

    assert "cobuilder-family/4" not in index["joins"]["slice_to_epic"]
    reason = index["joins"]["slice_to_epic_unresolved"]["cobuilder-family/4"]
    assert "plugin-split/E9" in reason


def test_all_fourteen_real_slices_resolve_from_the_scoped_id(repo, bundle_dir):
    """The real ``04-slices.md`` in this repo carries the scoped epic id on
    every header row. Every one of its fourteen slices must resolve by
    reading that id, with no prose comparison involved."""
    real_repo_root = Path(__file__).resolve().parent.parent
    real_slices = (real_repo_root / "docs" / "plans" / "cobuilder-family" / "04-slices.md").read_text()
    plans_dir = repo / "docs" / "plans" / "cobuilder-family"
    plans_dir.mkdir(parents=True, exist_ok=True)
    (plans_dir / "04-slices.md").write_text(real_slices)

    epic_ids = ["E1", "E2", "E3", "E4", "E5", "E6", "E7"]
    write_design(repo, "plugin-split", epic_ids, notes={e: "" for e in epic_ids})

    index, _, _, failures = build_index.build_index(repo, bundle_dir)
    assert failures == []

    slice_to_epic = index["joins"]["slice_to_epic"]
    assert len(slice_to_epic) == 14
    assert index["joins"]["slice_to_epic_unresolved"] == {}
    expected = {
        "cobuilder-family/1": "plugin-split/E2",
        "cobuilder-family/2": "plugin-split/E3",
        "cobuilder-family/3": "plugin-split/E3",
        "cobuilder-family/4": "plugin-split/E1",
        "cobuilder-family/5": "plugin-split/E1",
        "cobuilder-family/6": "plugin-split/E1",
        "cobuilder-family/7": "plugin-split/E1",
        "cobuilder-family/8": "plugin-split/E4",
        "cobuilder-family/9": "plugin-split/E4",
        "cobuilder-family/10": "plugin-split/E5",
        "cobuilder-family/11": "plugin-split/E5",
        "cobuilder-family/12": "plugin-split/E6",
        "cobuilder-family/13": "plugin-split/E6",
        "cobuilder-family/14": "plugin-split/E6",
    }
    assert slice_to_epic == expected


# --- C5: staleness is detected on both signals ---


def test_changing_an_authored_document_marks_the_index_stale(repo, bundle_dir):
    write_adr(repo, "ADR-0001", "First Decision")
    index, _, _, failures = build_index.build_index(repo, bundle_dir)
    assert failures == []
    assert build_index.is_stale(index, repo) is False

    write_adr(repo, "ADR-0002", "Second Decision")
    assert build_index.is_stale(index, repo) is True


def test_moving_the_git_head_marks_the_index_stale(repo, bundle_dir):
    write_adr(repo, "ADR-0001", "First Decision")
    index, _, _, failures = build_index.build_index(repo, bundle_dir)
    assert failures == []
    assert build_index.is_stale(index, repo) is False

    (repo / "unrelated.txt").write_text("changed\n")
    subprocess.run(["git", "add", "."], cwd=repo, check=True)
    subprocess.run(["git", "commit", "-q", "-m", "unrelated change"], cwd=repo, check=True)

    assert build_index.is_stale(index, repo) is True


# --- regression: slice 8's entities are still present, with the same ids ---


def test_slice_8_entities_still_present_alongside_joins(repo, bundle_dir):
    write_adr(repo, "ADR-0001", "First Decision")
    write_design(repo, "design-a", ["E1"])
    write_context(repo, "ctx-a")

    index, _, _, failures = build_index.build_index(repo, bundle_dir)
    assert failures == []

    assert [a["id"] for a in index["entities"]["adr"]] == ["ADR-0001"]
    assert [e["id"] for e in index["entities"]["epic"]] == ["design-a/E1"]
    assert [c["id"] for c in index["entities"]["context"]] == ["ctx-a"]
    assert "joins" in index
    assert "sources" in index
