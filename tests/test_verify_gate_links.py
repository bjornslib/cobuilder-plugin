"""Tests for the viewer-link check in plugins/implement/scripts/verify_gate.py.

ADR-0032, amendment of 2026-09-28: a gate line approved on or after
2026-09-28 must carry a viewer link on its own `view:` line directly under
the gate line, indented. The gate line reads `- Gate N — <name>:
APPROVED <date>` and the view line under it reads `view: <url>`.
verify_gate.py reports `links.gate.<n>` as `ok`, `n/a`, or `missing`.

Run with: uv run pytest tests/test_verify_gate_links.py -v
"""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
SCRIPT = REPO_ROOT / "plugins" / "implement" / "scripts" / "verify_gate.py"

URL = "http://localhost:8765/viewer/index.html#/demo/build/plan/product"

# One single-slice epic: Gate 4b is not required, so only the link check can fail.
SLICES = """# Slices: demo

| # | Epic | Slice | Ends with | Score | State |
|---|---|---|---|---|---|
| | **`demo/E1` — Epic one.** prose | | | | |
| 1 | `demo/E1` | only slice | ends | — | pending |
"""


def status(gate1_block: str) -> str:
    return f"""# Status: demo

{gate1_block}
- Gate 4 — Slice plan, epic designs, and rubrics: APPROVED 2026-09-01
  - 4a Slice plan: APPROVED 2026-09-01
  - 4b Epic technical solution designs: n/a (no epic carries more than one slice)
  - 4c Blind rubrics: APPROVED 2026-09-01
"""


def make_plan(tmp_path: Path, gate1_block: str) -> tuple[Path, Path]:
    plan = tmp_path / "docs" / "plans" / "demo"
    plan.mkdir(parents=True)
    (plan / "04-slices.md").write_text(SLICES)
    (plan / "00-status.md").write_text(status(gate1_block))
    rubrics = tmp_path / "rubrics" / "demo"
    rubrics.mkdir(parents=True)
    (rubrics / "slice-1.md").write_text("criteria\n")
    return plan, rubrics


def run(plan: Path, rubrics: Path, *extra: str) -> subprocess.CompletedProcess:
    return subprocess.run(
        [sys.executable, str(SCRIPT), "--plan", str(plan), "--rubrics-dir", str(rubrics), *extra],
        capture_output=True,
        text=True,
    )


def links_of(proc: subprocess.CompletedProcess) -> dict:
    payload = json.loads(proc.stdout)
    assert "links" in payload, f"no 'links' key in --json output: {sorted(payload)}"
    return payload["links"]


def test_on_adr_date_without_link_fails_and_names_the_gate(tmp_path):
    plan, rubrics = make_plan(tmp_path, "- Gate 1 — Product: APPROVED 2026-09-28")
    proc = run(plan, rubrics)
    assert proc.returncode == 1, proc.stdout + proc.stderr
    assert "Gate 1" in proc.stdout + proc.stderr
    links = links_of(run(plan, rubrics, "--json"))
    assert links.get("gate.1") == "missing", links


def test_after_adr_date_without_link_fails(tmp_path):
    plan, rubrics = make_plan(tmp_path, "- Gate 1 — Product: APPROVED 2026-10-02")
    proc = run(plan, rubrics, "--json")
    assert proc.returncode == 1
    assert links_of(proc).get("gate.1") == "missing"


def test_on_adr_date_with_view_line_passes(tmp_path):
    block = (
        "- Gate 1 — Product: APPROVED 2026-09-28\n"
        f"  view: {URL}\n"
    )
    plan, rubrics = make_plan(tmp_path, block)
    proc = run(plan, rubrics, "--json")
    assert proc.returncode == 0, proc.stdout + proc.stderr
    assert links_of(proc).get("gate.1") == "ok"


def test_view_line_must_sit_directly_under_the_gate_line(tmp_path):
    # A blank line between the gate line and the view line ends the block,
    # so the gate reads as carrying no link.
    block = (
        "- Gate 1 — Product: APPROVED 2026-09-28\n"
        "\n"
        f"  view: {URL}\n"
    )
    plan, rubrics = make_plan(tmp_path, block)
    proc = run(plan, rubrics, "--json")
    assert proc.returncode == 1
    assert links_of(proc).get("gate.1") == "missing"


def test_before_adr_date_without_link_passes(tmp_path):
    plan, rubrics = make_plan(tmp_path, "- Gate 1 — Product: APPROVED 2026-09-27")
    proc = run(plan, rubrics, "--json")
    assert proc.returncode == 0, proc.stdout + proc.stderr
    assert links_of(proc).get("gate.1") == "n/a"


def test_review_link_plan_passes_with_links():
    plan = REPO_ROOT / "docs" / "plans" / "review-link"
    proc = subprocess.run(
        [sys.executable, str(SCRIPT), "--plan", str(plan), "--json"],
        capture_output=True,
        text=True,
    )
    assert proc.returncode == 0, proc.stdout + proc.stderr
    links = links_of(proc)
    assert links, "the review-link plan has dated gate lines, so links must not be empty"
    assert all(v in ("ok", "n/a") for v in links.values()), links
