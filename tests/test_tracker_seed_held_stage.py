"""The seed repair closes an open program whose HELD envelope stage closes it, even with no file for it."""
from __future__ import annotations

import shutil
from pathlib import Path

import _beads_support as support
import _program_stage_support as ps

TREE = support.FIXTURE_DIR / "plans-planstage"
HELD = {
    "held-implemented": "implemented",
    "held-superseded": "superseded",
    "held-review": "review",
    "held-approved": "approved",
    "held-backlog": "backlog",
}


def test_real_bd_seed_closes_programs_by_held_stage_without_files(tmp_path: Path) -> None:
    shutil.copytree(TREE, tmp_path / "tree")
    plans = tmp_path / "tree" / "plans"
    adapter = ps.beads(tmp_path)
    for cb_id, stage in HELD.items():
        adapter.create_record(ps.program(cb_id, "approved"))
        row = next(r for r in adapter._rows() if r["metadata"]["cb"]["id"] == cb_id)
        adapter._update(row, block={**row["metadata"]["cb"], "envelope": {"stage": stage}})
    adapter.create_record(ps.program("held-nostage", "approved"))
    row = next(r for r in adapter._rows() if r["metadata"]["cb"]["id"] == "held-nostage")
    adapter._update(row, block={**row["metadata"]["cb"], "envelope": {}})
    adapter.create_record(ps.program("held-closed", "approved"))
    adapter.runner.run(["close", next(r["id"] for r in adapter._rows() if r["metadata"]["cb"]["id"] == "held-closed"), "--force"])
    assert ps.bd_status(adapter, "held-implemented") == "open"

    adapter.seed_from_files(plans)

    status = {cb_id: ps.bd_status(adapter, cb_id) for cb_id in (*HELD, "held-nostage", "held-closed")}
    assert status["held-implemented"] == "closed"
    assert status["held-superseded"] == "closed"
    assert status["held-review"] == "open"
    assert status["held-approved"] == "open"
    assert status["held-backlog"] == "open"
    assert status["held-nostage"] == "open"
    assert status["held-closed"] == "closed"
