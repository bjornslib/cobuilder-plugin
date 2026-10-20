"""Pure helpers of the beads adapter: the metadata.cb block, the bd arguments, and the ready rule."""

from __future__ import annotations

import json
import re
from typing import Any

from .port import AdapterError, ArgumentError
from .record import TrackerRecord

CB_VERSION = 1
KINDS = ("program", "epic", "slice", "pr")
READY_KINDS = ("program", "epic", "slice")
STATUS_MAP = {"open": "open", "in_progress": "in_progress", "hooked": "in_progress", "closed": "closed"}
BD_STATUS = {"open": "open", "in_progress": "in_progress", "closed": "closed"}
BD_TYPE = {"program": "program", "epic": "epic", "slice": "task", "pr": "task"}
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
    parent: str | None = None,
    external_ref: str | None = None,
    assignee: str | None = None,
    status: str | None = None,
) -> list[str]:
    # The block id is the title. The block kind sets the bd type and the priority.
    # The flag order matches the recorded bd transcripts. Replays compare the whole argument list.
    kind = block["kind"]
    argv = ["create", "--silent"]
    if parent is not None:
        argv += ["--parent", parent]
    argv += ["--type", BD_TYPE[kind], "--title", block["id"], "--priority", BD_PRIORITY[kind]]
    if status is not None:
        argv += ["--status", status]
    if external_ref is not None:
        argv += ["--external-ref", external_ref]
    if assignee is not None:
        argv += ["--assignee", assignee]
    argv += ["--metadata", _metadata_arg(block)]
    return argv


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
