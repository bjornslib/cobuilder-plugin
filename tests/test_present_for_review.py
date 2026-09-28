"""Packaging invariants for the Present for review procedure (ADR-0032, slice 3).

Structural checks only: anchors, order, and names. Each presentation point in
docs/plans/review-link/04-slices.md must reference Present for review before
the question it guards. No implement or architect file may name a path in
the artifact plugin (ADR-0016).
"""
from __future__ import annotations

import re
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent
PLUGINS = REPO_ROOT / "plugins"
ARTIFACTS_SKILL = PLUGINS / "artifact" / "skills" / "cobuilder-artifacts" / "SKILL.md"
BUILD_SKILL = PLUGINS / "implement" / "skills" / "build" / "SKILL.md"
SCORING = PLUGINS / "implement" / "skills" / "build" / "references" / "validation-scoring.md"
ARCH_SKILL = PLUGINS / "architect" / "skills" / "architecture" / "SKILL.md"
DESIGN_MODE = PLUGINS / "architect" / "skills" / "architecture" / "references" / "design-mode.md"

# A reference by section name, or by mode name with a route.
REF = re.compile(r'Present for review|cobuilder-artifacts",\s*args="view --route')


def region(text: str, start: str, end: str | None) -> str:
    i = text.find(start)
    assert i >= 0, f"anchor not found: {start!r}"
    if end is None:
        return text[i:]
    j = text.find(end, i + len(start))
    assert j >= 0, f"end anchor not found after {start!r}: {end!r}"
    return text[i:j]


def assert_ref_before(block: str, question: str, label: str) -> None:
    q = block.find(question)
    assert q >= 0, f"{label}: question anchor {question!r} not found"
    m = REF.search(block)
    assert m is not None, f"{label}: no Present for review reference"
    assert m.start() < q, f"{label}: Present for review comes after the question"


def test_artifacts_skill_has_present_for_review_section():
    text = ARTIFACTS_SKILL.read_text()
    m = re.search(r"^#{2,4} Present for review\b.*$", text, re.M)
    assert m, "cobuilder-artifacts SKILL.md has no 'Present for review' heading"
    nxt = re.search(r"^#{2,3} ", text[m.end():], re.M)
    body = text[m.end(): m.end() + nxt.start()] if nxt else text[m.end():]
    assert "--route" in body, "Present for review section does not use view --route"


# (label, file, start anchor, end anchor, question anchor or None)
POINTS = [
    ("build: approval protocol", BUILD_SKILL, "## The approval protocol", "## Gate 1",
     "Approve Gate N, or what should change?"),
    ("build: Gate 4b", BUILD_SKILL, "### 4b.", "### 4c.", None),
    ("build: after each slice", BUILD_SKILL, "### After each slice", "## Standing rules",
     "Proceed to the next slice, or adjust direction?"),
    ("scoring: ESCALATE", SCORING, "| **ESCALATE** |", "\n", "request re-approval"),
    ("architect: design stage 5 step 6", ARCH_SKILL, "6. **Start the viewer.**",
     "9. **Stage 6", None),
    ("architect: design stage 6", ARCH_SKILL, "9. **Stage 6", "### Review Mode",
     "ask the engineer to decide"),
    ("design-mode: stage 6", DESIGN_MODE, "## 10. Stage 6", "## 11.",
     "ask the engineer to decide"),
    ("architect: decisions step 8", ARCH_SKILL, "### Decisions Mode", "### Describe Mode", None),
    ("architect: describe step 6", ARCH_SKILL, "### Describe Mode", "### Debug Mode", None),
]


@pytest.mark.parametrize("label,path,start,end,question", POINTS, ids=[p[0] for p in POINTS])
def test_presentation_point_references_present_for_review(label, path, start, end, question):
    block = region(path.read_text(), start, end)
    if question is None:
        assert REF.search(block), f"{label}: no Present for review reference"
    else:
        assert_ref_before(block, question, label)


def test_no_cross_plugin_path_to_artifact():
    offenders = []
    for root in (PLUGINS / "implement", PLUGINS / "architect"):
        for f in root.rglob("*"):
            if f.is_symlink() or not f.is_file() or "shared" in f.relative_to(root).parts[:1]:
                continue
            try:
                text = f.read_text()
            except (UnicodeDecodeError, OSError):
                continue
            if "review_link.py" in text:
                offenders.append(f"{f}: review_link.py")
            # Pre-existing: verify_gate.py has a comment naming
            # plugins/artifact/scripts/build_builds_view.py. Scope the path
            # check to prose files, where the procedure lives.
            if f.suffix == ".md" and "plugins/artifact/" in text:
                offenders.append(f"{f}: plugins/artifact/")
    assert not offenders, offenders
