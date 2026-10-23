"""The gh:pr gates of the beads adapter. One gate for each epic that a pull request blocks."""

from __future__ import annotations

import json
from typing import Any

from .bd_runner import gate_create_argv, gate_resolve_argv

GATE_LIST_ARGS = ["gate", "list", "--json"]


def create_gates(runner: Any, epic_bd_ids: list[str], number: str) -> list[str]:
    """Create one gate for each epic and return the gate ids in epic order."""
    return [json.loads(runner.run(gate_create_argv(epic, number)))["id"] for epic in epic_bd_ids]


def resolve_gates(runner: Any, stored_ids: list[str], number: str) -> None:
    """Resolve each stored open gate whose await_id is the PR number. A gate with no number stays pending."""
    if not stored_ids:
        return
    # bd 1.3.0 prints null, not [], when no gate is open.
    listed = json.loads(runner.run(GATE_LIST_ARGS) or "null") or []
    for gate in listed:
        if gate.get("id") in stored_ids and gate.get("status") == "open" and gate.get("await_id") == number:
            runner.run(gate_resolve_argv(gate["id"]))
