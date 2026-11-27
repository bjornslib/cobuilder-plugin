"""Slice 29 (E7-7): `migrate_mapping` on a legacy tracker, played by BdSim (tests/_migrate_sim.py).

The tracker is the program `mapped` in the OLD mapping: a `program` row, a task for the pull request pr-101 that
blocks both epics, two gh:pr gates, no chain edges, a deferred epic, a foreign task, and `types.custom` = `program,other`.
These tests pin the report, the dry run, the call order, the one sync, and the second run. The scope (native tracker,
foreign rows, `types.custom`, no `--plans-dir`) is in test_tracker_migrate_mapping_scope.py, the interrupted run in
test_tracker_migrate_mapping_resume.py, and the real bd in test_tracker_migrate_mapping_real.py.

Run with: uv run pytest tests/test_tracker_migrate_mapping.py -q
"""
from __future__ import annotations

from collections import Counter
from typing import Callable

import _beads_mapping_support as m
import _migrate_support as s
from _migrate_sim import is_read, syncs, writes

PR, E1, E2 = s.BD["pr-101"], s.BD["mapped/E1"], s.BD["mapped/E2"]


def _index(calls: list[list[str]], matches: Callable[[list[str]], bool]) -> int:
    found = [i for i, call in enumerate(calls) if matches(call)]
    assert found, f"no call matches in {calls}"
    return found[0]


def test_a_full_migration_reports_each_change_once_for_its_row() -> None:
    report = s.run_on(s.legacy_sim(), plans_dir=s.PLANS)

    assert s.pairs(report) == s.FULL
    assert report["changed"] == len(report["changes"]) == sum(s.FULL.values())
    assert report["counts"] == dict(Counter(entry["change"] for entry in report["changes"]))
    assert (report["dry_run"], report["missing"]) == (False, [])
    assert all(isinstance(entry["detail"], str) and entry["detail"] for entry in report["changes"])


def test_a_dry_run_lists_the_changes_of_the_run_and_makes_no_write_and_no_sync() -> None:
    sim = s.legacy_sim()
    before = sim.state()

    dry = s.run_on(sim, dry_run=True, plans_dir=s.PLANS)

    assert dry["dry_run"] is True and s.pairs(dry) == s.FULL
    assert writes(sim.calls) == [] and syncs(sim.calls) == 0 and sim.applied == []
    assert sim.state() == before
    assert sim.calls[0] == ["list", "--json", "--all"] and all(is_read(call) for call in sim.calls)
    assert s.pairs(s.run_on(s.legacy_sim(), plans_dir=s.PLANS)) == s.pairs(dry), "the dry run is the plan of the run"


def test_the_tracker_reads_legacy_before_and_native_after_and_stays_legacy_after_a_dry_run() -> None:
    sim = s.legacy_sim()
    adapter = s.adapter_over(sim)

    s.migrate(adapter, dry_run=True, plans_dir=s.PLANS)
    assert m.doctor_mapping(adapter) == "legacy"
    s.migrate(adapter, plans_dir=s.PLANS)

    assert m.doctor_mapping(adapter) == "native"
    assert m.legacy_reasons(sim.rows) == []


def test_the_run_leaves_exactly_the_native_rows() -> None:
    sim = s.legacy_sim()

    s.run_on(sim, plans_dir=s.PLANS)

    assert s.normal(sim.rows) == s.normal(s.make_rows(False))
    assert sim.types == ["other"], "program leaves types.custom, and the other entry stays"
    assert set(sim.gates.values()) == {"closed"}
    assert s.normal([r for r in sim.rows if r["id"] == PR])[0]["metadata"]["cb"]["envelope"] == {}, "the PR envelope drops its gates"


def test_one_list_read_comes_first_and_one_sync_comes_last() -> None:
    sim = s.legacy_sim()

    s.run_on(sim, plans_dir=s.PLANS)

    assert sim.calls[0] == ["list", "--json", "--all"]
    assert sim.calls[-1] == ["sync"] and syncs(sim.calls) == 1
    assert len(writes(sim.calls)) > 10


def test_a_tracks_edge_goes_in_before_the_blocks_edge_goes_out_and_a_gate_resolves_before_its_edge_goes() -> None:
    sim = s.legacy_sim()

    s.run_on(sim, plans_dir=s.PLANS)

    for epic in (E1, E2):
        assert _index(sim.calls, lambda c: c == ["dep", "add", PR, epic, "--type", "tracks"]) < _index(sim.calls, lambda c: c == ["dep", "rm", epic, PR])
    for gate, epic in zip(s.GATES, (E1, E2)):
        assert _index(sim.calls, lambda c: c == ["gate", "resolve", gate]) < _index(sim.calls, lambda c: c == ["dep", "rm", epic, gate])


def test_the_types_of_the_program_and_the_pull_request_change_before_types_custom_loses_program() -> None:
    sim = s.legacy_sim()

    s.run_on(sim, plans_dir=s.PLANS)

    retypes = [i for i, c in enumerate(sim.applied) if c[0] == "update" and "--type" in c]
    config = _index(sim.applied, lambda c: c[0] == "config")
    assert sorted(sim.applied[i][sim.applied[i].index("--type") + 1] for i in retypes) == ["feature", "milestone"]
    assert max(retypes) < config


def test_each_write_sets_only_the_fields_that_differ() -> None:
    sim = s.legacy_sim()

    s.run_on(sim, plans_dir=s.PLANS)

    flags: dict[str, set[str]] = {}
    for call in writes(sim.calls):
        if call[0] == "update":
            flags.setdefault(call[1], set()).update(s.flags_of(call))
    assert flags[s.BD["mapped/1"]] == {"--add-label", "--title", "--acceptance"}, "the slice holds its ref, so no ref flag"
    assert flags[s.BD["mapped/3"]] == {"--external-ref", "--title", "--acceptance"}, "the slice holds its label, so no label flag"
    assert flags[PR] == {"--type", "--add-label", "--external-ref", "--metadata"}
    assert flags[E2] == {"--add-label", "--external-ref", "--title", "--defer"}
    assert flags[s.BD["mapped"]] == {"--type", "--add-label", "--external-ref", "--title", "--description", "--acceptance", "--design"}


def test_the_epic_with_a_future_deferred_date_gets_that_date_and_a_past_date_gets_none() -> None:
    future = s.legacy_sim()
    s.run_on(future, plans_dir=s.PLANS)
    past = s.legacy_sim(deferred="2020-01-01")
    report = s.run_on(past, plans_dir=s.PLANS)

    assert [call for call in future.applied if "--defer" in call and call[1] == E2] and next(r for r in future.rows if r["id"] == E2)["defer_until"] == s.DEFERRED
    assert not any("--defer" in call or call[0] == "defer" for call in past.applied)
    assert ("mapped/E2", "defer") not in s.pairs(report)


def test_a_second_run_returns_no_change_and_makes_no_write_and_no_sync() -> None:
    sim = s.legacy_sim()
    s.run_on(sim, plans_dir=s.PLANS)
    done = sim.state()
    sim.reset_log()

    again = s.run_on(sim, plans_dir=s.PLANS)

    assert (again["changed"], again["changes"], again["counts"], again["missing"]) == (0, [], {}, [])
    assert writes(sim.calls) == [] and syncs(sim.calls) == 0 and sim.state() == done
    assert s.run_on(sim, dry_run=True, plans_dir=s.PLANS)["changed"] == 0
