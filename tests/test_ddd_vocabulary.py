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
AVOID_PREFIX_RE = re.compile(r"^_Avoid")
SENTENCE_BOUNDARY_RE = re.compile(r"[.?!] (?=[A-Z])")
FINAL_TERMINATOR_RE = re.compile(r"[.?!]$")


def slugify(term):
    """Derive the anchor slug for a term: lowercase, non-alphanumeric runs
    collapsed to a single '-', leading/trailing '-' stripped."""
    s = term.strip().lower()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    s = s.strip("-")
    return s


def count_sentences(definition):
    """Count sentence ends in a definition line.

    A sentence end is ". ", "? ", or "! " followed by an uppercase letter,
    plus the final terminator at the end of the (stripped) line, if present.
    """
    text = definition.rstrip()
    count = len(SENTENCE_BOUNDARY_RE.findall(text))
    if FINAL_TERMINATOR_RE.search(text.strip()):
        count += 1
    return count


def parse_vocabulary_entries(text):
    """Parse DDD-VOCABULARY.md body into a list of entry dicts.

    Only lines below the first "## " heading are considered. Every line
    whose *stripped* form starts with "**" in that region must be an
    unindented, exact entry-start match, or this raises ValueError (strict
    parsing: a malformed or indented entry marker is a failure, not
    something to skip).

    Every line starting with "_Avoid" anywhere in that region must start
    with exactly "_Avoid_: ", or this raises ValueError.

    Each entry's context id must equal the text of its enclosing "## "
    heading, unless that heading is "## Cross-cutting".

    Each entry's definition must not contain more than two sentences.

    Each entry-start line must be immediately preceded by an HTML anchor
    line `<a id="<slug>"></a>`, where `<slug>` is the term lowercased with
    runs of non-alphanumeric characters collapsed to a single hyphen.

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
    n = len(body_lines)

    # Rule 2: every "_Avoid"-prefixed line anywhere in the body must be an
    # exact "_Avoid_: " line.
    for line in body_lines:
        if AVOID_PREFIX_RE.match(line) and not AVOID_RE.match(line):
            raise ValueError(f"malformed _Avoid line: {line!r}")

    # Track the current "## " heading text as we walk, for the ctx check.
    current_heading = None

    entries = []
    i = 0
    while i < n:
        line = body_lines[i]
        if line.startswith("## "):
            current_heading = line[len("## "):].strip()
            i += 1
            continue

        stripped = line.strip()
        if stripped.startswith("**"):
            # Rule 1: the entry-start marker must be unindented and match
            # the entry-start regex exactly at column 0.
            if line != stripped:
                raise ValueError(f"indented entry start line: {line!r}")
            m = ENTRY_START_RE.match(line)
            if not m:
                raise ValueError(f"malformed entry start line: {line!r}")
            term = m.group("term")
            ctx = m.group("ctx")

            # Rule 3: ctx must equal the enclosing heading text, unless the
            # heading is "Cross-cutting".
            if current_heading is not None and current_heading != "Cross-cutting":
                if ctx != current_heading:
                    raise ValueError(
                        f"entry for {term!r} has ctx {ctx!r} but is under "
                        f"heading {current_heading!r}"
                    )

            # Rule 5: the entry-start line must be immediately preceded by
            # an HTML anchor line matching the term's slug.
            expected_anchor = f'<a id="{slugify(term)}"></a>'
            if i == 0 or body_lines[i - 1] != expected_anchor:
                raise ValueError(
                    f"entry for {term!r} is not immediately preceded by "
                    f"anchor line {expected_anchor!r}"
                )

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

            # Rule 4: a definition longer than two sentences is rejected.
            if count_sentences(definition) > 2:
                raise ValueError(
                    f"entry for {term!r} has a definition longer than two "
                    f"sentences: {definition!r}"
                )

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


def extract_anchor_ids(text):
    """Return the set of anchor ids declared as `<a id="...">` lines in
    text (used to validate canvas link fragments against DDD-VOCABULARY.md)."""
    return set(re.findall(r'<a id="([^"]+)"></a>', text))


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
    """Return the list of (term-cell, meaning-cell) raw string pairs from
    the "Ubiquitous language" table in a canvas.md file's markdown content."""
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
                term_cell = cells[0]
                meaning_cell = cells[1] if len(cells) > 1 else ""
                rows.append((term_cell, meaning_cell))
        elif in_table and stripped == "":
            pass
        i += 1
    return rows


# ---------------------------------------------------------------------------
# Unit tests for the parser itself
# ---------------------------------------------------------------------------


def test_parser_rejects_malformed_entry():
    bad_text = (
        "Some header text mentioning domain-modeling and Matt Pocock.\n"
        "\n_Avoid_: nothing here yet.\n\n"
        "## Cross-cutting\n\n"
        '<a id="bad-entry"></a>\n'
        "**Bad Entry (`missing-colon`)\n"
        "This definition line should never be reached.\n"
    )
    try:
        parse_vocabulary_entries(bad_text)
    except ValueError:
        pass
    else:
        raise AssertionError("expected ValueError for malformed entry start")


def test_parser_rejects_indented_entry_start_line():
    """Rule 1: an indented '**...**' entry-start line must be rejected, not
    silently skipped, even when its own content would otherwise be valid."""
    bad_text = (
        "Header mentioning domain-modeling and Matt Pocock.\n"
        "\n_Avoid_: nothing here yet.\n\n"
        "## Cross-cutting\n\n"
        '  **Indented Term** (`cross-cutting`):\n'
        "A definition line.\n"
    )
    try:
        parse_vocabulary_entries(bad_text)
    except ValueError as exc:
        assert "indented entry start line" in str(exc)
    else:
        raise AssertionError("expected ValueError for indented entry start line")


