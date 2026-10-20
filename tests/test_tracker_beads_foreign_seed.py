"""Foreign issues: the seed dry run plans every plan record.

Run with: uv run pytest tests/test_tracker_beads_foreign_seed.py -q
"""
from __future__ import annotations

import _beads_support as support

PLANS_DIR = support.FIXTURE_DIR / "plans"


def test_seed_dry_run_over_only_foreign_issues_plans_every_plan_record() -> None:
    from tracker_port.files import seedable_records

    adapter, runner = support.list_adapter(support.foreign_only_rows())

    creates = adapter.seed_from_files(PLANS_DIR, dry_run=True)

    planned, _ = seedable_records(PLANS_DIR)
    assert [r.id for r in creates] == [r.id for r in planned]
    assert creates, "the plan fixture must hold records"
    assert all(call[0] == "list" for call in runner.calls), runner.calls
