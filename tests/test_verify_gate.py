"""Tests for plugins/implement/scripts/verify_gate.py.

Covers the Gate 4b hole: six epics shipped in the cobuilder-family feature
with no epic-<epic-id>-design.md, and nothing mechanical caught it. These
tests prove verify_gate.py catches a missing, incomplete, or unapproved
Gate 4b design, and stays quiet for a single-slice epic and for the real
docs/plans/cobuilder-family/00-status.md format.

Run with: uv run --with pytest pytest tests/ -v
"""
from __future__ import annotations

import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
SCRIPT_DIR = REPO_ROOT / "plugins" / "implement" / "scripts"
sys.path.insert(0, str(SCRIPT_DIR))

import verify_gate as vg  # noqa: E402

SIX_SECTIONS = """## Scope and Intent
x
## Files Touched
x
## Types & Signatures
x
## Slice Decomposition
x
## Test Plan
x
## Risks & Open Questions
x
"""

SLICES_TWO_EPICS = """# Slices: demo

| # | Epic | Slice | Ends with | Score | State |
|---|---|---|---|---|---|
| | **`demo/E1` — Epic one.** prose | | | | |
| 1 | `demo/E1` | first slice | ends | 1.00 | completed |
| 2 | `demo/E1` | second slice | ends | 1.00 | completed |
| | **`demo/E2` — Epic two.** prose | | | | |
| 3 | `demo/E2` | only slice | ends | 1.00 | completed |
"""

STATUS_4B_APPROVED = """# Status: demo

- Gate 4 — Slice plan, epic designs, and rubrics: APPROVED 2026-08-24
  - 4a Slice plan: APPROVED 2026-08-24
  - 4b Epic technical solution designs: APPROVED 2026-08-24
  - 4c Blind rubrics: APPROVED 2026-08-24
"""

STATUS_4B_PENDING = """# Status: demo

- Gate 4 — Slice plan, epic designs, and rubrics: in progress
  - 4a Slice plan: APPROVED 2026-08-24
  - 4b Epic technical solution designs: pending
  - 4c Blind rubrics: APPROVED 2026-08-24
"""


def make_plan(tmp_path: Path, slices_text: str, status_text: str | None = None) -> Path:
    plan_dir = tmp_path / "docs" / "plans" / "demo"
    plan_dir.mkdir(parents=True)
    (plan_dir / "04-slices.md").write_text(slices_text)
    if status_text is not None:
        (plan_dir / "00-status.md").write_text(status_text)
    return plan_dir


def make_rubrics(tmp_path: Path, numbers: list[int]) -> Path:
    rubrics_dir = tmp_path / ".cobuilder" / "rubrics" / "demo"
    rubrics_dir.mkdir(parents=True)
    for n in numbers:
        (rubrics_dir / f"slice-{n}.md").write_text("criteria\n")
    return rubrics_dir


# --- parsing ---


def test_parse_slices_finds_epic_header_and_rows():
    slices, _ = vg.parse_slices(SLICES_TWO_EPICS)
    assert [s["n"] for s in slices] == [1, 2, 3]
    assert slices[0]["epic_id"] == "demo/E1"
    assert slices[2]["epic_id"] == "demo/E2"


def test_epics_with_multiple_slices_excludes_single_slice_epic():
    slices, _ = vg.parse_slices(SLICES_TWO_EPICS)
    assert vg.epics_with_multiple_slices(slices) == ["demo/E1"]


# --- 4b: missing design ---


def test_missing_epic_design_fails_and_names_4b(tmp_path):
    plan_dir = make_plan(tmp_path, SLICES_TWO_EPICS, STATUS_4B_PENDING)
    make_rubrics(tmp_path, [1, 2, 3])

    a_results, slices = vg.check_4a(plan_dir)
    status_text = (plan_dir / "00-status.md").read_text()
    b_results = vg.check_4b(plan_dir, slices, status_text)

    assert "demo/E1" in b_results
    assert b_results["demo/E1"]["design.file"] == "missing"
    assert not vg.is_ok(b_results["demo/E1"]["design.file"])
    # A single-slice epic never appears in the 4b report.
    assert "demo/E2" not in b_results


