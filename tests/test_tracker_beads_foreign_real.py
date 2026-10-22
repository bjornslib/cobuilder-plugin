"""Foreign issues: the full path on real bd, in a temp directory.

Run with: uv run pytest tests/test_tracker_beads_foreign_real.py -q
"""
from __future__ import annotations

import json
import shutil
import tempfile
from pathlib import Path
from typing import Any

import pytest

import _beads_support as support
import _tracker_cli_support as cli_support

FOREIGN_TITLE = "Foreign task made by another tool"


def _bd_list(seed: Path) -> list[dict[str, Any]]:
    return json.loads(support.run(["bd", "list", "--json", "--all"], seed).stdout)


def test_full_path_on_real_bd_with_a_foreign_issue() -> None:
    support.require_bd()

    from tracker_port.bd_runner import BdRunner
    from tracker_port.beads import BeadsAdapter
    from tracker_port.files import FilesAdapter
    from tracker_port.port import ArgumentError

    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        plans = root / "plans"
        plans.mkdir()
        shutil.copytree(support.FIXTURE_DIR / "plans-real" / "score-attempt", plans / "score-attempt")
        expected_ids = sorted(r.id for r in FilesAdapter(plans).all_records())

        seed = support.scratch_tracker(root)
        foreign_id = support.run(
            ["bd", "create", "--silent", "--title", FOREIGN_TITLE, "--type", "task", "--priority", "2"], seed
        ).stdout.strip()
        foreign_before = next(row for row in _bd_list(seed) if row["id"] == foreign_id)
        assert "cb" not in (foreign_before.get("metadata") or {})

        config = seed / ".cobuilder" / "tracker.yaml"
        config.parent.mkdir()
        config.write_text("adapter: beads\nsync: write\n", encoding="utf-8")
        adapter = BeadsAdapter(BdRunner(bd="bd", cwd=seed))

        # list: the foreign issue never appears, and nothing raises.
        assert support.all_records(adapter) == []
        assert adapter.next_ready("slice") == []

        # doctor counts it.
        doctor = cli_support.ok(cli_support.cli(config, seed, "doctor"))
        assert doctor["adapter"] == "beads"
        assert doctor["foreign_issues"] == 1

        # seed dry run plans every plan record and writes nothing.
        dry = cli_support.ok(cli_support.cli(config, seed, "seed-from-files", str(plans), "--dry-run"))
        assert sorted(item["id"] for item in dry) == expected_ids
        assert _bd_list(seed) == [foreign_before]

        # seed apply creates every plan record.
        applied = cli_support.ok(cli_support.cli(config, seed, "seed-from-files", str(plans)))
        assert sorted(item["id"] for item in applied) == expected_ids
        assert sorted(r.id for r in support.all_records(adapter)) == expected_ids

        # a write by the foreign title is not found, and a second doctor still counts one.
        with pytest.raises(ArgumentError, match="no record with id"):
            adapter.set_slice_state(FOREIGN_TITLE, "closed")
        assert cli_support.ok(cli_support.cli(config, seed, "doctor"))["foreign_issues"] == 1

        # the foreign issue is unchanged.
        foreign_after = next(row for row in _bd_list(seed) if row["id"] == foreign_id)
        assert foreign_after == foreign_before
