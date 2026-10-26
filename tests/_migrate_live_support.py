"""Real-bd helpers for the E7-7 live test. Not a test module.

`build_legacy` makes a scratch tracker in the OLD mapping with bd 1.3.0: the custom type `program`, a task
for the pull request that blocks both epics, two gh:pr gates, no label, no chain edge, a wrong ref on the pull
request, a deferred epic, and a foreign task. It uses the rows of `_migrate_support.make_rows(legacy=True)`.
`snapshot` reads everything that a dry run must leave as it is. Every call runs in the scratch dir only.
"""
from __future__ import annotations

import json
import shutil
from pathlib import Path
from typing import Any

import pytest

import _migrate_support as s


def runner_in(root: Path) -> Any:
    from tracker_port.bd_runner import BdRunner

    return BdRunner(cwd=root)


def _create(runner: Any, row: dict[str, Any], bd_ids: dict[str, str]) -> str:
    cb = row["metadata"]["cb"]
    argv = ["create", "--silent", "--type", row["issue_type"], "--title", row["title"], "--priority", "1" if cb["kind"] == "program" else "2"]
    argv += ["--metadata", json.dumps({"cb": cb}, separators=(",", ":"))]
    argv += ["--external-ref", row["external_ref"]] if row.get("external_ref") else []
    argv += ["--labels", "cb"] if row.get("labels") else []
    argv += ["--parent", bd_ids[row["parent_cb"]]] if row.get("parent_cb") else []
    return runner.run(argv).strip()


def build_legacy(root: Path) -> dict[str, str]:
    """Build the legacy tracker in `root`. Return the bd id of each cb id, and of `foreign`."""
    if shutil.which("bd") is None:
        pytest.skip("bd is not on PATH")
    runner = runner_in(root)
    runner.run(["init", "--quiet", "--prefix", "t", "--skip-agents", "--skip-hooks", "--non-interactive"])
    runner.run(["config", "set", "types.custom", "program,other"])
    rows = {row["metadata"]["cb"]["id"]: row for row in s.make_rows(True) if "metadata" in row}
    parents = {record.id: record.parent for record in s.mapped_records()}
    ids: dict[str, str] = {}
    for record in s.mapped_records():
        ids[record.id] = _create(runner, {**rows[record.id], "parent_cb": parents[record.id]}, ids)
    ids["pr-101"] = _create(runner, {**rows["pr-101"], "metadata": {"cb": {"v": 1, "id": "pr-101", "kind": "pr", "envelope": {}}}}, ids)
    gates = []
    for epic in ("mapped/E1", "mapped/E2"):
        runner.run(["dep", "add", ids[epic], ids["pr-101"]])
        gates.append(json.loads(runner.run(["gate", "create", "--type", "gh:pr", "--blocks", ids[epic], "--await-id", "101", "--json"]))["id"])
    block = {"v": 1, "id": "pr-101", "kind": "pr", "envelope": {"gates": gates}}
    runner.run(["update", ids["pr-101"], "--metadata", json.dumps({"cb": block}, separators=(",", ":"))])
    ids["foreign"] = runner.run(["create", "foreign", "--type", "task", "--priority", "0", "--silent"]).strip()
    return ids


def list_rows(root: Path) -> list[dict[str, Any]]:
    return sorted(json.loads(runner_in(root).run(["list", "--json", "--all"])), key=lambda row: row["id"])


def snapshot(root: Path) -> dict[str, Any]:
    """The rows, the gates, the custom types, and the export. A dry run leaves all four as they were."""
    runner = runner_in(root)
    return {
        "rows": list_rows(root),
        "gates": runner.run(["gate", "list", "--json"]),
        "config": runner.run(["config", "get", "types.custom"]),
        "export": runner.run(["export"]),
    }


def ready_ids(root: Path, *flags: str) -> set[str]:
    return {row["id"] for row in json.loads(runner_in(root).run(["ready", "-t", "task", *flags, "--json", "--limit", "0"]))}
