"""Slice 6 (E4 tracer bullet): the DDD-VOCABULARY.md glossary file and its format.

Covers only slice 6 per docs/plans/slice-agents-and-vocabulary/epic-E4-design.md:
the file exists, its header, the entry format, and canvas term/link coverage.
Slice 7 (vocabulary agent, loop step, design mode) and slice 8 (moving the
CLAUDE.md table) are out of scope here.
"""

import glob
import re
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
VOCAB_PATH = REPO_ROOT / "DDD-VOCABULARY.md"
CANVAS_TEMPLATE_PATH = (
    REPO_ROOT
    / "plugins/architect/skills/architecture/references/templates/canvas-template.md"
)

ENTRY_START_RE = re.compile(
    r"^\*\*(?P<term>[^*]+)\*\* \(`(?P<ctx>[a-z0-9-]+)`\):\s*$"
)
AVOID_RE = re.compile(r"^_Avoid_: ")


def parse_vocabulary_entries(text):
    """Parse DDD-VOCABULARY.md body into a list of entry dicts.

    Only lines below the first "## " heading are considered. Every line
    starting with "**" in that region must be a valid entry start, or this
    raises ValueError (strict parsing: a malformed entry is a failure, not
    something to skip).

    Each entry dict has: term, ctx, definition, avoid (str or None).
    """
    lines = text.splitlines()

    # Find the first "## " heading; only parse below it.
    first_heading_idx = None
    for i, line in enumerate(lines):
        if line.startswith("## "):
            first_heading_idx = i
            break
    if first_heading_idx is None:
        raise ValueError("no '## ' heading found in DDD-VOCABULARY.md")

    body_lines = lines[first_heading_idx:]

    entries = []
    i = 0
    n = len(body_lines)
    while i < n:
        line = body_lines[i]
        if line.startswith("**"):
            m = ENTRY_START_RE.match(line)
            if not m:
                raise ValueError(f"malformed entry start line: {line!r}")
            term = m.group("term")
            ctx = m.group("ctx")

            # Next non-empty line is the definition.
            j = i + 1
            while j < n and body_lines[j].strip() == "":
                j += 1
            if j >= n:
                raise ValueError(f"entry for {term!r} has no definition")
            definition = body_lines[j]
            if definition.startswith("_Avoid_") or definition.startswith("**"):
                raise ValueError(
                    f"entry for {term!r} has no valid definition line"
                )
            if definition.strip() == "":
                raise ValueError(f"entry for {term!r} has an empty definition")

            # Optional following line starting with "_Avoid_: ".
            avoid = None
            k = j + 1
            if k < n and AVOID_RE.match(body_lines[k]):
                avoid = body_lines[k]
                k += 1

            entries.append(
                {"term": term, "ctx": ctx, "definition": definition, "avoid": avoid}
            )
            i = k
        else:
            i += 1

    return entries


def strip_term_markup(cell_text):
    """Strip markdown bold and link syntax from a canvas table term cell.

    Handles forms like:
      **Term**
      [**Term**](../../../../DDD-VOCABULARY.md#anchor)
    and returns the bare term text.
    """
    text = cell_text.strip()
    link_match = re.match(r"^\[(.*)\]\((.*)\)$", text)
    if link_match:
        text = link_match.group(1)
    text = text.replace("**", "").strip()
    return text


def find_ubiquitous_language_rows(canvas_text):
    """Return the list of raw term-cell strings from the "Ubiquitous
    language" table in a canvas.md file's markdown content."""
    lines = canvas_text.splitlines()
    heading_idx = None
    for i, line in enumerate(lines):
        if line.startswith("#") and "Ubiquitous language" in line:
            heading_idx = i
            break
    assert heading_idx is not None, "no heading containing 'Ubiquitous language' found"

    rows = []
    i = heading_idx + 1
    n = len(lines)
    in_table = False
    while i < n:
        line = lines[i]
        if line.startswith("#"):
            break
        stripped = line.strip()
        if stripped.startswith("|"):
            in_table = True
            cells = [c.strip() for c in stripped.strip("|").split("|")]
            # Skip header row and separator row.
            if cells and cells[0] not in ("Term",) and not re.match(r"^-+$", cells[0]):
                rows.append(cells[0])
        elif in_table and stripped == "":
            pass
        i += 1
    return rows


# ---------------------------------------------------------------------------
# Unit test for the parser itself
# ---------------------------------------------------------------------------


def test_parser_rejects_malformed_entry():
    bad_text = (
        "Some header text mentioning domain-modeling and Matt Pocock.\n"
        "\n_Avoid_: nothing here yet.\n\n"
        "## Cross-cutting\n\n"
        "**Bad Entry (`missing-colon`)\n"
        "This definition line should never be reached.\n"
    )
    try:
        parse_vocabulary_entries(bad_text)
    except ValueError:
        pass
    else:
        raise AssertionError("expected ValueError for malformed entry start")


