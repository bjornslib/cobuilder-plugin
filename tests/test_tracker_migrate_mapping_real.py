"""Slice 29 (E7-7) on real bd 1.3.0: a legacy scratch tracker converts in one sync, a dry run writes nothing, a rerun does nothing.

One module fixture builds the legacy tracker (tests/_migrate_live_support.py) and runs the four phases in order: a
dry run, the migration, and a second run, with a snapshot (rows, gates, `types.custom`, `bd export`) around each. The
tests read the stored results. The tracker is the program `mapped` of tests/fixtures/tracker/plans-mapping, with the
pull request pr-101 as a task that blocks both epics, two gates, a foreign task, and no chain edge. Every call runs
in a scratch dir. The tests carry the pytest mark `slow`, and they skip without bd. Each bd call takes seconds, and
the fixture makes about a hundred, so allow 15 minutes.

Run with: uv run pytest tests/test_tracker_migrate_mapping_real.py -q -m ''
"""
from __future__ import annotations

from pathlib import Path
from types import SimpleNamespace
from typing import Any

import pytest

import _beads_edges_support as e
import _beads_mapping_seed_support as seed
import _beads_support as support
import _migrate_live_support as live
import _migrate_support as s
from _migrate_sim import syncs, writes

pytestmark = pytest.mark.slow


def _phase(root: Path, **kwargs: Any) -> tuple[Any, dict[str, Any], list[list[str]]]:
    from tracker_port.beads import BeadsAdapter

    adapter = BeadsAdapter(support.CountingRunner(live.runner_in(root)))
    report = s.migrate(adapter, plans_dir=s.PLANS, **kwargs)
    return adapter, report, list(adapter.runner.calls)


class _Outcome(SimpleNamespace):
    """The phase results. A phase that did not finish leaves its names unset, and a read of one fails on an assertion."""

    def __getattr__(self, name: str) -> Any:
        raise AssertionError(f"{name} is unset because a phase did not finish: {self.failure}")


@pytest.fixture(scope="module")
def run(tmp_path_factory: pytest.TempPathFactory) -> _Outcome:
    from tracker_port.beads import BeadsAdapter

    root = tmp_path_factory.mktemp("migrate")
    ids = live.build_legacy(root)
    out = _Outcome(ids=ids, before=live.snapshot(root), ready_before=live.ready_ids(root), root=root, failure=None)
    out.mapping_before = BeadsAdapter(live.runner_in(root)).doctor_details()["mapping"]
    try:
        _, out.dry, out.dry_calls = _phase(root, dry_run=True)
        out.after_dry = live.snapshot(root)
        out.adapter, out.report, out.calls = _phase(root)
        out.after_run = live.snapshot(root)
        out.records = support.all_records(out.adapter)
        out.mapping_after = out.adapter.doctor_details()["mapping"]
        out.ready_after = live.ready_ids(root, "--label", "cb")
        _, out.second, out.second_calls = _phase(root)
        out.after_second = live.snapshot(root)
        out.ready_second = live.ready_ids(root, "--label", "cb")
    except AssertionError as error:  # for example: the port has no migrate_mapping yet
        out.failure = str(error)
    return out


def _row(run: SimpleNamespace, snap: str, cb_id: str) -> dict[str, Any]:
    return next(row for row in getattr(run, snap)["rows"] if row["id"] == run.ids[cb_id])


def test_the_legacy_tracker_reads_legacy_and_its_ready_task_is_the_pull_request_not_a_slice(run: _Outcome) -> None:
    assert run.mapping_before == "legacy"
    assert run.ready_before == {run.ids["pr-101"], run.ids["foreign"]}, "the epics wait on the PR and on the gates, so no slice is ready"


def test_a_dry_run_lists_the_changes_and_leaves_rows_gates_types_and_the_export_equal(run: _Outcome) -> None:
    assert run.dry["dry_run"] is True and s.pairs(run.dry) == s.FULL
    assert run.after_dry == run.before
    assert writes(run.dry_calls) == [] and syncs(run.dry_calls) == 0


