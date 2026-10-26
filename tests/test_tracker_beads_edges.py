"""Slices 25 and 26 (E7-3, E7-4): the epic and slice chains, a seed that writes both, and the pull request `tracks` edges.

The records come from the files adapter on tests/fixtures/tracker/plans-edges. The seed runs through
`EdgeRunner`, which plays bd over rows that keep their parent and dependencies. No bd is needed.
The shape of the calls matches the real run in transcripts/edges_seed_pair.json.

Run with: uv run pytest tests/test_tracker_beads_edges.py -q
"""
from __future__ import annotations

import shutil
from pathlib import Path

import pytest

import _beads_edges_support as e
import _beads_pr_support as pr
import _beads_mapping_support as m
import _beads_support as support

# The blocked_by of each record. The plan `chain` has three epics, and the slices follow the table.
CHAIN_BLOCKED_BY = {
    "chain/E1": (), "chain/E2": ("chain/E1",), "chain/E3": ("chain/E2",),
    "chain/1": (), "chain/2": ("chain/1",), "chain/3": (), "chain/4": (), "chain/5": ("chain/4",),
}
CHAIN_PARENT = {
    "chain/E1": "chain", "chain/E2": "chain", "chain/E3": "chain",
    "chain/1": "chain/E1", "chain/2": "chain/E1", "chain/3": "chain/E2", "chain/4": "chain/E3", "chain/5": "chain/E3",
}
CHAIN_EDGES = [("chain/E2", "chain/E1"), ("chain/E3", "chain/E2"), ("chain/2", "chain/1"), ("chain/5", "chain/4")]


@pytest.mark.parametrize("cb_id", CHAIN_BLOCKED_BY)
def test_the_files_adapter_chains_epics_and_slices_and_leaves_the_first_of_each_free(cb_id: str) -> None:
    record = e.files_records(e.CHAIN)[cb_id]

    assert record.blocked_by == CHAIN_BLOCKED_BY[cb_id]
    assert record.parent == CHAIN_PARENT[cb_id]


def test_the_program_has_no_parent_and_no_blocker() -> None:
    program = e.files_records(e.CHAIN)["chain"]

    assert (program.kind, program.parent, program.blocked_by) == ("program", None, ())


def test_an_epic_chain_follows_the_header_order_of_the_slice_table_and_not_the_epic_number() -> None:
    records = e.files_records(e.CHAIN)

    assert records["reversed/E2"].blocked_by == ()
    assert records["reversed/E1"].blocked_by == ("reversed/E2",)


def test_a_design_with_no_plan_chains_its_epics_in_the_order_of_goal_json() -> None:
    records = e.files_records(e.CHAIN)

    assert [records[f"goaled/E{n}"].blocked_by for n in (1, 2, 3)] == [(), ("goaled/E1",), ("goaled/E2",)]
    assert records["goaled/E1"].lifecycle == "closed", "a closed epic still heads the chain"


def test_a_design_epic_with_no_state_is_skipped_and_the_next_epic_waits_for_the_one_before_it_that_exists() -> None:
    records = e.files_records(e.CHAIN)

    assert "gappy/E2" not in records
    assert records["gappy/E1"].blocked_by == ()
    assert records["gappy/E3"].blocked_by == ("gappy/E1",), "a blocker must be a record that the seed creates"


def test_a_plan_with_one_epic_has_no_epic_edge() -> None:
    from tracker_port.files import FilesAdapter

    one = [r for r in FilesAdapter(e.PAIR).all_records() if r.id == "pair/E1"]

    assert one[0].blocked_by == ()


def test_the_seed_sends_one_dep_add_for_each_edge_and_none_for_the_first_epic() -> None:
    runner = e.seed(e.CHAIN)

    chain_adds = [t for t in runner.trace() if t[0] == "dep" and t[1].startswith("chain/")]
    assert sorted(chain_adds) == sorted(("dep", later, earlier) for later, earlier in CHAIN_EDGES)
    assert all(t[1] != "chain/E1" for t in chain_adds)
    assert len(set(runner.trace())) == len(runner.trace()), "no edge is sent twice"


def test_a_dep_add_is_a_plain_blocks_edge_with_the_later_issue_first() -> None:
    runner = e.seed(e.PAIR)

    ids = {row["metadata"]["cb"]["id"]: row["id"] for row in runner.rows}
    assert runner.dep_adds() == [["dep", "add", ids["pair/E2"], ids["pair/E1"]], ["dep", "add", ids["pair/2"], ids["pair/1"]]]


def test_each_dep_add_follows_the_create_of_both_of_its_issues() -> None:
    trace = e.seed(e.CHAIN).trace()

    created: set[str] = set()
    for step in trace:
        if step[0] == "create":
            created.add(step[1])
        else:
            assert {step[1], step[2]} <= created, f"{step} names an issue that bd does not hold yet"


