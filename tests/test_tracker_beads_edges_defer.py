"""Slice 25 (E7-3): an open epic whose envelope holds `deferred` gets `--defer <date>` on create. No other record does.

The test reads the create argv. No bd is needed. The live check of the deferred slices is in
test_tracker_beads_edges_real.py.

Run with: uv run pytest tests/test_tracker_beads_edges_defer.py -q
"""
from __future__ import annotations

from typing import Any

import pytest

import _beads_edges_support as e
import _beads_mapping_support as m

DATE = "2099-12-31"


def _create_epic(lifecycle: str, envelope: dict[str, Any]) -> list[str]:
    from tracker_port.beads import BeadsAdapter

    runner = e.EdgeRunner([])
    adapter = BeadsAdapter(runner)
    adapter.create_record(m.create_record_of("program"))
    adapter.create_record(m.create_record_of("epic", lifecycle=lifecycle, envelope=envelope))
    return runner.creates()["mapdemo/E1"]


def test_an_open_epic_with_a_deferred_date_gets_the_defer_flag_with_that_date() -> None:
    argv = _create_epic("open", {"epic_id": "E1", "deferred": DATE})

    assert m.flag_value(argv, "--defer") == DATE
    assert argv.count("--defer") == 1


@pytest.mark.parametrize("lifecycle", ["closed", "in_progress"])
def test_a_closed_or_in_progress_epic_gets_no_defer_flag_even_with_a_deferred_date(lifecycle: str) -> None:
    argv = _create_epic(lifecycle, {"epic_id": "E1", "deferred": DATE})

    assert "--defer" not in argv


def test_an_open_epic_with_no_deferred_key_gets_no_defer_flag() -> None:
    assert "--defer" not in _create_epic("open", {"epic_id": "E1"})


def test_the_deferred_date_stays_in_the_envelope_so_a_read_gives_it_back() -> None:
    argv = _create_epic("open", {"epic_id": "E1", "deferred": DATE})

    assert m.flag_value(argv, "--metadata") is not None
    assert DATE in m.flag_value(argv, "--metadata")


@pytest.mark.parametrize("name", ["program", "slice", "pr"])
def test_a_record_that_is_not_an_epic_gets_no_defer_flag(name: str) -> None:
    from tracker_port.beads import BeadsAdapter

    runner = e.EdgeRunner([])
    BeadsAdapter(runner).create_record(m.create_record_of(name, parent=None, envelope={"deferred": DATE}))

    assert all("--defer" not in call for call in runner.calls if call[0] == "create")
