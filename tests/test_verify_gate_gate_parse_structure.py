"""Structure contract: verify_gate parses gate lines only through shared/gate_status.py.

Reads the module with ast. Checks names and calls, not wording.
"""
from __future__ import annotations

import ast
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
VERIFY_GATE = REPO_ROOT / "plugins" / "implement" / "scripts" / "verify_gate.py"


def _tree() -> ast.Module:
    return ast.parse(VERIFY_GATE.read_text(encoding="utf-8"))


def test_verify_gate_defines_no_module_level_gate_regex():
    """Fails today: verify_gate.py defines STATUS_2B_RE and STATUS_GATE_RE itself."""
    module_names: set[str] = set()
    for node in _tree().body:
        if isinstance(node, ast.Assign):
            module_names.update(t.id for t in node.targets if isinstance(t, ast.Name))
    assert "STATUS_2B_RE" not in module_names
    assert "STATUS_GATE_RE" not in module_names


def test_verify_gate_parses_gates_through_gate_status():
    """Fails today: verify_gate.py never calls gate_status.parse_status_gates or gate_status.approved_date."""
    called: set[str] = set()
    for node in ast.walk(_tree()):
        if (
            isinstance(node, ast.Call)
            and isinstance(node.func, ast.Attribute)
            and isinstance(node.func.value, ast.Name)
            and node.func.value.id == "gate_status"
        ):
            called.add(node.func.attr)
    assert {"parse_status_gates", "approved_date"} <= called
