"""Tests for shared/tracker_port/projector.py: the golden index over the fake corpus.

Run with: uv run pytest tests/test_tracker_projector.py -q
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

SHARED_DIR = Path(__file__).resolve().parent.parent / "shared"
sys.path.insert(0, str(SHARED_DIR))

FIXTURE_DIR = Path(__file__).resolve().parent / "fixtures" / "tracker"
CORPUS_DIR = FIXTURE_DIR / "corpus"
EXPECTED_INDEX = FIXTURE_DIR / "expected-index.json"


def test_golden_index() -> None:
    # Imports stay inside the test so a missing package fails this test only.
    from tracker_port.fake import FakeAdapter
    from tracker_port.projector import project

    adapter = FakeAdapter(CORPUS_DIR)
    records = [
        *adapter.list_programs(),
        *adapter.list_epics(),
        *adapter.list_slices(),
        *adapter.list_pull_requests(),
    ]
    expected = json.loads(EXPECTED_INDEX.read_text(encoding="utf-8"))

    assert project(records) == expected
