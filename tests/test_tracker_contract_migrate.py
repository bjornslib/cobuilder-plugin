"""Contract case 9 (E7-7): `migrate_mapping` on a tracker that already holds the native mapping.

The fake adapter gives the report with no change. The beads case runs on a scratch bd (it carries the pytest mark
`slow`, through the `build` fixture, and it skips without bd). Its corpus rows may lack an external ref, and the
first run may set one, so the case runs once and then pins the second run. A dry run changes no record. After one
run, a second run returns no change and a dry run lists none. The link of a pull request to its epics stays.

Run with: uv run pytest tests/test_tracker_contract_migrate.py -q -m ''
"""
from __future__ import annotations

from typing import Any

import _beads_support as support
import _migrate_support as s
from _tracker_contract_support import blocked_by_a_pr, tracked

pytest_plugins = ["_tracker_contract_support"]


def _shape(adapter: Any) -> list[tuple[Any, ...]]:
    # The record fields that a migration must keep. The external ref is left out: a first run may repair it.
    return [(r.id, r.kind, r.parent, r.blocked_by, r.lifecycle, r.assignee, r.tracks) for r in support.all_records(adapter)]


def test_a_dry_run_changes_no_record_and_lists_what_a_run_would_change(adapter: Any) -> None:
    before = _shape(adapter)

    dry = s.migrate(adapter, dry_run=True)
    again = s.migrate(adapter, dry_run=True)

    assert dry["dry_run"] is True and _shape(adapter) == before
    assert s.pairs(dry) == s.pairs(again) and dry["changed"] == len(dry["changes"])


def test_a_second_run_gives_no_change_and_the_pull_request_keeps_its_epics(adapter: Any) -> None:
    before = _shape(adapter)

    first = s.migrate(adapter)
    second = s.migrate(adapter)

    assert first["dry_run"] is False and first["changed"] == len(first["changes"])
    assert (second["changed"], second["changes"], second["counts"]) == (0, [], {})
    assert s.migrate(adapter, dry_run=True)["changed"] == 0
    assert _shape(adapter) == before
    assert tracked(adapter, "pr-101") == ["demo-E1", "demo-E2"] and blocked_by_a_pr(adapter) == []
