"""Tests for shared/tracker_port/projector.py: the golden index over the fake corpus.

Run with: uv run pytest tests/test_tracker_projector.py -q
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _tracker_port_support as support  # noqa: E402

CORPUS_DIR = support.CORPUS
EXPECTED_INDEX = support.EXPECTED_INDEX


def test_golden_index() -> None:
    # Imports stay inside the test so a missing package fails this test only.
    from tracker_port.fake import FakeAdapter
    from tracker_port.projector import project

    adapter = FakeAdapter(CORPUS_DIR)
    records = support.all_records(adapter)
    expected = json.loads(EXPECTED_INDEX.read_text(encoding="utf-8"))

    assert project(records) == expected
