"""Shared helpers for the E7-7 migrate-mapping tests. Not a test module.

The tracker is the program `mapped` of tests/fixtures/tracker/plans-mapping: two epics, three slices, and the
pull request pr-101 that holds both epics. `make_rows` builds it in the OLD mapping (legacy) or in the NATIVE
mapping. The native rows are what a migration with `--plans-dir` must give. The pinned report shape:

    {"changed": int, "dry_run": bool, "changes": [{"id", "change", "detail"}], "counts": {change: int}, "missing": [{"id", "detail"}]}

`id` is the cb id of the changed row. An `unblock` names the epic, and a `track` or a `gate` names the pull
request. The drop of the `program` custom type has the id `types.custom` and the change `config`. A `label`
change covers the label and the external ref. A `title` and a `text` change are one for each row. `missing`
holds the chain edges that the rows lack and that the run cannot add without `--plans-dir`.
"""
from __future__ import annotations

import dataclasses
import json
from collections import Counter
from pathlib import Path
from typing import Any

import _beads_support as support
from _beads_mapping_support import need
from _migrate_sim import BdSim

PLANS = support.FIXTURE_DIR / "plans-mapping" / "plans"
BD = {"mapped": "t-m", "mapped/E1": "t-m.1", "mapped/E2": "t-m.2", "mapped/1": "t-m.1.1", "mapped/2": "t-m.1.2", "mapped/3": "t-m.2.1", "pr-101": "t-pr"}
GATES = {"t-g1": "mapped/E1", "t-g2": "mapped/E2"}  # gate id -> the epic that it blocks
FOREIGN, FOREIGN_PROGRAM = "t-fx", "t-fp"
OLD_TYPE = {"program": "program", "epic": "epic", "slice": "task"}
NEW_TYPE = {"program": "feature", "epic": "epic", "slice": "task"}
DEFERRED = "2099-12-31"
REPORT_KEYS = {"changed", "dry_run", "changes", "counts", "missing"}


def mapped_records() -> list[Any]:
    from tracker_port.files import seedable_records

    records, _ = seedable_records(PLANS)
    return [record for record in records if record.id == "mapped" or record.id.startswith("mapped/")]


def _edge(frm: str, to: str, kind: str) -> dict[str, str]:
    return {"issue_id": frm, "depends_on_id": to, "type": kind}


def cb_row(record: Any, legacy: bool, deferred: str | None) -> dict[str, Any]:
    envelope = json.loads(json.dumps(dict(record.envelope), default=list))
    row: dict[str, Any] = {"id": BD[record.id], "status": "open", "priority": 2, "dependencies": []}
    if record.id == "mapped/E2" and deferred:
        envelope["deferred"] = deferred
        if not legacy:
            row.update(status="deferred", defer_until=deferred)
    row["metadata"] = {"cb": {"v": 1, "id": record.id, "kind": record.kind, "envelope": envelope}}
    if record.parent:
        row["parent"] = BD[record.parent]
        row["dependencies"].append(_edge(row["id"], BD[record.parent], "parent-child"))
    if legacy:
        row.update(issue_type=OLD_TYPE[record.kind], title=record.id)
        if record.kind == "slice":
            row["external_ref"] = record.id
        if record.id == "mapped/3":
            row.update(labels=["cb"], external_ref="mapped/3-old")
        return row
    row.update(issue_type=NEW_TYPE[record.kind], title=record.title, external_ref=record.id, labels=["cb"])
    row.update(description=record.description, acceptance_criteria=record.acceptance_criteria, design=record.design)
    row["dependencies"] += [_edge(row["id"], BD[blocker], "blocks") for blocker in record.blocked_by]
    return row


def make_rows(legacy: bool, deferred: str | None = DEFERRED, foreign_program: bool = False) -> list[dict[str, Any]]:
    rows = [cb_row(record, legacy, deferred) for record in mapped_records()]
    pr: dict[str, Any] = {"id": BD["pr-101"], "status": "open", "priority": 2, "title": "pr-101", "dependencies": []}
    block = {"v": 1, "id": "pr-101", "kind": "pr", "envelope": {}}
    if legacy:
        block["envelope"] = {"gates": list(GATES)}
        pr.update(issue_type="task", external_ref="PR#101")
        for row in rows:
            for gate, epic in GATES.items():
                if row["metadata"]["cb"]["id"] == epic:
                    row["dependencies"] += [_edge(row["id"], BD["pr-101"], "blocks"), _edge(row["id"], gate, "blocks")]
    else:
        pr.update(issue_type="milestone", external_ref="gh-101", labels=["cb"])
        pr["dependencies"] = [_edge(pr["id"], BD[epic], "tracks") for epic in ("mapped/E1", "mapped/E2")]
    pr["metadata"] = {"cb": block}
    rows += [pr, {"id": FOREIGN, "title": "foreign", "status": "open", "priority": 0, "issue_type": "task"}]
    if foreign_program:
        rows.append({"id": FOREIGN_PROGRAM, "title": "foreign program", "status": "open", "priority": 2, "issue_type": "program"})
    return rows