def test_parser_rejects_avoid_line_without_exact_prefix():
    """Rule 2: a line starting with '_Avoid' that is not exactly
    '_Avoid_: ' must be rejected."""
    bad_text = (
        "Header mentioning domain-modeling and Matt Pocock.\n"
        "\n_Avoid_: nothing here yet.\n\n"
        "## Cross-cutting\n\n"
        '<a id="some-term"></a>\n'
        "**Some Term** (`cross-cutting`):\n"
        "A definition line.\n"
        "_Avoid something without the colon form.\n"
    )
    try:
        parse_vocabulary_entries(bad_text)
    except ValueError as exc:
        assert "malformed _Avoid line" in str(exc)
    else:
        raise AssertionError("expected ValueError for malformed _Avoid line")


def test_parser_rejects_ctx_not_matching_enclosing_heading():
    """Rule 3: an entry's context id must equal its enclosing '## <context>'
    heading text, unless that heading is 'Cross-cutting'."""
    bad_text = (
        "Header mentioning domain-modeling and Matt Pocock.\n"
        "\n_Avoid_: nothing here yet.\n\n"
        "## some-context\n\n"
        '<a id="some-term"></a>\n'
        "**Some Term** (`other-context`):\n"
        "A definition line.\n"
    )
    try:
        parse_vocabulary_entries(bad_text)
    except ValueError as exc:
        assert "has ctx" in str(exc)
    else:
        raise AssertionError("expected ValueError for ctx/heading mismatch")


def test_parser_rejects_definition_with_more_than_two_sentences():
    """Rule 4: a definition longer than two sentences must be rejected."""
    bad_text = (
        "Header mentioning domain-modeling and Matt Pocock.\n"
        "\n_Avoid_: nothing here yet.\n\n"
        "## Cross-cutting\n\n"
        '<a id="some-term"></a>\n'
        "**Some Term** (`cross-cutting`):\n"
        "First sentence here. Second sentence here. Third sentence here.\n"
    )
    try:
        parse_vocabulary_entries(bad_text)
    except ValueError as exc:
        assert "longer than two sentences" in str(exc)
    else:
        raise AssertionError(
            "expected ValueError for a definition longer than two sentences"
        )


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
    """Every line whose stripped form starts with '**' below the first
    '## ' heading must be a valid, unindented entry start;
    parse_vocabulary_entries raises otherwise, which itself proves this, but
    assert explicitly here too for a strict count check."""
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
    star_lines = [l for l in body_lines if l.strip().startswith("**")]
    for line in star_lines:
        assert line == line.strip(), f"indented entry start line: {line!r}"
        assert ENTRY_START_RE.match(line), f"malformed entry start line: {line!r}"


# ---------------------------------------------------------------------------
# Canvas coverage
# ---------------------------------------------------------------------------


def _canvas_paths():
    return sorted(glob.glob(str(REPO_ROOT / "docs/architecture/contexts/*/canvas.md")))


STALE_MEANING_PHRASES = ("Today there is one", "Not yet built")


def test_every_canvas_term_has_a_vocabulary_entry_and_links_to_it():
    assert VOCAB_PATH.is_file(), f"expected {VOCAB_PATH} to exist"
    vocab_text = VOCAB_PATH.read_text(encoding="utf-8")
    entries = parse_vocabulary_entries(vocab_text)
    entry_terms_lower = {e["term"].strip().lower() for e in entries}
    anchor_ids = extract_anchor_ids(vocab_text)

    canvas_paths = _canvas_paths()
    assert canvas_paths, "expected at least one docs/architecture/contexts/*/canvas.md"

    for canvas_path in canvas_paths:
        canvas_text = Path(canvas_path).read_text(encoding="utf-8")
        rows = find_ubiquitous_language_rows(canvas_text)
        assert rows, f"expected at least one term row in {canvas_path}"
        for raw_cell, meaning_cell in rows:
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

            # Rule 5: the link's #fragment must equal an anchor id present
            # in DDD-VOCABULARY.md.
            link_match = re.match(r"^\[(.*)\]\((.*)\)$", raw_cell.strip())
            if link_match:
                target = link_match.group(2)
                frag_match = re.search(r"#([^)#]+)$", target)
                assert frag_match, (
                    f"term cell {raw_cell!r} in {canvas_path} has no #fragment"
                )
                fragment = frag_match.group(1)
                assert fragment in anchor_ids, (
                    f"term cell {raw_cell!r} in {canvas_path} links to "
                    f"#{fragment}, which is not an anchor id in {VOCAB_PATH}"
                )

            # Rule 6: the meaning cell must not carry stale single-plugin
            # wording.
            for phrase in STALE_MEANING_PHRASES:
                assert phrase not in meaning_cell, (
                    f"meaning cell for term {term!r} in {canvas_path} "
                    f"contains stale wording {phrase!r}: {meaning_cell!r}"
                )


def test_canvas_template_shows_the_link_form():
    assert CANVAS_TEMPLATE_PATH.is_file(), f"expected {CANVAS_TEMPLATE_PATH} to exist"
    text = CANVAS_TEMPLATE_PATH.read_text(encoding="utf-8")
    rows = find_ubiquitous_language_rows(text)
    assert rows, "expected at least one term row in canvas-template.md"
    assert any("DDD-VOCABULARY.md" in row[0] for row in rows), (
        "canvas-template.md's ubiquitous-language table row must show the "
        "link form containing 'DDD-VOCABULARY.md'"
    )