def test_the_seed_calls_match_the_recorded_seed_of_the_pair_plan() -> None:
    assert e.seed(e.PAIR).trace() == e.transcript_trace("edges_seed_pair")


def test_the_recorded_dep_adds_carry_no_type_flag_so_bd_reads_them_as_blocks() -> None:
    adds = [s["args"] for s in support.steps("edges_seed_pair") if s["args"][:2] == ["dep", "add"]]

    assert len(adds) == 2 and all(len(args) == 4 for args in adds), adds


def test_the_seed_sets_the_parent_flag_of_each_record_to_its_epic_or_program() -> None:
    runner = e.seed(e.CHAIN)
    ids = {row["metadata"]["cb"]["id"]: row["id"] for row in runner.rows}
    creates = runner.creates()

    assert "--parent" not in creates["chain"]
    for cb_id, parent in CHAIN_PARENT.items():
        assert m.flag_value(creates[cb_id], "--parent") == ids[parent], cb_id


def test_a_seed_ends_with_one_sync() -> None:
    runner = e.seed(e.CHAIN)

    assert runner.verbs("sync") == 1
    assert runner.calls[-1][0] == "sync"


def test_a_second_seed_sends_no_create_no_dep_add_and_no_sync() -> None:
    runner = e.seed(e.CHAIN)
    before = len(runner.calls)

    e.seed(e.CHAIN, runner)

    assert [call[0] for call in runner.calls[before:]] == ["list"], runner.calls[before:]


def test_a_seed_that_adds_one_epic_sends_one_dep_add_for_that_epic_only(tmp_path: Path) -> None:
    short = tmp_path / "plans"
    shutil.copytree(e.PAIR, short)
    slices, status = short / "pair" / "04-slices.md", short / "pair" / "00-status.md"
    slices.write_text("\n".join(slices.read_text().splitlines()[:-2]) + "\n")
    status.write_text("\n".join(line for line in status.read_text().splitlines() if "Slice 3" not in line) + "\n")
    runner = e.seed(short)
    assert [t for t in runner.trace() if t[0] == "dep"] == [("dep", "pair/2", "pair/1")]
    before = len(runner.calls)

    e.seed(e.PAIR, runner)

    adds = [t for t in runner.trace() if t[0] == "dep"]
    assert adds == [("dep", "pair/2", "pair/1"), ("dep", "pair/E2", "pair/E1")], adds
    assert [c[0] for c in runner.calls[before:]].count("sync") == 1


def test_the_edges_read_back_as_blocked_by_on_the_records() -> None:
    from tracker_port.beads import BeadsAdapter

    runner = e.seed(e.CHAIN)
    records = m.records_by_id(BeadsAdapter(runner))

    for cb_id, blockers in CHAIN_BLOCKED_BY.items():
        assert records[cb_id].blocked_by == blockers, cb_id
        assert records[cb_id].parent == CHAIN_PARENT[cb_id], cb_id


# --- E7-4: the pull request is a milestone that tracks each epic and blocks none (real bd run in the transcripts) ---
def test_open_pull_request_sends_one_milestone_create_then_one_tracks_dep_add_for_each_epic() -> None:
    runner, _ = pr.open_replay()

    create = runner.calls[1]
    assert (m.flag_value(create, "--type"), m.flag_value(create, "--labels")) == ("milestone", "cb")
    assert (m.flag_value(create, "--external-ref"), m.flag_value(create, "--title")) == ("gh-101", "pr-101")
    assert runner.calls[2:4] == [["dep", "add", pr.PR_BD_ID, pr.EPIC_BD_ID[epic], "--type", "tracks"] for epic in pr.EPICS]
    assert pr.verbs(runner) == ["list", "create", "dep", "dep", "sync"], "no gate call and no metadata write"


def test_open_pull_request_adds_no_blocks_edge_and_no_edge_that_leaves_an_epic() -> None:
    runner, _ = pr.open_replay()

    adds = [call for call in runner.calls if call[:2] == ["dep", "add"]]
    assert len(adds) == 2 and all(call[2] == pr.PR_BD_ID and call[-2:] == ["--type", "tracks"] for call in adds), adds
    assert not [call for call in runner.calls if "blocks" in call or "gate" in call]


def test_open_pull_request_gives_a_record_that_tracks_both_epics_and_blocks_nothing() -> None:
    _, record = pr.open_replay()

    assert (record.id, record.kind, record.lifecycle, record.external_ref) == ("pr-101", "pr", "open", "gh-101")
    assert (record.blocked_by, record.tracks, dict(record.envelope)) == ((), ("demo-E1", "demo-E2"), {})


def test_a_merge_makes_one_update_to_closed_and_one_sync_and_no_dep_or_gate_call() -> None:
    runner, record = pr.merge_replay(merged=True)

    assert runner.calls == [["list", "--json", "--all"], ["update", pr.PR_BD_ID, "--status", "closed"], ["sync"]]
    assert (record.lifecycle, record.tracks) == ("closed", ("demo-E1", "demo-E2"))
