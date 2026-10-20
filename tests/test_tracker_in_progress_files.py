"""In-progress lifecycle: the files adapter, the fake adapter, and the dry run carry it.

Run with: uv run pytest tests/test_tracker_in_progress_files.py -q
"""
from __future__ import annotations

import json
from pathlib import Path

import _inprogress_support as ip
import _tracker_cli_support as cli_support
from _tracker_port_support import CORPUS


def test_files_adapter_reads_in_progress_slices_epics_and_keeps_programs_open() -> None:
    actual = ip.lifecycles(ip.file_records())

    for record_id, lifecycle in ip.EXPECTED.items():
        assert actual.get(record_id) == lifecycle, f"{record_id}: {actual.get(record_id)!r}, want {lifecycle!r}"


def test_in_progress_table_state_is_case_and_separator_insensitive() -> None:
    by_id = {record.id: record for record in ip.file_records()}

    # Slice 1 has the cell "In Progress" and no checkbox line. Slice 2 has "in_progress" and an open box.
    assert by_id["running/1"].lifecycle == "in_progress", by_id["running/1"].lifecycle
    assert by_id["running/2"].lifecycle == "in_progress", by_id["running/2"].lifecycle


def test_a_checked_checkbox_beats_an_in_progress_cell() -> None:
    by_id = {record.id: record for record in ip.file_records()}

    # Slice 3 has the cell "in-progress" and a checked box with score 0.950.
    assert by_id["running/3"].lifecycle == "closed", by_id["running/3"].lifecycle
    assert by_id["running/3"].envelope["score"] == 0.95, by_id["running/3"].envelope


def test_in_progress_changes_only_the_lifecycle_not_the_envelope() -> None:
    by_id = {record.id: record for record in ip.file_records()}

    assert by_id["running/1"].envelope == {
        "ends_with": "Table state is read",
        "feature": "running",
        "n": 1,
        "title": "Table only in progress",
        "score": None,
    }, by_id["running/1"].envelope
    assert by_id["ip-space/E1"].envelope == {"epic_id": "E1", "branch": "feature/ip-space", "state": "In Progress"}


def test_fake_adapter_seed_carries_the_in_progress_lifecycle(tmp_path: Path) -> None:
    from tracker_port.fake import FakeAdapter

    adapter = FakeAdapter(CORPUS, state_file=tmp_path / "state.json")
    adapter.seed_from_files(ip.PLANS_DIR)

    by_id = ip.lifecycles(adapter.list_slices() + adapter.list_epics() + adapter.list_programs())
    for record_id, lifecycle in ip.EXPECTED.items():
        assert by_id.get(record_id) == lifecycle, f"{record_id}: {by_id.get(record_id)!r}, want {lifecycle!r}"
    assert adapter.get_slice("running/1").lifecycle == "in_progress"


def test_seed_dry_run_lists_the_in_progress_lifecycle(tmp_path: Path) -> None:
    from tracker_port.files import FilesAdapter

    creates = FilesAdapter(ip.PLANS_DIR).seed_from_files(ip.PLANS_DIR, dry_run=True)

    by_id = ip.lifecycles(creates)
    for record_id, lifecycle in ip.EXPECTED.items():
        assert by_id.get(record_id) == lifecycle, f"{record_id}: {by_id.get(record_id)!r}, want {lifecycle!r}"


def test_cli_dry_run_prints_the_in_progress_lifecycle(tmp_path: Path) -> None:
    config = tmp_path / ".cobuilder" / "tracker.yaml"
    config.parent.mkdir()
    config.write_text(f"adapter: files\nplans_dir: {json.dumps(str(ip.PLANS_DIR))}\n", encoding="utf-8")

    result = cli_support.cli(config, tmp_path, "seed-from-files", str(ip.PLANS_DIR), "--dry-run")

    printed = {record["id"]: record["lifecycle"] for record in cli_support.ok(result)}
    assert printed["running/1"] == "in_progress", printed
    assert printed["ip-under/E1"] == "in_progress", printed
    assert printed["running/3"] == "closed", printed