# --- 4b: present, complete, approved -> pass ---


def test_complete_approved_design_passes(tmp_path):
    plan_dir = make_plan(tmp_path, SLICES_TWO_EPICS, STATUS_4B_APPROVED)
    (plan_dir / "epic-E1-design.md").write_text("# Epic Technical Solution Design: E1\n\n" + SIX_SECTIONS)
    make_rubrics(tmp_path, [1, 2, 3])

    _, slices = vg.check_4a(plan_dir)
    status_text = (plan_dir / "00-status.md").read_text()
    b_results = vg.check_4b(plan_dir, slices, status_text)

    assert b_results["demo/E1"]["design.file"] == "ok"
    assert b_results["demo/E1"]["design.sections"] == "ok"
    assert b_results["demo/E1"]["design.approved"] == "ok"
    assert vg.all_ok(vg.flatten("4b.", b_results))


def test_single_slice_epic_needs_no_design(tmp_path):
    plan_dir = make_plan(tmp_path, SLICES_TWO_EPICS, STATUS_4B_APPROVED)
    (plan_dir / "epic-E1-design.md").write_text("# Epic Technical Solution Design: E1\n\n" + SIX_SECTIONS)
    make_rubrics(tmp_path, [1, 2, 3])

    _, slices = vg.check_4a(plan_dir)
    status_text = (plan_dir / "00-status.md").read_text()
    b_results = vg.check_4b(plan_dir, slices, status_text)

    assert "demo/E2" not in b_results


# --- 4b: present but incomplete, reported distinctly from missing ---


def test_incomplete_design_reported_distinctly_from_missing(tmp_path):
    plan_dir = make_plan(tmp_path, SLICES_TWO_EPICS, STATUS_4B_APPROVED)
    incomplete = SIX_SECTIONS.replace("## Risks & Open Questions\nx\n", "")
    (plan_dir / "epic-E1-design.md").write_text("# Epic Technical Solution Design: E1\n\n" + incomplete)
    make_rubrics(tmp_path, [1, 2, 3])

    _, slices = vg.check_4a(plan_dir)
    status_text = (plan_dir / "00-status.md").read_text()
    b_results = vg.check_4b(plan_dir, slices, status_text)

    assert b_results["demo/E1"]["design.file"] == "ok"
    assert b_results["demo/E1"]["design.sections"].startswith("incomplete:")
    assert "## Risks & Open Questions" in b_results["demo/E1"]["design.sections"]
    assert b_results["demo/E1"]["design.sections"] != "missing"


def test_missing_design_and_incomplete_design_are_distinct_statuses(tmp_path):
    assert vg.check_design_sections("") != "missing"  # empty file: incomplete, not absent
    assert "missing" not in vg.check_design_sections("")


# --- 4b: approval gate ---


def test_unapproved_design_is_pending_even_if_file_complete(tmp_path):
    plan_dir = make_plan(tmp_path, SLICES_TWO_EPICS, STATUS_4B_PENDING)
    (plan_dir / "epic-E1-design.md").write_text("# Epic Technical Solution Design: E1\n\n" + SIX_SECTIONS)

    _, slices = vg.check_4a(plan_dir)
    status_text = (plan_dir / "00-status.md").read_text()
    b_results = vg.check_4b(plan_dir, slices, status_text)

    assert b_results["demo/E1"]["design.file"] == "ok"
    assert b_results["demo/E1"]["design.sections"] == "ok"
    assert b_results["demo/E1"]["design.approved"] == "pending"
    assert not vg.all_ok(vg.flatten("4b.", b_results))


# --- end-to-end exit codes ---


