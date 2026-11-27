"""Slice 28 (E7-6): `tracker.py claim-next <claimant> [--under <epic or program>]`, its output, and its exit codes.

The beads cases run `tracker.main` in process over the replay runner of `_claim_next_support.py`. The fake case
runs the script, because the state file must carry the claim from one call to the next.

Run with: uv run pytest tests/test_tracker_claim_next_cli.py -q
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pytest

import _claim_next_support as c
import _tracker_cli_support as cli_support


def _run(monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str], adapter: Any, *argv: str) -> tuple[int, dict[str, Any]]:
    import tracker

    monkeypatch.setattr(tracker, "require_adapter", lambda *args, **kwargs: adapter)
    try:
        code = tracker.main(["claim-next", *argv])
    except SystemExit as exited:
        code = exited.code
    return code, json.loads(capsys.readouterr().out)


def test_a_claim_prints_the_claimed_record_and_exits_0(monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]) -> None:
    adapter, _ = c.adapter_over(c.rows_with_epic("open"), [c.recorded_claim_row()])

    code, payload = _run(monkeypatch, capsys, adapter, "alice")

    assert code == 0
    assert payload["ok"] is True
    assert {key: payload["result"][key] for key in ("id", "kind", "lifecycle", "assignee", "parent")} == {
        "id": "demo-E1-s3", "kind": "slice", "lifecycle": "in_progress", "assignee": "alice", "parent": "demo-E1",
    }


def test_under_comes_after_or_before_the_claimant_and_reaches_the_adapter_as_the_parent(
    monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    for argv in (("--under", "demo-E1", "alice"), ("alice", "--under", "demo-E1")):
        adapter, runner = c.adapter_over(c.rows_with_epic("in_progress"), [c.recorded_claim_row()])

        code, _ = _run(monkeypatch, capsys, adapter, *argv)

        assert code == 0
        assert c.claim_argv("alice", c.EPIC) in list(runner.calls)


def test_nothing_ready_prints_ok_with_a_null_result_exits_0_and_writes_nothing(
    monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    adapter, runner = c.adapter_over(c.rows_with_epic("open"), [])

    code, payload = _run(monkeypatch, capsys, adapter, "alice")

    assert code == 0
    assert (payload["ok"], "result" in payload, payload["result"]) == (True, True, None)
    assert runner.verbs() == ["list", "ready"]


@pytest.mark.parametrize("under", ["no-such-id", "demo-E1-s3", "pr-101"])
def test_under_that_names_no_record_a_slice_or_a_pull_request_exits_4(
    monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str], under: str
) -> None:
    adapter, runner = c.adapter_over(c.rows_with_epic("open"), [c.recorded_claim_row()])

    code, payload = _run(monkeypatch, capsys, adapter, "--under", under, "alice")

    assert (code, payload["ok"], payload["exit"]) == (4, False, 4)
    assert runner.verbs() == ["list"]


def test_a_bd_failure_exits_3_with_claim_next_refused_and_the_stderr(
    monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    adapter, _ = c.adapter_over(c.rows_with_epic("open"), error="unknown flag: --claim")

    code, payload = _run(monkeypatch, capsys, adapter, "alice")

    assert (code, payload["ok"], payload["exit"]) == (3, False, 3)
    assert "claim-next refused" in payload["error"] and "unknown flag" in payload["error"]


def test_a_legacy_tracker_exits_3_and_names_migrate_mapping(
    monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    import _beads_support as support

    legacy = json.loads((support.BEADS_DIR / "list.json").read_text(encoding="utf-8"))
    adapter, runner = c.adapter_over(legacy, [c.recorded_claim_row()])

    code, payload = _run(monkeypatch, capsys, adapter, "alice")

    assert (code, payload["ok"], payload["exit"]) == (3, False, 3)
    assert "migrate-mapping" in payload["error"]
    assert runner.verbs() == ["list"]


def test_the_files_adapter_exits_2_like_every_other_write(
    monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str], tmp_path: Path
) -> None:
    from tracker_port.files import FilesAdapter

    code, payload = _run(monkeypatch, capsys, FilesAdapter(tmp_path), "alice")

    assert (code, payload["ok"], payload["exit"]) == (2, False, 2)


def test_a_missing_claimant_exits_4(monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]) -> None:
    adapter, runner = c.adapter_over(c.rows_with_epic("open"), [c.recorded_claim_row()])

    code, payload = _run(monkeypatch, capsys, adapter)

    assert (code, payload["exit"]) == (4, 4)
    assert "claimant" in payload["error"]
    assert runner.calls == []


def test_help_lists_claim_next_next_to_claim_slice() -> None:
    assert {"claim-next", "claim-slice"} <= cli_support.cli_ops()


def test_the_script_on_the_fake_adapter_claims_in_id_order_starts_the_epic_and_keeps_the_state(tmp_path: Path) -> None:
    corpus = cli_support.FIXTURES / "corpus-ready"
    config = cli_support.fake_config(tmp_path, corpus, tmp_path / "state" / "tracker-state.json")

    claimed = cli_support.ok(cli_support.cli(config, tmp_path, "claim-next", "--under", "demo", "agent-x"))
    epics = cli_support.ok(cli_support.cli(config, tmp_path, "list-epics", "--program", "demo"))
    again = cli_support.cli(config, tmp_path, "claim-next", "agent-y", "--under", "demo")
    bad = cli_support.cli(config, tmp_path, "claim-next", "--under", "no-such-id", "agent-y")

    assert (claimed["id"], claimed["assignee"], claimed["lifecycle"]) == ("demo-E1-s3", "agent-x", "in_progress")
    assert {epic["id"]: epic["lifecycle"] for epic in epics}["demo-E1"] == "in_progress"
    assert again.returncode == 0, again.stderr
    assert json.loads(again.stdout)["result"] is None
    assert bad.returncode == 4, bad.stderr
