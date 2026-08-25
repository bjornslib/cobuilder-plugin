"""Append-only ledger for the reply channel.

The ledger is a line-delimited JSON file. Every operation is an append.
The projection (threads-state.json) is derived from the ledger and
rebuilt on demand — never edited in place.

Line shapes:
- Root comment:   {"type":"comment","ulid":"...","thread_ulid":"...","anchor":{...},"text":"...","author":"human","ts":"..."}
- Agent reply:    {"type":"reply","ulid":"...","thread_ulid":"...","text":"...","author":"agent","ts":"..."}
- State change:   {"type":"state","thread_ulid":"...","state":"open|resolved","by":"human|agent","ts":"..."}
"""

from __future__ import annotations

import json
import os
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any

def _load_ulid_factory():
    """Return a callable that makes a 26-character sortable ULID string.

    Import the real dependency and verify it works before trusting it.
    `ulid-py` exposes `ulid.new()`, a function that returns an object with
    a `.str` attribute. A prior bug imported `ulid.ulid` instead, which
    binds a submodule, not a function. That import succeeds, so it never
    fell through to the fallback. It failed only later, at call time, with
    "'module' object is not callable". Probe the real call here so a wrong
    binding degrades to the fallback instead of raising in production.
    """
    try:
        import ulid as _ulid_module

        candidate = _ulid_module.new
        if not callable(candidate):
            raise TypeError("ulid.new is not callable")
        probe = candidate()
        probe_str = getattr(probe, "str", None)
        if not isinstance(probe_str, str) or len(probe_str) != 26:
            raise TypeError("ulid.new() did not return a usable ULID")

        def _factory() -> str:
            return candidate().str

        return _factory
    except Exception:
        import base64
        import uuid

        def _factory() -> str:
            # ULID-compatible: 26 chars, Crockford base32, but NOT
            # time-sortable. Only used when ulid-py is missing or broken.
            return base64.b32encode(uuid.uuid4().bytes).decode().lower().rstrip("=")

        return _factory


_ulid = _load_ulid_factory()


LEDGER_FILENAME = "feedback-ledger.jsonl"
PROJECTION_FILENAME = "threads-state.json"


@dataclass(frozen=True)
class LedgerPaths:
    bundle_dir: Path

    @property
    def ledger(self) -> Path:
        return self.bundle_dir / LEDGER_FILENAME

    @property
    def projection(self) -> Path:
        return self.bundle_dir / PROJECTION_FILENAME


def _now_iso() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def append_line(path: Path, obj: dict[str, Any]) -> None:
    """Append one JSON line to the ledger. Never rewrites existing lines."""
    path.parent.mkdir(parents=True, exist_ok=True)
    line = json.dumps(obj, ensure_ascii=False, separators=(",", ":"))
    with path.open("a", encoding="utf-8") as f:
        f.write(line + "\n")


def read_ledger(path: Path) -> list[dict[str, Any]]:
    """Read all lines from the ledger. Returns empty list if file missing."""
    if not path.exists():
        return []
    lines = path.read_text(encoding="utf-8").splitlines()
    return [json.loads(line) for line in lines if line.strip()]