def test_full_pass_case_exits_zero(tmp_path, capsys):
    plan_dir = make_plan(tmp_path, SLICES_TWO_EPICS, STATUS_4B_APPROVED)
    (plan_dir / "epic-E1-design.md").write_text("# Epic Technical Solution Design: E1\n\n" + SIX_SECTIONS)
    make_rubrics(tmp_path, [1, 2, 3])

    argv = sys.argv
    sys.argv = ["verify_gate.py", "--plan", str(plan_dir)]
    try:
        try:
            vg.main()
        except SystemExit as exc:
            assert exc.code == 0
        else:
            raise AssertionError("verify_gate.main() did not call sys.exit")
    finally:
        sys.argv = argv


def test_full_fail_case_exits_nonzero_and_names_epic(tmp_path, capsys):
    plan_dir = make_plan(tmp_path, SLICES_TWO_EPICS, STATUS_4B_PENDING)
    make_rubrics(tmp_path, [1, 2, 3])

    argv = sys.argv
    sys.argv = ["verify_gate.py", "--plan", str(plan_dir)]
    try:
        try:
            vg.main()
        except SystemExit as exc:
            assert exc.code == 1
        else:
            raise AssertionError("verify_gate.main() did not call sys.exit")
    finally:
        sys.argv = argv

    out = capsys.readouterr().out
    assert "demo/E1" in out
    assert "demo/E2" not in out


# --- the real plan, and the new 00-status.md sub-step format ---


def test_real_cobuilder_family_status_file_parses_new_sub_step_format():
    # The real status line must parse under STATUS_4B_RE, whatever state it
    # currently records. A parse failure is the real regression risk here,
    # not a change of state from pending to approved.
    status_path = REPO_ROOT / "docs" / "plans" / "cobuilder-family" / "00-status.md"
    status_text = status_path.read_text()
    assert vg.check_4b_approved(status_text) in {"ok", "pending", "n/a"}
    assert "4a" in status_text and "APPROVED" in status_text
    assert "4c" in status_text and "APPROVED" in status_text


def test_real_cobuilder_family_plan_gate_4b_shape_and_consistency():
    # check_4b's contract holds independent of whether Gate 4b is currently
    # satisfied: one entry per multi-slice epic, each with the three keys,
    # and all_ok tracks design-file presence exactly.
    plan_dir = REPO_ROOT / "docs" / "plans" / "cobuilder-family"
    a_results, slices = vg.check_4a(plan_dir)
    assert a_results["slices.file"] == "ok"
    status_text = (plan_dir / "00-status.md").read_text()
    b_results = vg.check_4b(plan_dir, slices, status_text)

    multi_slice_epics = vg.epics_with_multiple_slices(slices)
    assert set(b_results.keys()) == set(multi_slice_epics)
    for epic_id, entry in b_results.items():
        assert set(entry.keys()) == {"design.file", "design.sections", "design.approved"}, epic_id

    flat = vg.flatten("4b.", b_results)
    designs_present = all(entry["design.file"] == "ok" for entry in b_results.values())
    sections_ok = all(entry["design.sections"] == "ok" for entry in b_results.values())
    approved = vg.check_4b_approved(status_text) == "ok"
    if designs_present and sections_ok and approved:
        assert vg.all_ok(flat)
    if any(entry["design.file"] == "missing" for entry in b_results.values()):
        assert not vg.all_ok(flat)


def test_status_4b_re_accepts_a_retrospective_qualifier_after_approved():
    # STATUS_4B_RE and check_4b_approved must never let a trailing
    # qualifier, such as "(retrospective ...)", silently downgrade an
    # APPROVED line to pending. This pins the anti-back-dating intent at
    # the level of the parser, not at the level of one plan's transient
    # state.
    pending_text = "- 4b Epic technical solution designs: pending\n"
    approved_text = "- 4b Epic technical solution designs: APPROVED 2026-08-24\n"
    approved_retro_text = (
        "- 4b Epic technical solution designs: APPROVED 2026-08-25 "
        "(retrospective — designs written after the slices completed)\n"
    )

    assert vg.check_4b_approved(pending_text) == "pending"
    assert vg.check_4b_approved(approved_text) == "ok"
    assert vg.check_4b_approved(approved_retro_text) == "ok"
