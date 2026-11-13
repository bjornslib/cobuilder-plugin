"""Tests for the agent-use check, plugins/implement/scripts/agent_use.py.

Slice 6 of structure-coaching/E3. The check reads one effect that shows the
agents ran a slice. The effect is the newest VALIDATE attempt file of the
slice: .cobuilder/rubrics/<slug>/evidence/slice-<N>-attempt-<M>.md. The check
passes for a PASS at or above the accept threshold of manifest.yaml, and for
an ESCALATION. It fails, with a reason, in every other case.

verify_gate.py --plan <dir> --slice <N> runs only this check. It prints ok or
the reason, and it exits 0 or 1.

Run with: uv run pytest tests/test_agent_use.py -q
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent
SCRIPTS_DIR = REPO_ROOT / "plugins" / "implement" / "scripts"
sys.path.insert(0, str(SCRIPTS_DIR))
AGENT_USE_PATH = SCRIPTS_DIR / "agent_use.py"
VERIFY_GATE_PATH = SCRIPTS_DIR / "verify_gate.py"
SLICE_LOOP_JS = REPO_ROOT / "plugins" / "implement" / "skills" / "build" / "workflows" / "slice-loop.js"

SLUG = "demo"
# 20 criteria give averages in steps of 0.05, so every score in this file is reachable.
CRITERIA = 20
# Attempt M gets the mtime MTIME_BASE + M, so the newest file also has the latest mtime.
MTIME_BASE = 1_700_000_000
VOCABULARY_BLOCK = (
    "\n### Vocabulary\n\nVerdict: CLEAN\n\nNo AVOID, UNDEFINED, or CONFLICT findings.\n"
)

# The table gate fails on this layout on purpose. Epic demo/E1 carries four slices
# with no design, and no rubric file exists. So each --slice test also shows that
# the check runs alone.
SLICES_MD = """# Slices: demo

| # | Epic | Slice | Ends with | Score | State |
|---|---|---|---|---|---|
| | **`demo/E1` — Epic one.** prose | | | | |
| 1 | `demo/E1` | first slice | ends | — | completed |
| 6 | `demo/E1` | the agent-use check | ends | — | pending |
| 7 | `demo/E1` | next slice | ends | — | pending |
| 10 | `demo/E1` | later slice | ends | — | pending |
"""

# Each epic carries one slice, so no Gate 4b design is needed.
SINGLE_SLICE_EPICS_MD = """# Slices: demo

