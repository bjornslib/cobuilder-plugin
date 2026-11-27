"""BdSim: plays bd 1.3.0 over rows that it keeps in memory. Not a test module.

The migration tests (E7-7) need a runner that answers a read after a write. A fixed transcript cannot do
that, and an interrupted run needs it. The sim keeps each call in `calls` and each write that took effect in
`applied`. It fails a call that bd 1.3.0 refuses: a repeated dependency, a repeated gate resolve, an unknown
type, an unknown flag. So a step that repeats itself fails the test. `fail_after=N` raises after N writes.
"""
from __future__ import annotations

import copy
import json
from typing import Any

import _beads_support as support

TYPES = {"feature", "epic", "task", "milestone", "bug", "chore", "gate"}
VALUE_FLAGS = {
    "--type": "issue_type", "--title": "title", "--description": "description", "--acceptance": "acceptance_criteria",
    "--design": "design", "--external-ref": "external_ref", "--status": "status",
}
READ_VERBS = support.READ_VERBS | {"export"}


def is_read(call: list[str]) -> bool:
    return call[0] in READ_VERBS or call[:2] in (["gate", "list"], ["config", "get"], ["dep", "list"], ["dep", "tree"])


def writes(calls: list[list[str]]) -> list[list[str]]:
    """The calls that change the tracker. A sync is not one of them."""
    return [call for call in calls if not is_read(call) and call[0] != "sync"]


def syncs(calls: list[list[str]]) -> int:
    return sum(1 for call in calls if call[0] == "sync")


class BdSim:
    def __init__(
        self, rows: list[dict[str, Any]], gates: dict[str, str] | None = None, types: list[str] | None = None, fail_after: int | None = None
    ) -> None:
        self.rows = copy.deepcopy(rows)
        self.gates = {gate: "open" for gate in (gates or {})}  # gate id -> open or closed
        self.types = list(types or [])  # the entries of types.custom
        self.fail_after = fail_after
        self.calls: list[list[str]] = []
        self.applied: list[list[str]] = []

    def reset_log(self) -> None:
        self.calls, self.applied = [], []

    def state(self) -> str:
        return json.dumps([sorted(self.rows, key=lambda row: row["id"]), self.gates, self.types], sort_keys=True)

    def _row(self, bd_id: str) -> dict[str, Any]:
        for row in self.rows:
            if row["id"] == bd_id:
                return row
        raise _refused(f"no issue {bd_id}")

    def run(self, args: list[str]) -> str:
        self.calls.append(list(args))
        verb, rest = args[0], args[1:]
        if verb == "list":
            ref = rest[rest.index("--external-ref") + 1] if "--external-ref" in rest else None
            return json.dumps([row for row in self.rows if ref is None or row.get("external_ref") == ref])
        if verb == "show":
            gate = {"id": rest[0], "status": self.gates.get(rest[0]), "issue_type": "gate", "await_id": "101"}
            return json.dumps([gate if rest[0] in self.gates else self._row(rest[0])])
        if args[:2] == ["gate", "list"]:
            open_gates = [{"id": gate, "status": "open", "await_id": "101", "issue_type": "gate"} for gate, s in self.gates.items() if s == "open"]
            return json.dumps(open_gates or None)
        if args[:3] == ["config", "get", "types.custom"]:
            value = ",".join(self.types)
            return json.dumps({"key": "types.custom", "value": value}) if "--json" in args else (value or "types.custom (not set)") + "\n"
        if verb == "sync":
            return ""
        if verb in ("update", "dep", "gate", "config", "defer"):
            if self.fail_after is not None and len(self.applied) >= self.fail_after:
                raise _refused("simulated interruption")
            getattr(self, f"_{verb}")(rest)
            self.applied.append(list(args))
            return ""
        raise AssertionError(f"unexpected bd call {args}")

    def _update(self, rest: list[str]) -> None:
        row, index = self._row(rest[0]), 1
        while index < len(rest):
            flag = rest[index]
            if flag not in VALUE_FLAGS and flag not in ("--add-label", "--defer", "--metadata"):
                raise AssertionError(f"unexpected update flag {flag} in {rest}")
            value = rest[index + 1]
            index += 2
            if flag == "--type" and value not in TYPES | set(self.types):
                raise _refused(f"validation failed: invalid issue type {value}")
            if flag == "--add-label":
                row["labels"] = [*row.get("labels", []), *([] if value in row.get("labels", []) else [value])]
            elif flag == "--defer":
                row["status"], row["defer_until"] = "deferred", value
            elif flag == "--metadata":
                row["metadata"] = {**(row.get("metadata") or {}), **json.loads(value)}
            else:
                row[VALUE_FLAGS[flag]] = value

    def _defer(self, rest: list[str]) -> None:
        self._update([rest[0], "--defer", rest[rest.index("--until") + 1]])

    def _dep(self, rest: list[str]) -> None:
        verb, target = rest[0], rest[2]
        issue = self._row(rest[1]) if any(row["id"] == rest[1] for row in self.rows) else None
        if verb == "rm":
            if issue is not None:
                issue["dependencies"] = [d for d in issue.get("dependencies", []) if d["depends_on_id"] != target]
            return
        kind = rest[rest.index("--type") + 1] if "--type" in rest else "blocks"
        edge = {"issue_id": rest[1], "depends_on_id": target, "type": kind}
        if issue is None or edge in issue.get("dependencies", []):
            raise _refused(f"cannot add dependency {rest}")
        issue["dependencies"] = [*issue.get("dependencies", []), edge]

    def _gate(self, rest: list[str]) -> None:
        if rest[0] != "resolve" or self.gates.get(rest[1]) != "open":
            raise _refused(f"cannot resolve gate {rest}")
        self.gates[rest[1]] = "closed"

    def _config(self, rest: list[str]) -> None:
        if rest[1] != "types.custom":
            raise AssertionError(f"unexpected config key {rest}")
        self.types = [entry for entry in (rest[2].split(",") if rest[0] == "set" else []) if entry]


def _refused(message: str) -> Exception:
    from tracker_port.bd_runner import BdError

    return BdError(f"bd refused: {message}", exit_code=1, stderr=message)
