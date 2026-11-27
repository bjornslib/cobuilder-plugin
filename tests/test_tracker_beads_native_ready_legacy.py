"""Slice 27 (E7-5): on a tracker in the old mapping, `next_ready` for slices refuses and names `migrate-mapping`.

The refusal is an `AdapterError` (CLI exit 3), not an `ArgumentError` (exit 4): the arguments are right and the
tracker needs a migration. The adapter reads the list first, finds the legacy marks, and sends no ready call.
`beads/list.json` is the recorded legacy tracker: a program of type program, a task-typed PR, and epics that
the PR blocks. The program and epic kinds keep working on it, as the design limits the refusal to slices.

Run with: uv run pytest tests/test_tracker_beads_native_ready_legacy.py -q
"""
from __future__ import annotations

import json
from typing import Any

import pytest

import _beads_ready_support as r
import _beads_support as support


def _legacy_rows() -> list[dict[str, Any]]:
    return json.loads((support.BEADS_DIR / "list.json").read_text(encoding="utf-8"))


@pytest.mark.parametrize("under", [None, "demo", "demo-E1"])
def test_a_slice_ready_on_a_legacy_tracker_raises_adapter_error_naming_migrate_mapping(under: str | None) -> None:
    from tracker_port.port import AdapterError, ArgumentError

    adapter, runner = r.adapter_over(_legacy_rows(), ["t-anc.1.3"])

    with pytest.raises(AdapterError, match="migrate-mapping") as raised:
        adapter.next_ready("slice", under=under)

    assert not isinstance(raised.value, ArgumentError)
    assert [call[0] for call in list(runner.calls)] == ["list"], "the refusal reads the list and sends no ready call"


@pytest.mark.parametrize("kind", ["program", "epic"])
def test_the_program_and_epic_kinds_still_read_a_legacy_tracker(kind: str) -> None:
    adapter, runner = r.adapter_over(_legacy_rows())

    adapter.next_ready(kind)

    assert [call[0] for call in list(runner.calls)] == ["list"]


def test_the_cli_refuses_a_legacy_slice_ready_with_exit_3_and_the_migrate_mapping_message(
    monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    import tracker

    adapter, _ = r.adapter_over(_legacy_rows())
    monkeypatch.setattr(tracker, "require_adapter", lambda *args, **kwargs: adapter)

    with pytest.raises(SystemExit) as exited:
        tracker.main(["next-ready", "--kind", "slice"])

    payload = json.loads(capsys.readouterr().out)
    assert exited.value.code == 3
    assert (payload["ok"], payload["exit"]) == (False, 3)
    assert "migrate-mapping" in payload["error"]


def test_the_cli_reports_a_failed_ready_call_as_exit_3(monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]) -> None:
    import tracker

    adapter, _ = r.adapter_over(r.list_rows(), error="unknown flag: --label")
    monkeypatch.setattr(tracker, "require_adapter", lambda *args, **kwargs: adapter)

    with pytest.raises(SystemExit) as exited:
        tracker.main(["next-ready", "--kind", "slice"])

    assert exited.value.code == 3
    assert "unknown flag" in json.loads(capsys.readouterr().out)["error"]


def test_the_cli_doctor_shows_native_ready_true_and_the_mapping(monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]) -> None:
    import tracker

    for rows, mapping in ((r.list_rows(), "native"), (_legacy_rows(), "legacy")):
        adapter, _ = r.adapter_over(rows)
        monkeypatch.setattr(tracker, "require_adapter", lambda *args, _adapter=adapter, **kwargs: _adapter)

        assert tracker.main(["doctor"]) == 0
        result = json.loads(capsys.readouterr().out)["result"]

        assert result["capabilities"]["native_ready"] is True
        assert result["mapping"] == mapping
