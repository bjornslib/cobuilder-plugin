"""Wiring checks for the habit-hooks step in review and maintenance
(habit-smells slices; the prose side of the epic).

Load-bearing tokens only: habit_smells.py, --branch, the record keys the
prose names, the habit.smells gate key, the four pair tags, and the
prior-report diff. Each test fails if its wiring is removed.
"""
from __future__ import annotations

import ast
import re
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent
ARCH = REPO_ROOT / "plugins" / "architect" / "skills" / "architecture"
SKILL = ARCH / "SKILL.md"
REVIEW_COMMAND = REPO_ROOT / "plugins" / "architect" / "commands" / "review.md"
MAINTENANCE_COMMAND = REPO_ROOT / "plugins" / "architect" / "commands" / "maintenance.md"
HABIT_SMELLS = REPO_ROOT / "shared" / "habit_smells.py"
VERIFY_BUNDLE = REPO_ROOT / "shared" / "verify_bundle.py"


def section(text: str, heading: str) -> str:
    m = re.search(rf"^### {re.escape(heading)}.*$", text, re.M)
    assert m, f"heading not found: {heading!r}"
    nxt = re.search(r"^### ", text[m.end():], re.M)
    return text[m.end(): m.end() + nxt.start()] if nxt else text[m.end():]


def review_mode() -> str:
    return section(SKILL.read_text(), "Review Mode")


def maintenance_mode() -> str:
    return section(SKILL.read_text(), "Maintenance Mode")


# ---- Record keys: the script writes them, the prose names them ----


def record_keys_written() -> set[str]:
    """Keys the script puts in the record dict inside collect()."""
    tree = ast.parse(HABIT_SMELLS.read_text())
    fn = next(n for n in tree.body if isinstance(n, ast.FunctionDef) and n.name == "collect")
    keys: set[str] = set()
    for node in ast.walk(fn):
        if isinstance(node, ast.Assign):
            for t in node.targets:
                if (isinstance(t, ast.Subscript) and isinstance(t.value, ast.Name)
                        and t.value.id == "record" and isinstance(t.slice, ast.Constant)):
                    keys.add(t.slice.value)
        if isinstance(node, (ast.Assign, ast.AnnAssign)):
            targets = node.targets if isinstance(node, ast.Assign) else [node.target]
            if (any(isinstance(t, ast.Name) and t.id == "record" for t in targets)
                    and isinstance(node.value, ast.Dict)):
                keys.update(k.value for k in node.value.keys if isinstance(k, ast.Constant))
    return keys


def record_keys_referenced(text: str) -> set[str]:
    """Snake_case names in backticks, in sentences that mention the record.

    A span may carry a value after a colon, as in `run_complete: false`."""
    keys: set[str] = set()
    for sentence in re.split(r"(?<=[.!?])\s+|\n", text):
        if not re.search(r"\brecord\b", sentence, re.I):
            continue
        for span in re.findall(r"`([^`]+)`", sentence):
            m = re.fullmatch(r"([a-z_]+)(?::.*)?", span.strip())
            if m:
                keys.add(m.group(1))
    return keys


def test_habit_record_keys_named_in_skill_are_written_by_script():
    written = record_keys_written()
    referenced = record_keys_referenced(review_mode()) | record_keys_referenced(maintenance_mode())
    assert {"run_complete", "available"} <= written, (
        f"habit_smells.py does not write run_complete and available; writes {sorted(written)}"
    )
    assert {"run_complete", "available"} <= referenced, (
        f"SKILL.md does not name run_complete and available as record keys; names {sorted(referenced)}"
    )
    unwritten = referenced - written
    assert not unwritten, (
        f"SKILL.md names record keys that habit_smells.py never writes: {sorted(unwritten)}"
    )


# ---- Review Mode: the scan step and its rules ----


def test_review_runs_habit_smells_with_branch():
    s = review_mode()
    assert "habit_smells.py" in s, "review mode does not run habit_smells.py"
    assert "--branch" in s, "review mode does not pass --branch"


def test_habit_smells_gate_key_and_script_exist():
    assert HABIT_SMELLS.exists(), f"missing {HABIT_SMELLS.relative_to(REPO_ROOT)}"
    assert "habit.smells" in VERIFY_BUNDLE.read_text(), \
        "shared/verify_bundle.py has no habit.smells gate key"


# ---- Maintenance Mode: the pair diff and the four tags ----


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


def test_trend_paragraph_states_first_scan_case():
    p = trend_paragraph()
    anchors = [m.start() for m in re.finditer(r"Mechanical smells|previous report", p)]
    words = [m.start() for m in re.finditer(r"\bfirst\b|\bbaseline\b", p, re.I)]
    assert any(abs(a - w) <= 300 for a in anchors for w in words), (
        "the trend paragraph does not state the first-scan case "
        "(missing Mechanical smells section: every pair NEW, scan sets baseline)"
    )
