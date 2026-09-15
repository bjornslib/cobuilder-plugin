"""Tests for the Gate 2b group in plugins/implement/scripts/verify_gate.py.

Gate 2b is the conditional interaction-design gate. These tests prove the
script reports the four 2b keys, fails a present and unapproved line, treats
a missing line as n/a, passes a complete and approved design, names an absent
section, and leaves the two historical plans that pass today untouched.

Run with: uv run --with pytest pytest tests/test_verify_gate_2b.py -v
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
SCRIPT_DIR = REPO_ROOT / "plugins" / "implement" / "scripts"
sys.path.insert(0, str(SCRIPT_DIR))

import verify_gate as vg  # noqa: E402

INTERACTION_SECTIONS = """## 2. Information Architecture
x
### 2.3 Declared Defaults
x
### 3.2 Component States
x
### 3.3 Visibility Gating
x
### 4.1 Transition Table
x
### 4.2 Timing Tokens
x
### 11.2 Hit Targets
x
### 11.3 Scroll Ownership
x
"""

SLICES_ONE_EPIC = """# Slices: demo

| # | Epic | Slice | Ends with | Score | State |
|---|---|---|---|---|---|
| | **`demo/E1` — Epic one.** prose | | | | |
| 1 | `demo/E1` | only slice | ends | 1.00 | completed |
"""

STATUS_4_APPROVED = """# Status: demo

- Gate 1 — Product: APPROVED 2026-09-14
- Gate 2 — Architecture: APPROVED 2026-09-14
- Gate 3 — Program Design: APPROVED 2026-09-14
- Gate 4 — Slice plan, epic designs, and rubrics: APPROVED 2026-09-14
  - 4a Slice plan: APPROVED 2026-09-14
  - 4b Epic technical solution designs: APPROVED 2026-09-14
  - 4c Blind rubrics: APPROVED 2026-09-14
"""

LINE_2B_PENDING = "- Gate 2b — Interaction design: pending\n"
LINE_2B_APPROVED = "- Gate 2b — Interaction design: APPROVED 2026-09-14\n"

WITH_2B_KEYS = {
    "interaction.file",
    "interaction.sections",
    "ui_spec.file",
    "interaction.approved",
}

TWO_HISTORICAL_PLANS = ("cobuilder-family", "gate-doc-surfacing")


def make_plan(
    tmp_path: Path,
    status_text: str,
    interaction: str | None = None,
    ui_spec: bool = False,
) -> Path:
    """Build a plan that passes Gate 4, then add the requested 2b artifacts."""
    plan_dir = tmp_path / "docs" / "plans" / "demo"
    plan_dir.mkdir(parents=True)
    (plan_dir / "04-slices.md").write_text(SLICES_ONE_EPIC)
    (plan_dir / "00-status.md").write_text(status_text)
    rubrics_dir = tmp_path / ".cobuilder" / "rubrics" / "demo"
    rubrics_dir.mkdir(parents=True)
    (rubrics_dir / "slice-1.md").write_text("criteria\n")
    if interaction is not None:
        (plan_dir / "interaction-design.md").write_text(interaction)
    if ui_spec:
        (plan_dir / "ui-spec.jsonc").write_text("{}\n")
    return plan_dir


def run_main(plan_dir: Path, *extra: str) -> int | None:
    """Run verify_gate.main() with argv and return its exit code."""
    argv = sys.argv
    sys.argv = ["verify_gate.py", "--plan", str(plan_dir), *extra]
    try:
        try:
            vg.main()
        except SystemExit as exc:
            return exc.code
        return None
    finally:
        sys.argv = argv


def with_2b(status_text: str, line: str) -> str:
    """Insert a 2b line between the Gate 2 and Gate 3 lines."""
    return status_text.replace("- Gate 3 —", line + "- Gate 3 —")


# --- the group exists in both outputs ---


def test_2b_group_is_reported(tmp_path, capsys):
    plan_dir = make_plan(
        tmp_path,
        with_2b(STATUS_4_APPROVED, LINE_2B_APPROVED),
        interaction=INTERACTION_SECTIONS,
        ui_spec=True,
    )

    assert run_main(plan_dir) == 0
    out = capsys.readouterr().out
    assert "2b. Interaction design" in out
    for key in WITH_2B_KEYS:
        assert key in out

    assert run_main(plan_dir, "--json") == 0
    payload = json.loads(capsys.readouterr().out)
    assert set(payload["2b"]) == WITH_2B_KEYS


# --- a present and unapproved line fails ---


def test_pending_2b_line_fails(tmp_path, capsys):
    plan_dir = make_plan(
        tmp_path,
        with_2b(STATUS_4_APPROVED, LINE_2B_PENDING),
        interaction=INTERACTION_SECTIONS,
        ui_spec=True,
    )

    results = vg.check_2b(plan_dir, (plan_dir / "00-status.md").read_text())
    assert results["interaction.approved"] == "pending"
    assert not vg.all_ok(vg.flatten("2b.", results))

    assert run_main(plan_dir) == 1


# --- a missing line means n/a, and the plan still passes ---


def _missing_2b_line_reports_na(tmp_path, capsys):
    plan_dir = make_plan(tmp_path, STATUS_4_APPROVED)

    results = vg.check_2b(plan_dir, (plan_dir / "00-status.md").read_text())
    assert set(results.values()) == {"n/a"}
    assert vg.all_ok(vg.flatten("2b.", results))

    assert run_main(plan_dir) == 0


# The design document names this test `test_missing_2b_line_is_n/a`. A slash
# is not legal in a Python function name, so the check lives in the function
# above and this module binds it under the documented name. pytest reports
# the node as `test_missing_2b_line_is_n/a`.
globals()["test_missing_2b_line_is_n/a"] = _missing_2b_line_reports_na


# --- a complete and approved design passes ---


def test_approved_2b_line_passes(tmp_path, capsys):
    plan_dir = make_plan(
        tmp_path,
        with_2b(STATUS_4_APPROVED, LINE_2B_APPROVED),
        interaction=INTERACTION_SECTIONS,
        ui_spec=True,
    )

    results = vg.check_2b(plan_dir, (plan_dir / "00-status.md").read_text())
    assert results == {
        "interaction.file": "ok",
        "interaction.sections": "ok",
        "ui_spec.file": "ok",
        "interaction.approved": "ok",
    }

    assert run_main(plan_dir) == 0


# --- an absent section is named and fails ---


def test_approved_2b_line_fails_when_a_section_is_absent(tmp_path, capsys):
    absent_heading = "### 11.3 Scroll Ownership"
    incomplete = INTERACTION_SECTIONS.replace(absent_heading + "\nx\n", "")
    plan_dir = make_plan(
        tmp_path,
        with_2b(STATUS_4_APPROVED, LINE_2B_APPROVED),
        interaction=incomplete,
        ui_spec=True,
    )

    results = vg.check_2b(plan_dir, (plan_dir / "00-status.md").read_text())
    assert results["interaction.sections"].startswith("incomplete:")
    assert absent_heading in results["interaction.sections"]

    assert run_main(plan_dir) == 1
    assert absent_heading in capsys.readouterr().out


# --- the historical plans keep passing ---


def test_historical_plans_still_pass(capsys):
    for slug in TWO_HISTORICAL_PLANS:
        plan_dir = REPO_ROOT / "docs" / "plans" / slug
        assert run_main(plan_dir) == 0, f"{slug} must still exit 0"
        assert "Overall: OK" in capsys.readouterr().out
