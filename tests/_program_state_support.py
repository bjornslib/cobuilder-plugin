"""Shared helpers for the program-state tests. Not a test module.

The corpus holds program `demo` with three open epics: demo-E1, demo-E2, demo-E3.
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any


def program_lifecycle(adapter: Any, program: str = "demo") -> str:
    return {r.id: r for r in adapter.list_programs()}[program].lifecycle


def set_states(adapter: Any, **states: str) -> None:
    for epic, state in states.items():
        adapter.set_epic_state(epic.replace("_", "-"), state)


def add_epics(corpus: Path, *extra: dict[str, Any]) -> None:
    """Append epic records to the corpus copy."""
    path = corpus / "epics.json"
    epics = json.loads(path.read_text(encoding="utf-8"))
    for record in extra:
        epics.append({
            "kind": "epic", "blocked_by": [], "lifecycle": "open", "assignee": None,
            "envelope": {}, "external_ref": None, **record,
        })
    path.write_text(json.dumps(epics), encoding="utf-8")


def bd_id(adapter: Any, cb_id: str) -> str:
    return next(row["id"] for row in adapter._rows() if row["metadata"]["cb"]["id"] == cb_id)


def status_updates(runner: Any, target: str) -> list[list[str]]:
    """The bd update calls that set a status on the bd issue `target`."""
    return [c for c in runner.calls if c[0] == "update" and c[1] == target and "--status" in c]
