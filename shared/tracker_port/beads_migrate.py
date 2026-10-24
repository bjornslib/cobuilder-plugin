"""Convert legacy beads rows to the native mapping, with resumable writes."""

from __future__ import annotations

import datetime
import json
from collections import Counter
from pathlib import Path
from typing import Any

from .bd_runner import BdError
from .beads_rows import _is_cb_row, external_ref_of
from .beads_migrate_chains import chain_updates as _chain_updates
from .port import AdapterError

GATE_COMMAND = "gate"


def _entry(id: str, change: str, detail: str) -> dict[str, str]:
    return {"id": id, "change": change, "detail": detail}


def _report(changes: list[dict[str, str]], dry_run: bool, missing: list[dict[str, str]]) -> dict[str, Any]:
    return {
        "changed": len(changes),
        "dry_run": dry_run,
        "changes": changes,
        "counts": dict(Counter(item["change"] for item in changes)),
        "missing": missing,
    }


def _type_change(row: dict[str, Any], id: str, kind: str) -> tuple[list[str], list[dict[str, str]]]:
    issue_type = row.get("issue_type")
    if kind == "program" and issue_type == "program":
        return ["--type", "feature"], [_entry(id, "retype", "program to feature")]
    if kind == "pr" and issue_type == "task":
        return ["--type", "milestone"], [_entry(id, "retype", "task to milestone")]
    return [], []


def _row_update(row: dict[str, Any], record: Any, today: str) -> tuple[list[str], list[dict[str, str]]]:
    cb = row["metadata"]["cb"]
    id, kind, envelope = cb["id"], cb["kind"], cb.get("envelope") or {}
    args: list[str] = []
    changes: list[dict[str, str]] = []
    type_args, type_changes = _type_change(row, id, kind)
    args.extend(type_args)
    changes.extend(type_changes)
    labels: list[str] = []
    if "cb" not in (row.get("labels") or []):
        labels += ["--add-label", "cb"]
    ref = external_ref_of(id)
    if row.get("external_ref") != ref:
        labels += ["--external-ref", ref]
    if labels:
        args += labels
        changes.append(_entry(id, "label", "set cb label and external ref"))
    title = record.title if record else (envelope.get("title") if kind == "slice" else None)
    if kind != "pr" and title and row.get("title") != title:
        args += ["--title", title]
        changes.append(_entry(id, "title", "set record name"))
    if record is not None:
        text: list[str] = []
        for flag, attr, key in (("--description", "description", "description"), ("--acceptance", "acceptance_criteria", "acceptance_criteria"), ("--design", "design", "design")):
            value = getattr(record, attr)
            if value and row.get(key) != value:
                text += [flag, value]
        if text:
            args += text
            changes.append(_entry(id, "text", "set text fields from plan files"))
    deferred = envelope.get("deferred")
    if kind == "epic" and row.get("status") == "open" and deferred and str(deferred) > today and row.get("defer_until") != str(deferred):
        args += ["--defer", str(deferred)]
        changes.append(_entry(id, "defer", f"defer until {deferred}"))
    return (["update", row["id"], *args] if args else []), changes


def _row_updates(rows: list[dict[str, Any]], records: dict[str, Any]) -> tuple[list[list[str]], list[dict[str, str]]]:
    operations: list[list[str]] = []
    changes: list[dict[str, str]] = []
    today = datetime.date.today().isoformat()
    for row in rows:
        cb_id = row["metadata"]["cb"]["id"]
        operation, row_changes = _row_update(row, records.get(cb_id), today)
        if operation:
            operations.append(operation)
        changes.extend(row_changes)
    return operations, changes