# ---------------------------------------------------------------------------
# File existence
# ---------------------------------------------------------------------------


def test_ddd_vocabulary_file_exists():
    assert VOCAB_PATH.is_file(), f"expected {VOCAB_PATH} to exist"


# ---------------------------------------------------------------------------
# Header
# ---------------------------------------------------------------------------


def test_header_mentions_domain_modeling_and_matt_pocock_and_avoid():
    assert VOCAB_PATH.is_file(), f"expected {VOCAB_PATH} to exist"
    text = VOCAB_PATH.read_text(encoding="utf-8")
    lines = text.splitlines()
    first_heading_idx = None
    for i, line in enumerate(lines):
        if line.startswith("## "):
            first_heading_idx = i
            break
    assert first_heading_idx is not None, "no '## ' heading found"
    header = "\n".join(lines[:first_heading_idx])
    assert "domain-modeling" in header, "header must mention 'domain-modeling'"
    assert "Matt Pocock" in header, "header must credit 'Matt Pocock'"
    assert "_Avoid_" in header, "header must contain '_Avoid_'"


# ---------------------------------------------------------------------------
# Entry format
# ---------------------------------------------------------------------------


def test_all_entries_are_well_formed_and_under_a_heading():
    assert VOCAB_PATH.is_file(), f"expected {VOCAB_PATH} to exist"
    text = VOCAB_PATH.read_text(encoding="utf-8")
    entries = parse_vocabulary_entries(text)
    assert len(entries) >= 1, "expected at least one vocabulary entry"


def test_no_stray_double_star_lines_outside_entries():
    """Every line starting with '**' below the first '## ' heading must be a
    valid entry start; parse_vocabulary_entries raises otherwise, which
    itself proves this, but assert explicitly here too for a strict count
    check."""
    assert VOCAB_PATH.is_file(), f"expected {VOCAB_PATH} to exist"
    text = VOCAB_PATH.read_text(encoding="utf-8")
    lines = text.splitlines()
    first_heading_idx = None
    for i, line in enumerate(lines):
        if line.startswith("## "):
            first_heading_idx = i
            break
    assert first_heading_idx is not None
    body_lines = lines[first_heading_idx:]
    star_lines = [l for l in body_lines if l.startswith("**")]
    for line in star_lines:
        assert ENTRY_START_RE.match(line), f"malformed entry start line: {line!r}"


# ---------------------------------------------------------------------------
# Canvas coverage
# ---------------------------------------------------------------------------


def _canvas_paths():
    return sorted(glob.glob(str(REPO_ROOT / "docs/architecture/contexts/*/canvas.md")))


def test_every_canvas_term_has_a_vocabulary_entry_and_links_to_it():
    assert VOCAB_PATH.is_file(), f"expected {VOCAB_PATH} to exist"
    vocab_text = VOCAB_PATH.read_text(encoding="utf-8")
    entries = parse_vocabulary_entries(vocab_text)
    entry_terms_lower = {e["term"].strip().lower() for e in entries}

    canvas_paths = _canvas_paths()
    assert canvas_paths, "expected at least one docs/architecture/contexts/*/canvas.md"

    for canvas_path in canvas_paths:
        canvas_text = Path(canvas_path).read_text(encoding="utf-8")
        raw_cells = find_ubiquitous_language_rows(canvas_text)
        assert raw_cells, f"expected at least one term row in {canvas_path}"
        for raw_cell in raw_cells:
            term = strip_term_markup(raw_cell)
            assert term, f"could not extract term text from cell {raw_cell!r} in {canvas_path}"
            assert term.lower() in entry_terms_lower, (
                f"term {term!r} from {canvas_path} has no entry in "
                f"{VOCAB_PATH}"
            )
            assert "DDD-VOCABULARY.md" in raw_cell, (
                f"term cell {raw_cell!r} in {canvas_path} does not link to "
                "DDD-VOCABULARY.md"
            )


def test_canvas_template_shows_the_link_form():
    assert CANVAS_TEMPLATE_PATH.is_file(), f"expected {CANVAS_TEMPLATE_PATH} to exist"
    text = CANVAS_TEMPLATE_PATH.read_text(encoding="utf-8")
    rows = find_ubiquitous_language_rows(text)
    assert rows, "expected at least one term row in canvas-template.md"
    assert any("DDD-VOCABULARY.md" in row for row in rows), (
        "canvas-template.md's ubiquitous-language table row must show the "
        "link form containing 'DDD-VOCABULARY.md'"
    )
