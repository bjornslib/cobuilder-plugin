"""Wiring checks for the habit-hooks step in review and maintenance
(habit-smells slices; the prose side of the epic).

Load-bearing tokens only: habit_smells.py, --branch, the P1 rules, the top-10
cap, the incomplete-run and unavailable rules, the habit.smells gate line, the
four pair tags, and the prior-report diff. Each test fails if its wiring is
removed.
"""
from __future__ import annotations

import re
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent
ARCH = REPO_ROOT / "plugins" / "architect" / "skills" / "architecture"
SKILL = ARCH / "SKILL.md"
REVIEW_COMMAND = REPO_ROOT / "plugins" / "architect" / "commands" / "review.md"
MAINTENANCE_COMMAND = REPO_ROOT / "plugins" / "architect" / "commands" / "maintenance.md"


def section(text: str, heading: str) -> str:
    m = re.search(rf"^### {re.escape(heading)}.*$", text, re.M)
    assert m, f"heading not found: {heading!r}"
    nxt = re.search(r"^### ", text[m.end():], re.M)
    return text[m.end(): m.end() + nxt.start()] if nxt else text[m.end():]


def review_mode() -> str:
    return section(SKILL.read_text(), "Review Mode")


def maintenance_mode() -> str:
    return section(SKILL.read_text(), "Maintenance Mode")


# ---- Review Mode: the scan step and its rules ----


def test_review_runs_habit_smells_with_branch():
    s = review_mode()
    assert "habit_smells.py" in s, "review mode does not run habit_smells.py"
    assert "--branch" in s, "review mode does not pass --branch"


def test_review_p1_rule_for_swallowed_exceptions():
    s = review_mode()
    assert "swallowed-exception" in s, "review mode does not name swallowed-exception"


@pytest.mark.parametrize("needle", ["swallowed-exception", r"over 100|>100|over 100 findings"])
def test_review_p1_rules(needle):
    s = review_mode()
    before = re.search(rf"([^.\n]*{needle}[^.\n]*)(?:\.|$)", s, re.I)
    assert before, f"no sentence names {needle!r}"
    sentence = before.group(0)
    assert re.search(r"P1", sentence), f"no P1 rule attached to {needle!r}"


def test_review_caps_large_group_with_top_10_files():
    s = review_mode()
    assert re.search(r"top.{0,10}10", s, re.I), "review mode lacks the top-10 file cap"


def test_review_incomplete_run_is_p1():
    s = review_mode()
    assert "incomplete-run" in s, "review mode does not name an incomplete run"
    m = re.search(r"([^.\n]*incomplete-run[^.\n]*)(?:\.|$)", s, re.I)
    assert re.search(r"P1", m.group(0)), "no P1 rule attached to the incomplete run"


def test_review_unavailable_rule_with_no_clean_scan_claim():
    s = review_mode()
    assert "habit-sensors" in s, "review mode does not name the habit-sensors tool"
    assert re.search(r"available", s), "review mode has no unavailable rule"
    assert re.search(r"clean", s), "review mode does not state the no-clean-scan rule"


def test_review_names_the_habit_smells_gate_tool_and_base():
    s = review_mode()
    assert "habit.smells" in s, "review mode does not name the habit.smells gate key"


# ---- Maintenance Mode: the pair diff and the four tags ----


@pytest.mark.parametrize("tag", ["NEW", "ESCALATED", "STABLE", "RESOLVED"])
def test_maintenance_tags_each_smell_file_pair(tag):
    s = maintenance_mode()
    assert tag in s, f"maintenance mode lacks the {tag} tag"


def test_maintenance_diffs_against_the_previous_report():
    s = maintenance_mode()
    assert re.search(r"(previous|prior) report", s, re.I), \
        "maintenance mode does not diff against the previous report"
    assert "Mechanical smells" in s, \
        "maintenance mode does not read the previous Mechanical smells section"


def test_maintenance_runs_the_same_scan():
    s = maintenance_mode()
    assert "habit_smells.py" in s, "maintenance mode does not run habit_smells.py"
    assert "--branch" in s, "maintenance mode does not pass --branch"


# ---- Both command files name the step ----


@pytest.mark.parametrize("path", [REVIEW_COMMAND, MAINTENANCE_COMMAND])
def test_command_names_the_habit_step(path):
    text = path.read_text()
    assert re.search(r"habit_smells\.py|habit-hooks", text, re.I), \
        f"{path.name} does not name the habit-hooks step"


# ---- Guard: a partial scan never diffs against the previous report ----


def test_maintenance_holds_the_diff_on_an_incomplete_run():
    s = maintenance_mode()
    m = re.search(r"run_complete[^.\n]*\.", s)
    assert m, "maintenance mode does not state the run_complete rule"
    sentence = m.group(0)
    assert re.search(r"diff|tag", sentence, re.I), \
        "the run_complete rule does not hold the diff or the tags"
    assert re.search(r"complete", s), \
        "maintenance mode does not wait for a complete run"


def test_review_pairs_rest_on_a_complete_run():
    s = review_mode()
    assert re.search(r"complete", s), \
        "review mode's habit-hooks list does not rest on a complete run"


# ---- Guard: no plugins/pr file mentions habit-hooks ----


def test_pr_plugin_never_mentions_habit_hooks():
    pr_dir = REPO_ROOT / "plugins" / "pr"
    bad = [str(p.relative_to(REPO_ROOT)) for p in pr_dir.rglob("*")
           if p.is_file() and p.suffix in {".md", ".py", ".json", ".sh"}
           and re.search(r"\bhabit-hooks\b", p.read_text(errors="ignore"))]
    assert not bad, f"plugins/pr files mention habit-hooks: {bad}"

# ---- Maintenance: the trend paragraph itself ----


def trend_paragraph() -> str:
    s = maintenance_mode()
    start = s.find("Habit-hooks trend")
    assert start != -1, "maintenance mode has no 'Habit-hooks trend' paragraph"
    end = s.find("**Vocabulary check", start)
    assert end != -1, "no '**Vocabulary check' heading after the trend paragraph"
    return s[start:end]


@pytest.mark.parametrize("tag", ["NEW", "ESCALATED", "STABLE", "RESOLVED"])
def test_trend_paragraph_has_tag(tag):
    assert re.search(rf"\b{tag}\b", trend_paragraph()), (
        f"the Habit-hooks trend paragraph does not name {tag}"
    )


def test_trend_paragraph_states_first_scan_case():
    p = trend_paragraph()
    anchors = [m.start() for m in re.finditer(r"Mechanical smells|previous report", p)]
    words = [m.start() for m in re.finditer(r"\bfirst\b|\bbaseline\b", p, re.I)]
    assert any(abs(a - w) <= 300 for a in anchors for w in words), (
        "the trend paragraph does not state the first-scan case "
        "(missing Mechanical smells section: every pair NEW, scan sets baseline)"
    )


def test_maintenance_command_names_habit_step_outside_code_fence():
    text = MAINTENANCE_COMMAND.read_text()
    prose = re.sub(r"```.*?```", "", text, flags=re.S)
    assert "habit_smells.py" in prose or "habit-hooks" in prose, (
        "maintenance.md names the habit-hooks step only inside a code fence"
    )
