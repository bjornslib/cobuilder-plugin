"""A plan whose epic header rows repeat one epic id is a conflict, and so is a create of a held id.

The fixture plans-real/duplicate-epic has three header rows named `duplicate-epic/E1`, the shape
seen in think-with-ai. Real-bd tests run in a scratch tracker only.
"""
from __future__ import annotations

from pathlib import Path

import pytest

import _beads_support as support
import _program_stage_support as ps

ID = "duplicate-epic/E1"


def _conflicts(plans: Path) -> tuple[list[dict[str, str]], list[str]]:
    from tracker_port.files import FilesAdapter

    adapter = FilesAdapter(plans)
    records = adapter.all_records()
    return adapter.conflicts, [r.id for r in records if r.kind in ("epic", "slice")]


def test_files_adapter_reports_the_duplicate_epic_header_as_a_conflict(tmp_path: Path) -> None:
    conflicts, ids = _conflicts(ps.plans_root(tmp_path, "duplicate-epic"))

    assert [c["plan"] for c in conflicts] == ["duplicate-epic"], f"no conflict reported; epic ids {ids}"
    assert ID in conflicts[0]["reason"], conflicts[0]["reason"]
    assert "Second header" in conflicts[0]["text"], "the text must quote the second header row"
    assert "First header" not in conflicts[0]["text"] and "Third header" not in conflicts[0]["text"]


def test_files_adapter_emits_no_epic_or_slice_of_the_conflicted_plan(tmp_path: Path) -> None:
    _, ids = _conflicts(ps.plans_root(tmp_path, "duplicate-epic"))

    assert ids == [], f"the conflicted plan still emits {ids}"


def test_a_clean_plan_beside_the_duplicate_plan_still_loads(tmp_path: Path) -> None:
    conflicts, ids = _conflicts(ps.plans_root(tmp_path, "duplicate-epic", "score-attempt"))

    assert [c["plan"] for c in conflicts] == ["duplicate-epic"]
    assert ids and all(i.startswith("score-attempt/") for i in ids), ids


@pytest.mark.parametrize("dry_run", [True, False], ids=["dry-run", "real"])
def test_fake_seed_skips_the_duplicate_plan_and_surfaces_the_conflict(tmp_path: Path, dry_run: bool) -> None:
    adapter = ps.fake(tmp_path)
    creates = adapter.seed_from_files(ps.plans_root(tmp_path, "duplicate-epic", "score-attempt"), dry_run=dry_run)

    assert [c["plan"] for c in adapter.seed_conflicts] == ["duplicate-epic"], adapter.seed_conflicts
    assert not [r.id for r in creates if r.id.startswith("duplicate-epic")], [r.id for r in creates]
    if not dry_run:
        held = [r.id for r in adapter.list_programs() + adapter.list_epics() + adapter.list_slices()]
        assert not [i for i in held if i.startswith("duplicate-epic")], held


@pytest.mark.parametrize("dry_run", [True, False], ids=["dry-run", "real"])
def test_real_bd_seed_skips_the_duplicate_plan_and_surfaces_the_conflict(tmp_path: Path, dry_run: bool) -> None:
    adapter = ps.beads(tmp_path)
    plans = ps.plans_root(tmp_path, "duplicate-epic", "score-attempt")
    creates = adapter.seed_from_files(plans, dry_run=dry_run)

    assert [c["plan"] for c in adapter.seed_conflicts] == ["duplicate-epic"], adapter.seed_conflicts
    assert not [r.id for r in creates if r.id.startswith("duplicate-epic")], [r.id for r in creates]
    held = [r.id for r in support.all_records(adapter)]
    assert not [i for i in held if i.startswith("duplicate-epic")], held
    if dry_run:
        assert held == [], "a dry run wrote records"


def test_real_bd_create_record_refuses_an_id_that_already_exists(tmp_path: Path) -> None:
    from tracker_port.port import ArgumentError

    adapter = ps.beads(tmp_path)
    adapter.create_record(ps.program("prog", "approved"))
    adapter.create_record(ps.epic("prog/E1", "prog"))
    before = [r.id for r in support.all_records(adapter)]
    creates_before = adapter.runner.count("create")

    for record in (ps.epic("prog/E1", "prog"), ps.program("prog", "approved")):
        with pytest.raises(ArgumentError, match="already exists"):
            adapter.create_record(record)

    assert [r.id for r in support.all_records(adapter)] == before
    assert adapter.runner.count("create") == creates_before, "a refused create must send no bd create"


def test_replayed_create_record_refuses_an_id_that_already_exists() -> None:
    from tracker_port.port import ArgumentError

    row = {
        "id": "t-1", "status": "open", "dependencies": [],
        "metadata": {"cb": {"v": 1, "id": "prog", "kind": "program", "envelope": {"stage": "approved"}}},
    }
    adapter, runner = support.list_adapter([row])

    with pytest.raises(ArgumentError, match="already exists"):
        adapter.create_record(ps.program("prog", "approved"))

    assert all(call[0] != "create" for call in runner.calls), runner.calls
