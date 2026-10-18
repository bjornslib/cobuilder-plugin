"""Contract cases for the tracker port. Slice 1 runs one case on the fake adapter.

Run with: uv run pytest tests/test_tracker_contract.py -q
"""
from __future__ import annotations

import sys
from pathlib import Path

SHARED_DIR = Path(__file__).resolve().parent.parent / "shared"
sys.path.insert(0, str(SHARED_DIR))

CORPUS_DIR = Path(__file__).resolve().parent / "fixtures" / "tracker" / "corpus"


def test_next_ready_slice_under_epic() -> None:
    # Imports stay inside the test so a missing package fails this test only.
    from tracker_port.fake import FakeAdapter

    ready = FakeAdapter(CORPUS_DIR).next_ready("slice", under="demo-E1")

    assert [record.id for record in ready] == ["demo-E1-s3"]
