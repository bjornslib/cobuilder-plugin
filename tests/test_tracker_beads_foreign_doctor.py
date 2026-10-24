"""Foreign issues: doctor reports the count for beads and omits it for the fake and files adapters.

Run with: uv run pytest tests/test_tracker_beads_foreign_doctor.py -q
"""
from __future__ import annotations

import json
from pathlib import Path

import pytest

import _beads_support as support
import _tracker_cli_support as cli_support

PLANS_DIR = support.FIXTURE_DIR / "plans"


def test_doctor_reports_the_foreign_issue_count_for_beads(monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]) -> None:
    import tracker

    adapter, _ = support.list_adapter(support.foreign_rows_all())
    monkeypatch.setattr(tracker, "require_adapter", lambda *args, **kwargs: adapter)

    assert tracker.main(["doctor"]) == 0
    result = json.loads(capsys.readouterr().out)["result"]

    assert result["adapter"] == "beads"
    assert result["foreign_issues"] == 1
    assert set(result) == {"adapter", "capabilities", "foreign_issues", "mapping", "sync"}


def test_doctor_reports_zero_foreign_issues_for_beads_with_none(monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]) -> None:
    import tracker

    adapter, _ = support.list_adapter([row for row in support.foreign_rows_all() if "cb" in (row.get("metadata") or {})])
    monkeypatch.setattr(tracker, "require_adapter", lambda *args, **kwargs: adapter)

    assert tracker.main(["doctor"]) == 0

    assert json.loads(capsys.readouterr().out)["result"]["foreign_issues"] == 0


def test_doctor_of_the_fake_adapter_omits_foreign_issues(tmp_path: Path) -> None:
    config = cli_support.fake_config(tmp_path)

    result = cli_support.ok(cli_support.cli(config, tmp_path, "doctor"))

    assert set(result) == {"adapter", "capabilities"}


def test_doctor_of_the_files_adapter_omits_foreign_issues(tmp_path: Path) -> None:
    config = tmp_path / ".cobuilder" / "tracker.yaml"
    config.parent.mkdir()
    config.write_text(f"adapter: files\nplans_dir: {json.dumps(str(PLANS_DIR))}\n", encoding="utf-8")

    result = cli_support.ok(cli_support.cli(config, tmp_path, "doctor"))

    assert set(result) == {"adapter", "capabilities"}