| # | Epic | Slice | Ends with | Score | State |
|---|---|---|---|---|---|
| | **`demo/E1` — Epic one.** prose | | | | |
| 1 | `demo/E1` | first slice | ends | — | pending |
| | **`demo/E2` — Epic two.** prose | | | | |
| 2 | `demo/E2` | second slice | ends | — | pending |
"""


@dataclass(frozen=True)
class Layout:
    root: Path      # the synthetic repository
    plan: Path      # docs/plans/<slug>
    rubrics: Path   # .cobuilder/rubrics/<slug>
    evidence: Path  # .cobuilder/rubrics/<slug>/evidence


def write_manifest(layout: Layout, accept: str = "0.90") -> None:
    text = (
        f"feature: {SLUG}\n"
        'test_command: "uv run pytest tests -q"\n'
        "thresholds:\n"
        f"  accept: {accept}\n"
        "  investigate: 0.70\n"
        "max_attempts: 3\n"
    )
    (layout.rubrics / "manifest.yaml").write_text(text, encoding="utf-8")


@pytest.fixture
def layout(tmp_path: Path) -> Layout:
    plan = tmp_path / "docs" / "plans" / SLUG
    plan.mkdir(parents=True)
    (plan / "04-slices.md").write_text(SLICES_MD, encoding="utf-8")
    rubrics = tmp_path / ".cobuilder" / "rubrics" / SLUG
    evidence = rubrics / "evidence"
    evidence.mkdir(parents=True)
    found = Layout(root=tmp_path, plan=plan, rubrics=rubrics, evidence=evidence)
    write_manifest(found)
    return found


def attempt_path(layout: Layout, slice_id: int, attempt: int) -> Path:
    return layout.evidence / f"slice-{slice_id}-attempt-{attempt}.md"


def write_attempt(layout: Layout, slice_id: int, attempt: int, verdict: str, score: str | None) -> None:
    """Write one attempt file in the format of plugins/implement/agents/validate.md.

    Each criterion line has its own score. The first criterion is 1.0 in every
    file, so a reader that takes the first score it finds gets the wrong number.
    """
    overall = 0.95 if score is None else float(score)
    passed = round(overall * CRITERIA)
    header = f"Slice: {slice_id}  |  Attempt: {attempt}"
    if score is not None:
        header += f"  |  Score: {score}"
    lines = [f"## Validation Result — {verdict}", header, "", "### Per-criterion results"]
    for index in range(1, CRITERIA + 1):
        mark, value = ("PASS", "1.0") if index <= passed else ("FAIL", "0.0")
        lines.append(f"- [{mark}] C{index} the slice behavior holds  score: {value}")
        lines.append(f"  Evidence: tests/test_demo.py::test_c{index}")
    lines += [
        "",
        "### Regression check",
        "Earlier tests still pass.",
        "",
        "### Actionable guidance for the next attempt",
        "Name the file and the function for the next attempt.",
    ]
    path = attempt_path(layout, slice_id, attempt)
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    stamp = MTIME_BASE + attempt
    os.utime(path, (stamp, stamp))


def run_check(layout: Layout, slice_id: int) -> str:
    """Return what agent_use.check_slice says about one slice.

    The module is not written yet. The first assertion says so, which makes the
    test fail on an assertion and not on an import error.
    """
    assert AGENT_USE_PATH.is_file(), f"{AGENT_USE_PATH} does not exist, so check_slice is not implemented"
    import agent_use

    return agent_use.check_slice(layout.plan, layout.rubrics, slice_id)


def assert_reason(reason: str) -> None:
    assert reason != "ok", "a check that fails must not print ok"
    assert reason.strip(), "a check that fails must give a reason"


# --- the newest attempt file decides ---


def test_no_attempt_file_fails_with_a_reason(layout):
    assert_reason(run_check(layout, 6))


def test_pass_at_attempt_1_passes(layout):
    write_attempt(layout, 6, 1, "PASS", "0.95")
    assert run_check(layout, 6) == "ok"


def test_newest_attempt_pass_after_fail_passes(layout):
    write_attempt(layout, 6, 1, "FAIL", "0.70")
    write_attempt(layout, 6, 2, "PASS", "0.95")
    assert run_check(layout, 6) == "ok"


def test_newest_attempt_fail_after_pass_fails(layout):
    write_attempt(layout, 6, 1, "PASS", "0.95")
    write_attempt(layout, 6, 2, "FAIL", "0.70")
    assert_reason(run_check(layout, 6))


def test_attempt_10_is_newer_than_attempt_2(layout):
    write_attempt(layout, 6, 2, "PASS", "0.95")
    write_attempt(layout, 6, 10, "FAIL", "0.70")
    assert_reason(run_check(layout, 6))


# --- the verdict and the score ---


def test_pass_below_threshold_fails(layout):
    write_attempt(layout, 6, 1, "PASS", "0.85")
    assert_reason(run_check(layout, 6))


def test_pass_at_threshold_passes(layout):
    write_attempt(layout, 6, 1, "PASS", "0.90")
    assert run_check(layout, 6) == "ok"


def test_threshold_is_read_from_manifest(layout):
    write_manifest(layout, accept="0.80")
    write_attempt(layout, 6, 1, "PASS", "0.85")
    assert run_check(layout, 6) == "ok"


def test_escalation_passes(layout):
    write_attempt(layout, 6, 3, "ESCALATION", "0.75")
    assert run_check(layout, 6) == "ok"


def test_fail_verdict_fails_even_with_a_high_score(layout):
    write_attempt(layout, 6, 1, "FAIL", "0.95")
    assert_reason(run_check(layout, 6))


def test_pass_without_an_overall_score_fails(layout):
    write_attempt(layout, 6, 1, "PASS", None)
    assert_reason(run_check(layout, 6))


# --- the modes and the slices ---


def test_workflow_mode_attempt_passes(layout):
    """slice-loop.js writes the same file. The vocabulary agent then appends its block."""
    write_attempt(layout, 6, 1, "PASS", "0.95")
    with attempt_path(layout, 6, 1).open("a", encoding="utf-8") as handle:
        handle.write(VOCABULARY_BLOCK)
    assert run_check(layout, 6) == "ok"


def test_slice_the_main_agent_wrote_fails(layout):
    """The main agent changed code and spawned no VALIDATE, so no attempt file exists."""
    code = layout.root / "plugins" / "demo" / "feature.py"
    code.parent.mkdir(parents=True)
    code.write_text("def feature():\n    return 1\n", encoding="utf-8")
    assert_reason(run_check(layout, 6))


def test_attempt_file_of_another_slice_does_not_count(layout):
    write_attempt(layout, 7, 1, "PASS", "0.95")
    assert_reason(run_check(layout, 6))


def test_slice_10_attempt_does_not_count_for_slice_1(layout):
    """A name that starts with the same digit must not match."""
    write_attempt(layout, 10, 1, "PASS", "0.95")
    assert_reason(run_check(layout, 1))


# --- verify_gate.py --slice, and the run without --slice ---


def run_gate(plan: Path, *args: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [sys.executable, str(VERIFY_GATE_PATH), "--plan", str(plan), *args],
        capture_output=True,
        text=True,
        timeout=120,
    )


def test_slice_option_prints_ok_and_exits_0_for_a_pass(layout):
    write_attempt(layout, 6, 1, "PASS", "0.95")
    proc = run_gate(layout.plan, "--slice", "6")
    assert proc.returncode == 0, proc.stderr
    assert proc.stdout.strip() == "ok", proc.stdout


def test_slice_option_prints_the_reason_and_exits_1_for_a_fail(layout):
    proc = run_gate(layout.plan, "--slice", "6")
    assert proc.returncode == 1, proc.stderr
    assert proc.stdout.strip() not in ("", "ok"), proc.stdout


def test_without_slice_a_passing_plan_still_exits_0(tmp_path):
    plan = tmp_path / "docs" / "plans" / SLUG
    plan.mkdir(parents=True)
    (plan / "04-slices.md").write_text(SINGLE_SLICE_EPICS_MD, encoding="utf-8")
    rubrics = tmp_path / ".cobuilder" / "rubrics" / SLUG
    rubrics.mkdir(parents=True)
    for number in (1, 2):
        (rubrics / f"slice-{number}.md").write_text("criteria\n", encoding="utf-8")
    proc = run_gate(plan, "--json")
    assert proc.returncode == 0, proc.stderr
    assert json.loads(proc.stdout)["ok"] is True


def test_without_slice_a_failing_plan_still_exits_1(layout):
    proc = run_gate(layout.plan, "--json")
    assert proc.returncode == 1, proc.stderr
    assert json.loads(proc.stdout)["ok"] is False


def test_slice_loop_js_writes_the_attempt_path_the_layout_uses():
    """A reference check. The workflow path must match the path that the tests write."""
    js = SLICE_LOOP_JS.read_text(encoding="utf-8")
    assert "const rubrics = `.cobuilder/rubrics/${slug}`" in js
    assert "const evidence = `${rubrics}/evidence`" in js
    assert "${evidence}/slice-${s.id}-attempt-${attempt}.md" in js
