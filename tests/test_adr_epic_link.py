"""An ADR named on a design epic reaches that design."""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "shared"))

import build_index  # noqa: E402


def test_epic_adr_reaches_design() -> None:
    designs = {
        "alpha": {"goal": {"epics": [{"id": "E1", "adr": "ADR-0028"}]}},
        "beta": {"goal": {"epics": [{"id": "E1", "adr": None}]}},
    }
    assert build_index.adrs_reaching_design("ADR-0028", {}, designs) == ["alpha"]