def fold_threads(lines: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    """Fold ledger lines into thread objects.

    Each thread has:
    - root: the first comment line (type="comment" with thread_ulid == ulid)
    - replies: list of reply lines in append order
    - state_changes: list of state lines in append order
    - current_state: "open" or "resolved" (from last state change, or "open" default)
    - updated_by: author of last state change (or root author)
    - updated_at: timestamp of last state change (or root ts)
    - offset: the index of the last line processed (for incremental reads)
    """
    threads: dict[str, dict[str, Any]] = {}

    for idx, line in enumerate(lines):
        t = line.get("type")
        if t == "comment":
            thread_ulid = line.get("thread_ulid") or line.get("ulid")
            if not thread_ulid:
                continue
            threads[thread_ulid] = {
                "root": line,
                "replies": [],
                "state_changes": [],
                "current_state": "open",
                "updated_by": line.get("author", "human"),
                "updated_at": line.get("ts", _now_iso()),
                "reply_count": 0,
                "offset": idx,
            }
        elif t == "reply":
            thread_ulid = line.get("thread_ulid")
            if not thread_ulid or thread_ulid not in threads:
                continue
            threads[thread_ulid]["replies"].append(line)
            threads[thread_ulid]["reply_count"] = len(threads[thread_ulid]["replies"])
            threads[thread_ulid]["offset"] = idx
        elif t == "state":
            thread_ulid = line.get("thread_ulid")
            if not thread_ulid or thread_ulid not in threads:
                continue
            threads[thread_ulid]["state_changes"].append(line)
            threads[thread_ulid]["current_state"] = line.get("state", "open")
            threads[thread_ulid]["updated_by"] = line.get("by", "human")
            threads[thread_ulid]["updated_at"] = line.get("ts", _now_iso())
            threads[thread_ulid]["offset"] = idx

    return threads


def project_threads(lines: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    """Build the projection: one lookup per thread with current state + history."""
    folded = fold_threads(lines)
    projection = {}
    for thread_ulid, t in folded.items():
        root = t["root"]
        projection[thread_ulid] = {
            "thread_ulid": thread_ulid,
            "anchor": root.get("anchor", {}),
            "text": root.get("text", ""),
            "author": root.get("author", "human"),
            "created_at": root.get("ts", _now_iso()),
            "current_state": t["current_state"],
            "updated_by": t["updated_by"],
            "updated_at": t["updated_at"],
            "reply_count": t["reply_count"],
            "replies": t["replies"],
            "state_changes": t["state_changes"],
            "offset": t["offset"],
        }
    return projection


def write_projection(path: Path, projection: dict[str, dict[str, Any]]) -> None:
    """Write the projection as a JSON object. Full rebuild every time."""
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(projection, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def load_projection(path: Path) -> dict[str, dict[str, Any]]:
    """Load the projection, or return empty dict if missing/corrupt."""
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return {}


def append_comment(
    paths: LedgerPaths,
    anchor: dict[str, Any],
    text: str,
    author: str = "human",
) -> str:
    """Append a root comment and return its ULID."""
    ulid_val = _ulid()
    line = {
        "type": "comment",
        "ulid": ulid_val,
        "thread_ulid": ulid_val,
        "anchor": anchor,
        "text": text,
        "author": author,
        "ts": _now_iso(),
    }
    append_line(paths.ledger, line)
    # Rebuild projection
    lines = read_ledger(paths.ledger)
    write_projection(paths.projection, project_threads(lines))
    return ulid_val


def append_reply(
    paths: LedgerPaths,
    thread_ulid: str,
    text: str,
    author: str = "agent",
) -> str:
    """Append an agent reply to an existing thread."""
    ulid_val = _ulid()
    line = {
        "type": "reply",
        "ulid": ulid_val,
        "thread_ulid": thread_ulid,
        "text": text,
        "author": author,
        "ts": _now_iso(),
    }
    append_line(paths.ledger, line)
    lines = read_ledger(paths.ledger)
    write_projection(paths.projection, project_threads(lines))
    return ulid_val


def append_state(
    paths: LedgerPaths,
    thread_ulid: str,
    state: str,
    by: str = "human",
) -> str:
    """Append a state change for a thread."""
    ulid_val = _ulid()
    line = {
        "type": "state",
        "ulid": ulid_val,
        "thread_ulid": thread_ulid,
        "state": state,
        "by": by,
        "ts": _now_iso(),
    }
    append_line(paths.ledger, line)
    lines = read_ledger(paths.ledger)
    write_projection(paths.projection, project_threads(lines))
    return ulid_val


def get_thread(paths: LedgerPaths, thread_ulid: str) -> dict[str, Any] | None:
    """Get a single thread from the projection (one lookup)."""
    proj = load_projection(paths.projection)
    return proj.get(thread_ulid)


def get_all_threads(paths: LedgerPaths) -> dict[str, dict[str, Any]]:
    """Get all threads from the projection."""
    return load_projection(paths.projection)


def rebuild_projection(paths: LedgerPaths) -> dict[str, dict[str, Any]]:
    """Rebuild the projection from the ledger. Disposable projection pattern."""
    lines = read_ledger(paths.ledger)
    proj = project_threads(lines)
    write_projection(paths.projection, proj)
    return proj


# ---- watch command support ----

def watch_feedback(
    ledger_path: Path,
    since_offset: int = 0,
    timeout_seconds: float = 30.0,
) -> tuple[list[dict[str, Any]], int]:
    """Block until new lines appear after `since_offset`.

    Returns (new_lines, new_offset). If timeout expires with no new lines,
    returns ([], since_offset). Exit codes: 0 = new lines, 2 = timeout.
    First returns any existing lines at or after since_offset, then blocks
    for newly appended lines.
    """
    import select
    start = time.time()
    # First, return any existing lines at or after since_offset
    if ledger_path.exists():
        lines = read_ledger(ledger_path)
        if len(lines) > since_offset:
            new_lines = lines[since_offset:]
            return new_lines, len(lines)
    # Then block for new lines
    while True:
        if ledger_path.exists():
            lines = read_ledger(ledger_path)
            if len(lines) > since_offset:
                new_lines = lines[since_offset:]
                return new_lines, len(lines)
        elapsed = time.time() - start
        if elapsed >= timeout_seconds:
            return [], since_offset
        # Wait for file change using select on the file descriptor
        try:
            fd = os.open(ledger_path, os.O_RDONLY)
            # Use select with a short timeout to avoid busy-waiting
            r, _, _ = select.select([fd], [], [], min(0.5, timeout_seconds - elapsed))
            os.close(fd)
            if r:
                continue
        except OSError:
            time.sleep(0.1)