def legacy_sim(foreign_program: bool = False, fail_after: int | None = None, deferred: str | None = DEFERRED) -> BdSim:
    return BdSim(make_rows(True, deferred, foreign_program), GATES, ["program", "other"], fail_after)


def native_sim(deferred: str | None = DEFERRED) -> BdSim:
    return BdSim(make_rows(False, deferred), None, ["other"])


def adapter_over(sim: BdSim) -> Any:
    from tracker_port.beads import BeadsAdapter

    return BeadsAdapter(sim)


def normal(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """The rows without empty fields, and with the edges in order. Two trackers in the same state give equal lists."""
    out = []
    for row in rows:
        kept = {key: value for key, value in row.items() if value not in (None, [], "")}
        kept["dependencies"] = sorted((tuple(sorted(dep.items())) for dep in row.get("dependencies") or []))
        out.append(kept)
    return sorted(out, key=lambda row: row["id"])


def as_dict(report: Any) -> dict[str, Any]:
    plain = dataclasses.asdict(report) if dataclasses.is_dataclass(report) and not isinstance(report, type) else dict(report)
    assert REPORT_KEYS <= set(plain), f"the report lacks {sorted(REPORT_KEYS - set(plain))}: {sorted(plain)}"
    assert all({"id", "change", "detail"} <= set(entry) for entry in plain["changes"]), plain["changes"]
    return plain


def migrate(adapter: Any, dry_run: bool = False, plans_dir: Path | None = None) -> dict[str, Any]:
    return as_dict(need(adapter, "migrate_mapping")(dry_run=dry_run, plans_dir=plans_dir))


def pairs(report: dict[str, Any]) -> Counter[tuple[str, str]]:
    return Counter((entry["id"], entry["change"]) for entry in report["changes"])


def _count(*items: tuple[str, str, int]) -> Counter[tuple[str, str]]:
    return Counter({(cb_id, change): n for cb_id, change, n in items})


# Every change of a full migration with --plans-dir, by (cb id, change).
FULL = _count(
    ("mapped", "retype", 1), ("pr-101", "retype", 1),
    *[(cb_id, "label", 1) for cb_id in ("mapped", "mapped/E1", "mapped/E2", "mapped/1", "mapped/2", "mapped/3", "pr-101")],
    *[(cb_id, "title", 1) for cb_id in ("mapped", "mapped/E1", "mapped/E2", "mapped/1", "mapped/2", "mapped/3")],
    *[(cb_id, "text", 1) for cb_id in ("mapped", "mapped/E1", "mapped/1", "mapped/2", "mapped/3")],
    ("mapped/E1", "unblock", 1), ("mapped/E2", "unblock", 1), ("pr-101", "track", 2), ("pr-101", "gate", 2),
    ("mapped/E2", "chain", 1), ("mapped/2", "chain", 1), ("mapped/E2", "defer", 1), ("types.custom", "config", 1),
)
# Without --plans-dir: only the slice titles change, and the chain edges are missing, not added.
SLICE_TITLES = {("mapped/1", "title"), ("mapped/2", "title"), ("mapped/3", "title")}
NO_PLANS = Counter({key: n for key, n in FULL.items() if key[1] not in ("text", "chain", "title") or key in SLICE_TITLES})
MISSING = {"mapped/E2", "mapped/2"}


def without_plans(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """The native rows as a migration without --plans-dir leaves them: no text, no chain, the names of slices only."""
    out = []
    for row in rows:
        cb = (row.get("metadata") or {}).get("cb")
        if cb is None:  # a foreign row
            out.append(row)
            continue
        row = dict(row, dependencies=[dep for dep in row["dependencies"] if dep["type"] != "blocks"])
        if cb["kind"] != "slice":
            row["title"] = cb["id"]
        out.append({key: value for key, value in row.items() if key not in ("description", "acceptance_criteria", "design")})
    return out


def run_on(sim: BdSim, **kwargs: Any) -> dict[str, Any]:
    """Migrate the tracker of the sim through a new beads adapter."""
    return migrate(adapter_over(sim), **kwargs)


def flags_of(call: list[str]) -> set[str]:
    return {word for word in call[2:] if word.startswith("--")}
