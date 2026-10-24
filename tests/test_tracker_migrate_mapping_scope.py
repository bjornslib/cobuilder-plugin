"""Slice 29 (E7-7): what `migrate_mapping` leaves alone, and what it does without `--plans-dir`. BdSim plays bd.

A native tracker gives no change. A foreign row gets no label, no retype, and no edge change, and a foreign row of
the type `program` keeps that custom type. `types.custom` loses `program` and keeps the other entries. Without
`--plans-dir` only the slice titles change, the chain edges that the rows lack are reported in `missing`, and the
texts stay unset.

Run with: uv run pytest tests/test_tracker_migrate_mapping_scope.py -q
"""
from __future__ import annotations

from collections import Counter

import _migrate_support as s
from _migrate_sim import syncs, writes


def test_a_native_tracker_gives_no_change_and_makes_no_write_and_no_sync_with_and_without_plans_dir() -> None:
    for plans in (s.PLANS, None):
        sim = s.native_sim()
        before = sim.state()

        report = s.run_on(sim, plans_dir=plans)

        assert (report["changed"], report["changes"], report["missing"]) == (0, [], [])
        assert writes(sim.calls) == [] and syncs(sim.calls) == 0 and sim.state() == before


def test_foreign_rows_get_no_label_no_retype_and_no_edge_change_and_a_foreign_program_keeps_the_custom_type() -> None:
    sim = s.legacy_sim(foreign_program=True)
    foreign = [row for row in sim.rows if row["id"] in (s.FOREIGN, s.FOREIGN_PROGRAM)]
    held = [dict(row) for row in foreign]

    report = s.run_on(sim, plans_dir=s.PLANS)

    assert [row for row in sim.rows if row["id"] in (s.FOREIGN, s.FOREIGN_PROGRAM)] == held
    assert not any(s.FOREIGN in call or s.FOREIGN_PROGRAM in call for call in writes(sim.calls))
    assert sim.types == ["program", "other"] and not any(call[0] == "config" for call in sim.calls if call[:2] != ["config", "get"])
    assert ("types.custom", "config") not in s.pairs(report)
    assert s.pairs(report) == s.FULL - Counter({("types.custom", "config"): 1})


def test_types_custom_keeps_the_other_entries_drops_a_lone_program_and_is_left_alone_without_program() -> None:
    for held, after, expected in ((["program", "other"], ["other"], 1), (["program"], [], 1), (["other"], ["other"], 0)):
        sim = s.legacy_sim()
        sim.types = list(held)

        report = s.run_on(sim, plans_dir=s.PLANS)

        assert sim.types == after, held
        assert s.pairs(report)[("types.custom", "config")] == expected


def test_without_plans_dir_only_the_slice_titles_change_and_the_missing_chains_are_reported_not_added() -> None:
    sim = s.legacy_sim()

    report = s.run_on(sim)

    assert s.pairs(report) == s.NO_PLANS
    assert {entry["id"] for entry in report["missing"]} == s.MISSING and all(entry["detail"] for entry in report["missing"])
    assert report["changed"] == len(report["changes"]) and not any(entry["id"] in s.MISSING and entry["change"] == "chain" for entry in report["changes"])
    assert s.normal(sim.rows) == s.normal(s.without_plans(s.make_rows(False)))
    assert not any(s.flags_of(call) & {"--description", "--acceptance", "--design"} for call in writes(sim.calls))
    assert not any(call[:2] == ["dep", "add"] and "tracks" not in call for call in sim.applied)


def test_the_second_run_without_plans_dir_changes_nothing_and_keeps_reporting_the_missing_chains() -> None:
    sim = s.legacy_sim()
    s.run_on(sim)
    sim.reset_log()

    again = s.run_on(sim)

    assert (again["changed"], again["changes"]) == (0, [])
    assert {entry["id"] for entry in again["missing"]} == s.MISSING
    assert writes(sim.calls) == [] and syncs(sim.calls) == 0


def test_a_run_with_plans_dir_after_a_run_without_adds_the_chains_and_the_texts_only() -> None:
    sim = s.legacy_sim()
    s.run_on(sim)
    sim.reset_log()

    report = s.run_on(sim, plans_dir=s.PLANS)

    assert s.pairs(report) == Counter({k: n for k, n in s.FULL.items() if k[1] in ("text", "chain") or k in {("mapped", "title"), ("mapped/E1", "title"), ("mapped/E2", "title")}})
    assert syncs(sim.calls) == 1 and s.normal(sim.rows) == s.normal(s.make_rows(False))
