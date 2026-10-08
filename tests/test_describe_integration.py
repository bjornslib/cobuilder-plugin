"""Wiring checks for describe in design mode (slice 2 of describe-boundaries).

Load-bearing tokens only: boundary_check.py, --paths, --require, describe,
stale, uncovered, FAIL. Each test fails if its wiring is removed.
"""
from __future__ import annotations

import re
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
ARCH = REPO_ROOT / "plugins" / "architect" / "skills" / "architecture"
DESIGN_MODE = ARCH / "references" / "design-mode.md"
SKILL = ARCH / "SKILL.md"


def section(text: str, heading: str) -> str:
    m = re.search(rf"^## {re.escape(heading)}.*$", text, re.M)
    assert m, f"heading not found: {heading!r}"
    nxt = re.search(r"^## ", text[m.end():], re.M)
    return text[m.end(): m.end() + nxt.start()] if nxt else text[m.end():]


def stage1() -> str:
    return section(DESIGN_MODE.read_text(), "4. Stage 1")


def stage6() -> str:
    return section(DESIGN_MODE.read_text(), "10. Stage 6")


def test_stage1_runs_boundary_check_with_paths():
    s = stage1()
    assert "boundary_check.py" in s, "stage 1 does not run boundary_check.py"
    assert "--paths" in s, "stage 1 does not pass --paths"


def test_stage1_invokes_describe_skill():
    s = stage1()
    assert re.search(r'Skill\("architect:architecture",\s*args="describe', s), \
        "stage 1 does not invoke describe through Skill"


def test_stage1_describe_only_for_stale_missing_uncovered():
    s = stage1()
    for tok in ("stale", "missing", "uncovered"):
        assert tok in s, f"stage 1 does not name {tok!r}"
    assert re.search(r"\bok\b", s), "stage 1 does not say what to do with ok contexts"
    assert re.search(r"(never|not|skip|only)", s, re.I)
    assert re.search(r"only[^.\n]*stale[^.\n]*missing[^.\n]*uncovered", s, re.I), \
        "stage 1 lacks the 'only stale, missing, or uncovered' rule"


def test_stage1_reruns_check_until_clean():
    s = stage1()
    assert re.search(r"re-?run", s, re.I), "stage 1 does not rerun the check"
    assert re.search(r"clean", s, re.I), "stage 1 does not rerun until clean"


def test_stage6_runs_check_with_require():
    s = stage6()
    assert "boundary_check.py" in s, "stage 6 does not run boundary_check.py"
    assert "--require" in s, "stage 6 does not pass --require"
    assert "--paths" in s, "stage 6 does not pass --paths"


def test_stage6_check_precedes_reviewer_round():
    s = stage6()
    i = s.find("--require")
    assert i >= 0, "stage 6 has no --require"
    j = re.search(r"reviewer", s[i:], re.I)
    assert j, "stage 6 names no reviewer round after the check"


def test_stage6_nonzero_exit_is_fail_finding_citing_id_or_path():
    s = stage6()
    assert re.search(r"non-?zero", s, re.I), "stage 6 does not name a non-zero exit"
    assert "FAIL" in s, "stage 6 does not turn the exit into a FAIL finding"
    assert re.search(r"context id|path", s, re.I), "stage 6 FAIL does not cite id or path"


def test_skill_says_describe_is_called_by_design_mode():
    text = SKILL.read_text()
    m = re.search(r"^### Describe Mode.*$", text, re.M)
    assert m, "Describe Mode section not found"
    nxt = re.search(r"^### ", text[m.end():], re.M)
    body = text[m.end(): m.end() + nxt.start()]
    assert re.search(r"called by[^.\n]*design", body, re.I), \
        "Describe Mode does not say design mode calls it"


# ---- Slice 3: self-only describe in baseline, and the docs ----

PR_DIR = REPO_ROOT / "plugins" / "pr"
ODYSSEY = PR_DIR / "skills" / "odyssey"
BASELINE_DERIVATION = ODYSSEY / "references" / "baseline-derivation.md"


def baseline_mode() -> str:
    return section((ODYSSEY / "SKILL.md").read_text(), "Baseline mode")


def smells() -> str:
    return section_h(BASELINE_DERIVATION.read_text(), "## 5. Surfacing smells")


def section_h(text: str, heading: str) -> str:
    m = re.search(rf"^{re.escape(heading)}.*$", text, re.M)
    assert m, f"heading not found: {heading!r}"
    nxt = re.search(r"^## ", text[m.end():], re.M)
    return text[m.end(): m.end() + nxt.start()] if nxt else text[m.end():]


def test_baseline_runs_boundary_check():
    assert "boundary_check.py" in baseline_mode(), \
        "baseline mode does not run boundary_check.py"


def test_baseline_invokes_describe_skill():
    assert re.search(r'Skill\("architect:architecture",\s*args="describe', baseline_mode()), \
        "baseline mode does not invoke describe through Skill"


def test_baseline_describe_only_stale_or_missing():
    s = baseline_mode()
    assert re.search(r"stale", s) and re.search(r"missing", s), \
        "baseline mode does not name stale and missing"
    assert re.search(r"\bok\b", s), "baseline mode does not say what to do with ok records"


def test_baseline_reruns_check():
    s = baseline_mode()
    i = s.find("boundary_check.py")
    assert i >= 0, "baseline mode has no boundary_check.py"
    assert re.search(r"re-?run", s[i:], re.I), "baseline mode does not rerun the check"


def test_baseline_describe_is_self_analysis_only():
    s = baseline_mode()
    assert "self-analysis" in s, "baseline mode does not name self-analysis"
    assert "--repo" in s, "baseline mode does not name --repo"
    assert "foreign" in s, "baseline mode does not name foreign repos"


def test_derivation_smells_no_longer_forbids_boundary_for_self():
    s = smells()
    assert "self-analysis" in s, "section 5 does not name self-analysis"
    assert not re.search(r"Do not build\s+a `boundary\.yaml`", s), \
        "section 5 still forbids boundary.yaml unconditionally"


def test_derivation_keeps_foreign_describe_lite_rule():
    s = smells()
    assert "foreign" in s, "section 5 lacks the foreign rule"
    assert "describe" in s, "section 5 does not name describe"
    assert "docs/architecture/contexts" in s, \
        "section 5 does not forbid writes under docs/architecture/contexts/"


def test_pr_plugin_never_names_architect_path():
    bad = [str(p.relative_to(REPO_ROOT)) for p in PR_DIR.rglob("*")
           if p.is_file() and p.suffix in {".md", ".py", ".json", ".sh"}
           and "plugins/architect/" in p.read_text(errors="ignore")]
    assert not bad, f"files name plugins/architect/: {bad}"


def test_skill_describe_line_names_pr_baseline():
    text = SKILL.read_text()
    line = next((l for l in text.splitlines() if l.startswith("- `/architect:describe`")), "")
    assert "pr:baseline" in line, "Mode Invocation describe line lacks pr:baseline"
    m = re.search(r"^### Describe Mode.*$", text, re.M)
    nxt = re.search(r"^### ", text[m.end():], re.M)
    assert "pr:baseline" in text[m.end(): m.end() + nxt.start()], \
        "Describe Mode section lacks pr:baseline"


def test_docs_do_not_list_describe_command():
    for p in (REPO_ROOT / "README.md",
              REPO_ROOT / "plugins" / "cobuilder-full-lifecycle" / "skills" / "cobuilder-full" / "SKILL.md"):
        assert "/architect:describe" not in p.read_text(), f"{p.name} lists /architect:describe"
