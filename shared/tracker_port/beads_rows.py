"""Pure helpers of the beads adapter: the metadata.cb block, the bd arguments, and the ready rule."""

from __future__ import annotations

import json
import re
from collections.abc import Sequence
from typing import Any

from .port import AdapterError, ArgumentError
from .record import TrackerRecord

CB_VERSION = 1
KINDS = ("program", "epic", "slice", "pr")
READY_KINDS = ("program", "epic", "slice")
# A deferred row reads as open. bd hides its children until the defer date, and the lifecycle stays open.
STATUS_MAP = {
    "open": "open",
    "deferred": "open",
    "in_progress": "in_progress",
    "hooked": "in_progress",
    "closed": "closed",
}
BD_STATUS = {"open": "open", "in_progress": "in_progress", "closed": "closed"}
BD_TYPE = {"program": "feature", "epic": "epic", "slice": "task", "pr": "milestone"}
CB_LABEL = "cb"
BD_PRIORITY = {"program": "1", "epic": "2", "slice": "2", "pr": "2"}
LIST_ARGS = ["list", "--json", "--all"]


def _is_cb_row(row: dict[str, Any]) -> bool:
    return isinstance((row.get("metadata") or {}).get("cb"), dict)


def _cb_block(row: dict[str, Any]) -> dict[str, Any]:
    """Return metadata.cb after it passes the version and kind checks."""
    issue_id = row.get("id")
    cb = (row.get("metadata") or {}).get("cb")
    if not isinstance(cb, dict):
        raise AdapterError(f"bd issue {issue_id} has no metadata.cb block")
    if cb.get("v") != CB_VERSION:
        raise AdapterError(
            f"bd issue {issue_id} has metadata.cb.v = {cb.get('v')!r}; this adapter reads v{CB_VERSION}"
        )
    if cb.get("kind") not in KINDS:
        raise AdapterError(f"bd issue {issue_id} has unknown metadata.cb.kind {cb.get('kind')!r}")
    return cb


def _envelope(cb: dict[str, Any]) -> dict[str, Any]:
    # List values become tuples, to match the fake adapter's records.
    return {key: tuple(value) if isinstance(value, list) else value for key, value in (cb.get("envelope") or {}).items()}


def _metadata_arg(cb: dict[str, Any]) -> str:
    # bd --metadata merges top-level keys. Send the whole block under "cb", so bd replaces the old block.
    return json.dumps({"cb": cb}, separators=(",", ":"))


def _create_argv(
    block: dict[str, Any],
    title: str | None = None,
    parent: str | None = None,
    status: str | None = None,
    options: Sequence[tuple[str, str | None]] = (),
) -> list[str]:
    # The block kind sets the bd type and the priority. The title is the human name, or the block id.
    # The flag order matches the recorded bd transcripts. Replays compare the whole argument list.
    # An option with no value, or an empty one, sends no flag.
    kind = block["kind"]
    argv = ["create", "--silent"]
    if parent is not None:
        argv += ["--parent", parent]
    argv += ["--type", BD_TYPE[kind], "--title", title or block["id"], "--priority", BD_PRIORITY[kind]]
    argv += ["--labels", CB_LABEL]
    if status is not None:
        argv += ["--status", status]
    for flag, value in options:
        if value:
            argv += [flag, value]
    argv += ["--metadata", _metadata_arg(block)]
    return argv


def lookup_argv(external_ref: str) -> list[str]:
    """The one bd call that lists the rows of one external ref (an exact filter)."""
    return ["list", "--external-ref", external_ref, "--json", "--limit", "0", "--all"]


def external_ref_of(cb_id: str) -> str:
    """The external ref that a record of this cb id holds. A pull request holds gh-<n>."""
    match = re.fullmatch(r"pr-(\d+)", cb_id)
    return f"gh-{match.group(1)}" if match else cb_id


def legacy_reasons(rows: list[dict[str, Any]]) -> list[str]:
    """One reason for each mark of the old mapping on a cb row. An empty list means the native mapping."""
    cb_rows = [row for row in rows if _is_cb_row(row)]
    kinds = {row["id"]: _cb_block_kind(row) for row in cb_rows}
    reasons = []
    for row in cb_rows:
        kind, issue_type = kinds[row["id"]], row.get("issue_type")
        if kind == "program" and issue_type == "program":
            reasons.append(f"{row['id']} is a program of the type program, not feature")
        if kind == "pr" and issue_type == "task":
            reasons.append(f"{row['id']} is a pull request of the type task, not milestone")
        for dep in row.get("dependencies") or []:
            if kind == "epic" and dep.get("type") == "blocks" and kinds.get(dep.get("depends_on_id")) == "pr":
                reasons.append(f"{row['id']} is an epic that the pull request {dep['depends_on_id']} blocks")
    return reasons


def _cb_block_kind(row: dict[str, Any]) -> str | None:
    return row["metadata"]["cb"].get("kind")


def _pr_number(ref: str) -> str:
    match = re.search(r"(\d+)$", ref)
    if match is None:
        raise ArgumentError(f"pull request ref {ref!r} must end in its GitHub number, such as pr-101")
    return match.group(1)


def _with_envelope(cb: dict[str, Any], changes: dict[str, Any]) -> dict[str, Any]:
    return {**cb, "envelope": {**(cb.get("envelope") or {}), **changes}}


def _bd_status(state: str) -> str:
    if state not in BD_STATUS:
        raise ArgumentError(f"state must be one of {tuple(BD_STATUS)}, not {state!r}")
    return BD_STATUS[state]


def _open_unblocked(record: TrackerRecord, records: dict[str, TrackerRecord]) -> bool:
    if record.lifecycle != "open" or "deferred" in record.envelope:
        return False
    for blocker_id in record.blocked_by:
        blocker = records.get(blocker_id)
        if blocker is None or blocker.lifecycle != "closed":
            return False
    return True


def _is_ready(record: TrackerRecord, records: dict[str, TrackerRecord]) -> bool:
    if not _open_unblocked(record, records):
        return False
    parent = records.get(record.parent) if record.parent else None
    if record.kind == "epic" and parent is not None:
        # An epic is ready when its program is open and unblocked.
        return _open_unblocked(parent, records)
    if record.kind == "slice" and parent is not None:
        # A slice is ready when its epic is not deferred. A PR never blocks a slice directly.
        return "deferred" not in parent.envelope
    return True


def _defer_date(record: TrackerRecord) -> str | None:
    if record.kind == "epic" and record.lifecycle == "open":
        value = record.envelope.get("deferred")
        return str(value) if value else None
    return None


def record_options(record: TrackerRecord) -> list[tuple[str, str | None]]:
    """The optional create flags of a record, in the recorded order. An unset field sends no flag."""
    return [
        ("--external-ref", record.external_ref),
        ("--description", record.description),
        ("--acceptance", record.acceptance_criteria),
        ("--design", record.design),
        ("--assignee", record.assignee),
        ("--defer", _defer_date(record)),
    ]


def row_extras(row: dict[str, Any], to_cb_id: dict[str, str], kind: str) -> dict[str, Any]:
    """The record fields that a bd row holds beside the cb block: the text fields and the tracks edges."""
    tracks = tuple(
        to_cb_id[dep["depends_on_id"]]
        for dep in row.get("dependencies") or []
        if kind == "pr" and dep.get("type") == "tracks" and dep["depends_on_id"] in to_cb_id
    )
    return {
        "title": row.get("title"),
        "description": row.get("description"),
        "acceptance_criteria": row.get("acceptance_criteria"),
        "design": row.get("design"),
        "tracks": tracks,
    }
