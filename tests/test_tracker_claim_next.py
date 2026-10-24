"""Slice 28 (E7-6): `claim_next(claimant, under)` on beads is one `bd ready --claim` call, and it starts the epic.

The call pattern is pinned in `_claim_next_support.py`: one list read, one claim call, at most one epic update,
and one sync. The replay runner answers the recorded bd 1.3.0 claim row. The live tests are in
`test_tracker_claim_next_real.py`, and the CLI tests are in `test_tracker_claim_next_cli.py`.

Run with: uv run pytest tests/test_tracker_claim_next.py -q
"""
from __future__ import annotations

import pytest

import _beads_ready_support as r
import _claim_next_support as c
from _beads_mapping_support import need


def test_claim_next_argv_is_one_ready_call_with_the_label_the_claim_flag_and_the_actor() -> None:
    from tracker_port import bd_runner

    argv = need(bd_runner, "claim_next_argv")

    assert argv("alice") == c.claim_argv("alice")
    assert argv("alice") == ["ready", "-t", "task", "--label", "cb", "--claim", "--actor", "alice", "--json", "--limit", "0"]


def test_claim_next_argv_puts_the_parent_after_the_actor_and_before_json() -> None:
    from tracker_port import bd_runner

    got = need(bd_runner, "claim_next_argv")("alice", "t-anc.1")

    assert got == c.claim_argv("alice", "t-anc.1")
    assert got[got.index("--actor") + 2 : got.index("--json")] == ["--parent", "t-anc.1"]


def test_an_open_epic_gives_list_claim_epic_update_and_one_sync_with_the_exact_argv() -> None:
    adapter, runner = c.adapter_over(c.rows_with_epic("open"), [c.recorded_claim_row()])

    record = need(adapter, "claim_next")("alice")

    assert list(runner.calls) == [r.LIST_ARGS, c.claim_argv("alice"), c.EPIC_TO_IN_PROGRESS, ["sync"]]
    assert (record.id, record.kind, record.parent) == ("demo-E1-s3", "slice", "demo-E1")
    assert (record.lifecycle, record.assignee) == ("in_progress", "alice")


@pytest.mark.parametrize("status", ["in_progress", "closed"])
def test_an_epic_that_is_in_progress_or_closed_gets_no_update_and_the_claim_still_syncs_once(status: str) -> None:
    adapter, runner = c.adapter_over(c.rows_with_epic(status), [c.recorded_claim_row()])

    record = need(adapter, "claim_next")("alice")

    assert list(runner.calls) == [r.LIST_ARGS, c.claim_argv("alice"), ["sync"]]
    assert record.id == "demo-E1-s3"


def test_the_claim_and_the_epic_write_go_out_in_one_publish_and_sync_off_makes_none() -> None:
    adapter, runner = c.adapter_over(c.rows_with_epic("open"), [c.recorded_claim_row()], sync="off")

    need(adapter, "claim_next")("alice")

    assert runner.verbs() == ["list", "ready", "update"]


def test_the_record_comes_from_the_list_row_with_in_progress_and_the_claimant_whatever_the_claim_row_holds() -> None:
    # A bare ready row has status open and no assignee. The adapter builds the record from the list row.
    adapter, _ = c.adapter_over(c.rows_with_epic("open"), [r.ready_row(c.S3)])

    record = need(adapter, "claim_next")("bob")

    assert (record.id, record.lifecycle, record.assignee, record.parent) == ("demo-E1-s3", "in_progress", "bob", "demo-E1")
    assert record.envelope == next(s for s in adapter.list_slices() if s.id == "demo-E1-s3").envelope


@pytest.mark.parametrize("under,parent", [("demo-E1", c.EPIC), ("demo", c.PROGRAM)])
def test_under_maps_to_the_bd_id_of_the_epic_or_program_and_the_claimed_epic_still_starts(under: str, parent: str) -> None:
    adapter, runner = c.adapter_over(c.rows_with_epic("open"), [c.recorded_claim_row()])

    record = need(adapter, "claim_next")("alice", under=under)

    assert list(runner.calls) == [r.LIST_ARGS, c.claim_argv("alice", parent), c.EPIC_TO_IN_PROGRESS, ["sync"]]
    assert record.id == "demo-E1-s3"


def test_an_empty_claim_result_gives_none_with_no_write_and_no_sync() -> None:
    adapter, runner = c.adapter_over(c.rows_with_epic("open"), [])

    assert need(adapter, "claim_next")("alice") is None

    assert list(runner.calls) == [r.LIST_ARGS, c.claim_argv("alice")]


def test_a_failed_claim_call_raises_adapter_error_claim_next_refused_with_the_stderr_and_nothing_else() -> None:
    from tracker_port.port import AdapterError, ArgumentError

    adapter, runner = c.adapter_over(c.rows_with_epic("open"), error="unknown flag: --claim")

    with pytest.raises(AdapterError, match="claim-next refused") as raised:
        need(adapter, "claim_next")("alice")

    assert "unknown flag" in str(raised.value)
    assert not isinstance(raised.value, ArgumentError)
    assert runner.verbs() == ["list", "ready"], "no epic update and no sync after a failed claim"


def test_a_claimed_row_with_no_cb_block_raises_adapter_error_naming_the_bd_id() -> None:
    from tracker_port.port import AdapterError

    adapter, _ = c.adapter_over(c.rows_with_epic("open"), [r.ready_row("t-foreign")])

    with pytest.raises(AdapterError, match="t-foreign"):
        need(adapter, "claim_next")("alice")


def test_a_legacy_tracker_raises_adapter_error_naming_migrate_mapping_and_sends_no_claim_call() -> None:
    import json

    import _beads_support as support
    from tracker_port.port import AdapterError, ArgumentError

    legacy = json.loads((support.BEADS_DIR / "list.json").read_text(encoding="utf-8"))
    adapter, runner = c.adapter_over(legacy, [c.recorded_claim_row()])

    with pytest.raises(AdapterError, match="migrate-mapping") as raised:
        need(adapter, "claim_next")("alice")

    assert not isinstance(raised.value, ArgumentError)
    assert runner.verbs() == ["list"], "the refusal reads the list and sends no claim call"


@pytest.mark.parametrize("under", ["no-such-id", "demo-E1-s3", "pr-101"])
def test_under_that_names_no_record_a_slice_or_a_pull_request_raises_argument_error_before_any_claim(under: str) -> None:
    from tracker_port.port import ArgumentError

    adapter, runner = c.adapter_over(c.rows_with_epic("open"), [c.recorded_claim_row()])

    with pytest.raises(ArgumentError):
        need(adapter, "claim_next")("alice", under=under)

    assert runner.verbs() == ["list"]
