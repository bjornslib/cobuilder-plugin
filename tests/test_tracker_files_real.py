"""Files adapter against plan shapes seen in real docs/plans.

Each test copies a minimal fixture from tests/fixtures/tracker/plans-real/ into tmp_path.
No test reads docs/plans or .cobuilder/.
"""

from __future__ import annotations

import shutil
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
SHARED_DIR = REPO / "shared"
TESTS_DIR = REPO / "tests"
sys.path.insert(0, str(SHARED_DIR))

FIXTURES = TESTS_DIR / "fixtures" / "tracker"
PLANS_REAL = FIXTURES / "plans-real"
CORPUS_DIR = FIXTURES / "corpus"


def _plans_root(tmp_path: Path, *names: str) -> Path:
    root = tmp_path / "plans"
    root.mkdir()
    for name in names:
        shutil.copytree(PLANS_REAL / name, root / name)
    return root


def test_score_attempt_suffix_is_read_into_score_and_attempts(tmp_path: Path) -> None:
    # Real 04-slices.md cells read "0.917 (attempt 2)". The score is 0.917, the attempts count is 2,
    # and a done slice is closed.
    from tracker_port.files import FilesAdapter

    adapter = FilesAdapter(_plans_root(tmp_path, "score-attempt"))
    slices = {record.id: record for record in adapter.all_records() if record.kind == "slice"}

    slice_one = slices["score-attempt/1"]
    assert slice_one.envelope["score"] == 0.917
    assert slice_one.envelope["attempts"] == 2
    assert slice_one.lifecycle == "closed"

    slice_two = slices["score-attempt/2"]
    assert slice_two.envelope["score"] is None
    assert slice_two.lifecycle == "open"


def test_unparsed_plan_is_reported_and_other_plans_still_load(tmp_path: Path) -> None:
    # One plan has a candidate slice row that the parser cannot read. The run keeps the other
    # plan and records the broken plan as a conflict. It does not stop with AdapterError.
    from tracker_port.files import FilesAdapter

    adapter = FilesAdapter(_plans_root(tmp_path, "status-only", "unparsed-row"))
    records = adapter.all_records()

    programs = {record.id for record in records if record.kind == "program"}
    assert programs == {"status-only", "unparsed-row"}

    assert [conflict["plan"] for conflict in adapter.conflicts] == ["unparsed-row"]
    assert adapter.conflicts[0]["text"]


def test_dry_run_plans_creates_for_clean_plans_only(tmp_path: Path) -> None:
    # The dry run uses the FakeAdapter seed path, so it returns the planned creates.
    # Creates for the clean plan appear. The conflicted plan has no create.
    from tracker_port.fake import FakeAdapter

    adapter = FakeAdapter(CORPUS_DIR)
    creates = adapter.seed_from_files(_plans_root(tmp_path, "status-only", "unparsed-row"), dry_run=True)

    created_ids = {record.id for record in creates}
    assert "status-only" in created_ids
    assert "unparsed-row" not in created_ids


def test_real_run_creates_no_record_for_conflicted_plan(tmp_path: Path) -> None:
    # A real run writes the clean plan and skips the conflicted one.
    from tracker_port.fake import FakeAdapter

    adapter = FakeAdapter(CORPUS_DIR, state_file=tmp_path / "state.json")
    adapter.seed_from_files(_plans_root(tmp_path, "status-only", "unparsed-row"), dry_run=False)

    program_ids = {record.id for record in adapter.list_programs()}
    assert "status-only" in program_ids
    assert "unparsed-row" not in program_ids


def test_status_only_plan_yields_program_and_no_slices(tmp_path: Path) -> None:
    # A plan with a status file and no slice table yields its program record and no slices.
    from tracker_port.files import FilesAdapter

    adapter = FilesAdapter(_plans_root(tmp_path, "status-only"))
    records = adapter.all_records()

    assert [record.id for record in records if record.kind == "program"] == ["status-only"]
    assert [record for record in records if record.kind in ("epic", "slice")] == []
