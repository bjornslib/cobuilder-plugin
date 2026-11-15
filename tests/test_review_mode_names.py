"""Slice 16 (E9): one name for each review mode, in the glossary and the prose.

The checks read names and references. They do not judge sentence wording.
A bare review mode is the phrase "review mode" with no "architect" or "PR"
word before it. The architect audit takes "Architect review mode". The PR
narration takes "PR review mode".
"""

import os
import re
from pathlib import Path

from test_ddd_vocabulary import extract_anchor_ids, parse_vocabulary_entries

REPO_ROOT = Path(__file__).resolve().parents[1]
GLOSSARY = REPO_ROOT / "DDD-VOCABULARY.md"
ARCHITECT_DIR = REPO_ROOT / "plugins" / "architect"
CANVAS_DIR = REPO_ROOT / "docs" / "architecture" / "contexts"
PR_CANVAS = CANVAS_DIR / "pr" / "canvas.md"
ARCHITECT_CANVAS = CANVAS_DIR / "architect" / "canvas.md"

ARCHITECT_TERM = "Architect review mode"
PR_TERM = "PR review mode"
ARCHITECT_ANCHOR = "architect-review-mode"
PR_ANCHOR = "pr-review-mode"
OLD_TERMS = ("Review", "Review mode")
OLD_ANCHORS = ("review", "review-mode")

BARE_RE = re.compile(r"review\s+modes?\b", re.IGNORECASE)
QUALIFIER_RE = re.compile(r"([A-Za-z]+)[\s(\[*_`\"']*$")
QUALIFIERS = ("architect", "pr")
LINK_RE = re.compile(r"DDD-VOCABULARY\.md#([^)\s#]+)\)")


def _glossary_text():
    return GLOSSARY.read_text(encoding="utf-8")


def _single_entry(text, term):
    """Return the one parsed glossary entry that has the term."""
    found = [e for e in parse_vocabulary_entries(text) if e["term"] == term]
    assert len(found) == 1, f"expected one glossary entry named {term!r}, found {len(found)}"
    return found[0]


def _qualified(prefix):
    """Return True when the text before a review mode ends with an allowed word."""
    match = QUALIFIER_RE.search(prefix[-40:])
    return match is not None and match.group(1).lower() in QUALIFIERS


def _bare_hits(text):
    """Return one 'line N: text' entry for each bare review mode in the text.

    An _Avoid_ line is exempt. It lists rejected names.
    """
    lines = text.splitlines()
    hits = []
    for match in BARE_RE.finditer(text):
        if _qualified(text[: match.start()]):
            continue
        number = text.count("\n", 0, match.start())
        line = lines[number].strip()
        if line.startswith("_Avoid_"):
            continue
        hits.append(f"line {number + 1}: {line}")
    return hits


def _mask(text, inside):
    """Blank the glossary lines outside the implement section, or inside it.

    Line numbers stay true. A blanked line holds no text.
    """
    lines = text.splitlines()
    start = lines.index("## implement")
    end = next(
        (i for i in range(start + 1, len(lines)) if lines[i].startswith("## ")),
        len(lines),
    )
    return "\n".join(
        line if (start <= i < end) == inside else ""
        for i, line in enumerate(lines)
    )


def _architect_prose_hits():
    """Return the bare review mode hits in every text file under plugins/architect."""
    hits = []
    for root, dirs, files in os.walk(ARCHITECT_DIR):
        dirs[:] = [name for name in dirs if name != "__pycache__"]
        for name in files:
            path = Path(root, name)
            if path.is_symlink():
                continue
            try:
                text = path.read_text(encoding="utf-8")
            except UnicodeDecodeError:
                continue
            hits += [f"{path.relative_to(REPO_ROOT)} {hit}" for hit in _bare_hits(text)]
    return hits


def test_glossary_has_one_qualified_entry_per_review_mode():
    text = _glossary_text()
    anchors = extract_anchor_ids(text)
    for term, ctx, anchor in (
        (ARCHITECT_TERM, "architect", ARCHITECT_ANCHOR),
        (PR_TERM, "pr", PR_ANCHOR),
    ):
        entry = _single_entry(text, term)
        assert entry["ctx"] == ctx, f"{term!r} has context {entry['ctx']!r}, expected {ctx!r}"
        assert anchor in anchors, f"the glossary has no anchor id {anchor!r}"


def test_qualified_entries_name_each_other_in_avoid():
    text = _glossary_text()
    architect_avoid = _single_entry(text, ARCHITECT_TERM)["avoid"] or ""
    pr_avoid = _single_entry(text, PR_TERM)["avoid"] or ""
    assert PR_TERM in architect_avoid, (
        f"the _Avoid_ line of {ARCHITECT_TERM!r} does not name {PR_TERM!r}"
    )
    assert ARCHITECT_TERM in pr_avoid, (
        f"the _Avoid_ line of {PR_TERM!r} does not name {ARCHITECT_TERM!r}"
    )
    assert re.search(r"(?<!PR )review mode", architect_avoid, re.IGNORECASE), (
        f"the _Avoid_ line of {ARCHITECT_TERM!r} does not list the bare 'review mode'"
    )


def test_bare_review_entries_and_anchors_are_removed():
    text = _glossary_text()
    terms = {entry["term"] for entry in parse_vocabulary_entries(text)}
    anchors = extract_anchor_ids(text)
    for old in OLD_TERMS:
        assert old not in terms, f"the old glossary entry {old!r} still exists"
    for old in OLD_ANCHORS:
        assert old not in anchors, f"the old anchor id {old!r} still exists"


def test_architect_prose_never_says_bare_review_mode():
    hits = _architect_prose_hits()
    assert not hits, "bare 'review mode' under plugins/architect:\n" + "\n".join(hits)


def test_implement_section_never_says_bare_review_mode():
    hits = _bare_hits(_mask(_glossary_text(), inside=True))
    assert not hits, "bare 'review mode' in the implement section:\n" + "\n".join(hits)


def test_glossary_outside_implement_never_says_bare_review_mode():
    hits = _bare_hits(_mask(_glossary_text(), inside=False))
    assert not hits, "bare 'review mode' outside the implement section:\n" + "\n".join(hits)


def test_canvas_links_resolve_to_glossary_anchors():
    anchors = extract_anchor_ids(_glossary_text())
    links = [
        (path.parent.name, fragment)
        for path in sorted(CANVAS_DIR.glob("*/canvas.md"))
        for fragment in LINK_RE.findall(path.read_text(encoding="utf-8"))
    ]
    assert links, "no canvas links to the glossary were found"
    missing = [f"{context}: #{fragment}" for context, fragment in links if fragment not in anchors]
    assert not missing, "canvas links to no glossary anchor: " + ", ".join(missing)


def test_review_mode_canvas_links_use_the_new_anchors():
    pr_links = set(LINK_RE.findall(PR_CANVAS.read_text(encoding="utf-8")))
    architect_links = set(LINK_RE.findall(ARCHITECT_CANVAS.read_text(encoding="utf-8")))
    assert PR_ANCHOR in pr_links, f"the pr canvas does not link #{PR_ANCHOR}"
    assert "review-mode" not in pr_links, "the pr canvas still links #review-mode"
    assert ARCHITECT_ANCHOR in architect_links, (
        f"the architect canvas does not link #{ARCHITECT_ANCHOR}"
    )
    assert "review" not in architect_links, "the architect canvas still links #review"
