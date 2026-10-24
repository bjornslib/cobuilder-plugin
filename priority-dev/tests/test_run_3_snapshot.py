from __future__ import annotations

import json
import subprocess

from brief_support import FIXTURES, PLANTED, PRIORITY_DEV, SNAPSHOTS, brief_api


def test_run_3_cli_snapshot_and_redaction_count():
    fixture = PRIORITY_DEV / "fixtures" / "run-3.jsonl"
    snapshot = json.loads((SNAPSHOTS / "run-3-stop-2.json").read_text())

    brief = brief_api().build_brief(fixture, stop=2)
    assert getattr(brief, "redactions", None) == 2

    result = subprocess.run(
        ["uv", "run", "priority", "brief", "fixtures/run-3.jsonl", "--stop", "2"],
        cwd=PRIORITY_DEV,
        capture_output=True,
        text=True,
        check=False,
    )
    assert result.returncode == 0
    assert result.stdout.strip() == snapshot["brief"].strip()
    assert result.stdout.count("[redacted]") == 2
    assert PLANTED["tool_input"] not in result.stdout
    assert PLANTED["final"] not in result.stdout
