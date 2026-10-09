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


def test_stage6_runs_check_with_require():
    s = stage6()
    assert "boundary_check.py" in s, "stage 6 does not run boundary_check.py"
    assert "--require" in s, "stage 6 does not pass --require"
    assert "--paths" in s, "stage 6 does not pass --paths"


# ---- Slice 3: self-only describe in baseline, and the docs ----

PR_DIR = REPO_ROOT / "plugins" / "pr"
ODYSSEY = PR_DIR / "skills" / "odyssey"


def baseline_mode() -> str:
    return section((ODYSSEY / "SKILL.md").read_text(), "Baseline mode")


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


def test_no_pr_script_writes_under_architecture_contexts():
    """A foreign-repo baseline writes nothing under docs/architecture/contexts.

    The describe step runs lite on a foreign repo. Its context canvases belong to the
    target repo, so pr:baseline must not write them. The pr scripts are the code that
    could write there, so this fails when any pr Python or shell file names the path.
    """
    files = [
        path
        for root in (PR_DIR / "scripts", PR_DIR / "skills")
        for path in root.rglob("*")
        if path.is_file() and path.suffix in {".py", ".sh"}
    ]
    assert files, "found no pr Python or shell files to scan"
    offenders = [
        path.relative_to(REPO_ROOT).as_posix()
        for path in files
        if "architecture/contexts" in path.read_text(errors="ignore")
    ]
    assert not offenders, (
        f"pr scripts name architecture/contexts: {offenders}\n"
        "  A foreign-repo baseline must not write context canvases."
    )


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


def test_doc_command_tokens_have_command_files():
    """Every `/<plugin>:<command>` token in README.md and CLAUDE.md has a command file.

    A doc that names a command with no file sends the reader to a command that does
    not run. The token list is read from the docs, so a new doc token is checked too.
    ALLOWLIST is empty: no doc token names a skill or mode without a command file.
    """
    ALLOWLIST: set[str] = set()
    token = re.compile(r"/(architect|pr|artifact|implement):([a-z-]+)")
    missing = []
    for doc in (REPO_ROOT / "README.md", REPO_ROOT / "CLAUDE.md"):
        for plugin, command in sorted(set(token.findall(doc.read_text()))):
            name = f"{plugin}:{command}"
            if name in ALLOWLIST:
                continue
            command_file = REPO_ROOT / "plugins" / plugin / "commands" / f"{command}.md"
            if not command_file.is_file():
                missing.append(f"{doc.name}: /{name}")
    assert not missing, (
        "doc tokens with no command file:\n  " + "\n  ".join(missing)
    )