def _edge_updates(adapter: Any, rows: list[dict[str, Any]]) -> tuple[list[list[str]], list[dict[str, str]]]:
    operations: list[list[str]] = []
    changes: list[dict[str, str]] = []
    pull_requests = [row for row in rows if row["metadata"]["cb"]["kind"] == "pr"]
    epics = [row for row in rows if row["metadata"]["cb"]["kind"] == "epic"]
    for pr in pull_requests:
        pr_cb = pr["metadata"]["cb"]
        tracked = {dep["depends_on_id"] for dep in pr.get("dependencies") or [] if dep.get("type") == "tracks"}
        for epic in epics:
            blocks_pr = any(dep.get("depends_on_id") == pr["id"] and dep.get("type") == "blocks" for dep in epic.get("dependencies") or [])
            if blocks_pr:
                if epic["id"] not in tracked:
                    operations.append(["dep", "add", pr["id"], epic["id"], "--type", "tracks"])
                    changes.append(_entry(pr_cb["id"], "track", f"tracks {epic['metadata']['cb']['id']}"))
                operations.append(["dep", "rm", epic["id"], pr["id"]])
                changes.append(_entry(epic["metadata"]["cb"]["id"], "unblock", f"remove blocker {pr_cb['id']}"))
        envelope = pr_cb.get("envelope") or {}
        gates = envelope.get("gates") or []
        if gates:
            open_gates = {
                gate.get("id")
                for gate in json.loads(adapter.runner.run([GATE_COMMAND, "list", "--json"]) or "null") or []
            }
            for gate in gates:
                if gate in open_gates:
                    operations.append([GATE_COMMAND, "resolve", gate])
                for epic in rows:
                    if any(dep.get("depends_on_id") == gate for dep in epic.get("dependencies") or []):
                        operations.append(["dep", "rm", epic["id"], gate])
                changes.append(_entry(pr_cb["id"], "gate", f"resolve gate {gate}"))
            clean = {**pr_cb, "envelope": {key: value for key, value in envelope.items() if key != "gates"}}
            operations.append(["update", pr["id"], "--metadata", json.dumps({"cb": clean}, separators=(",", ":"))])
    return operations, changes




def _custom_type_update(adapter: Any, all_rows: list[dict[str, Any]]) -> tuple[list[list[str]], list[dict[str, str]]]:
    custom = adapter.runner.run(["config", "get", "types.custom"]).strip()
    types = [item for item in custom.split(",") if item and not item.startswith("types.custom")]
    foreign_program = any(
        row.get("issue_type") == "program" and not (_is_cb_row(row) and row["metadata"]["cb"]["kind"] == "program")
        for row in all_rows
    )
    if "program" not in types or foreign_program:
        return [], []
    remaining = [item for item in types if item != "program"]
    operation = ["config", "set", "types.custom", ",".join(remaining)] if remaining else ["config", "unset", "types.custom"]
    return [operation], [_entry("types.custom", "config", "remove program custom type")]


def migrate_mapping(adapter: Any, dry_run: bool = False, plans_dir: Path | None = None) -> dict[str, Any]:
    """Plan changes from one list read, then apply them in safe, resumable order."""
    from .files import seedable_records

    all_rows = adapter._all_rows()
    rows = [row for row in all_rows if _is_cb_row(row)]
    by_cb = {row["metadata"]["cb"]["id"]: row for row in rows}
    records = {record.id: record for record in seedable_records(plans_dir)[0]} if plans_dir is not None else {}
    row_ops, row_changes = _row_updates(rows, records)
    edge_ops, edge_changes = _edge_updates(adapter, rows)
    chain_ops, chain_changes, missing = _chain_updates(rows, records, by_cb, plans_dir)
    type_ops, type_changes = _custom_type_update(adapter, all_rows)
    operations = row_ops + edge_ops + chain_ops + type_ops
    changes = row_changes + edge_changes + chain_changes + type_changes
    if not dry_run:
        try:
            for operation in operations:
                adapter.runner.run(operation)
            if operations:
                adapter._publish()
        except BdError as error:
            raise AdapterError(f"migrate-mapping failed: {error.stderr.strip() or error}") from error
    return _report(changes, dry_run, missing)