def test_the_migration_reports_the_same_changes_as_the_dry_run_and_makes_one_sync_last(run: _Outcome) -> None:
    assert s.pairs(run.report) == s.pairs(run.dry)
    assert run.calls[0] == ["list", "--json", "--all"]
    assert syncs(run.calls) == 1 and run.calls[-1] == ["sync"]


def test_the_types_are_feature_epic_task_and_milestone_and_the_mapping_reads_native(run: _Outcome) -> None:
    types = {cb_id: _row(run, "after_run", cb_id)["issue_type"] for cb_id in s.BD}
    assert types == {"mapped": "feature", "mapped/E1": "epic", "mapped/E2": "epic", "mapped/1": "task", "mapped/2": "task", "mapped/3": "task", "pr-101": "milestone"}
    assert run.mapping_after == "native"
    assert run.after_run["config"].strip() == "other", "program leaves types.custom and the other entry stays"


def test_ready_with_the_cb_label_gives_the_slice_frontier_of_the_projector(run: _Outcome) -> None:
    assert run.ready_after == {run.ids["mapped/1"]}
    assert {cb for cb, bd in run.ids.items() if bd in run.ready_after} == e.projector_frontier(run.records) == {"mapped/1"}


def test_the_pull_request_tracks_its_epics_and_no_blocking_edge_or_gate_is_left(run: _Outcome) -> None:
    pr = _row(run, "after_run", "pr-101")
    tracked = {dep["depends_on_id"] for dep in pr["dependencies"] if dep["type"] == "tracks"}
    blocking = {(row["id"], dep["depends_on_id"]) for row in run.after_run["rows"] for dep in row.get("dependencies", []) if dep["type"] == "blocks"}

    assert tracked == {run.ids["mapped/E1"], run.ids["mapped/E2"]}
    assert not [dep for dep in pr["dependencies"] if dep["type"] == "blocks"]
    assert blocking == {(run.ids["mapped/E2"], run.ids["mapped/E1"]), (run.ids["mapped/2"], run.ids["mapped/1"])}, "only the two chain edges block"
    assert run.after_run["gates"].strip() == "null", "no gate is open"
    assert pr["metadata"]["cb"]["envelope"] == {}


def test_each_cb_row_has_the_label_and_the_right_external_ref_and_the_names_and_texts_from_the_files(run: _Outcome) -> None:
    for cb_id in s.BD:
        row = _row(run, "after_run", cb_id)
        assert "cb" in row["labels"], cb_id
        assert row["external_ref"] == ("gh-101" if cb_id == "pr-101" else cb_id), cb_id
        title, description, acceptance, design = seed.EXPECTED.get(cb_id, ("pr-101", None, None, None))
        assert row["title"] == title and row.get("description") == description and row.get("acceptance_criteria") == acceptance, cb_id
        seed.check_design(row.get("design"), design)


def test_the_deferred_epic_hides_its_slices_and_reads_open_through_the_adapter(run: _Outcome) -> None:
    row = _row(run, "after_run", "mapped/E2")
    epic = next(record for record in run.records if record.id == "mapped/E2")

    assert row["status"] == "deferred" and row["defer_until"].startswith("2099-12-3")
    assert epic.lifecycle == "open" and epic.blocked_by == ("mapped/E1",)


def test_the_foreign_task_stays_as_it_was_in_each_phase(run: _Outcome) -> None:
    held = _row(run, "before", "foreign")

    assert _row(run, "after_dry", "foreign") == held == _row(run, "after_run", "foreign") == _row(run, "after_second", "foreign")
    assert "labels" not in held and held["issue_type"] == "task"


def test_a_second_run_changes_nothing_writes_nothing_and_makes_no_sync(run: _Outcome) -> None:
    assert (run.second["changed"], run.second["changes"], run.second["missing"]) == (0, [], [])
    assert writes(run.second_calls) == [] and syncs(run.second_calls) == 0
    assert run.after_second == run.after_run and run.ready_second == run.ready_after
