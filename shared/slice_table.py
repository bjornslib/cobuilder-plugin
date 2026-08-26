"""Parse the slice table in ``docs/plans/<slug>/04-slices.md``.

The table has one header row, one separator row, and then a mix of two row
kinds. An epic-header row carries an empty ``#`` cell and a bolded,
backticked scoped epic id (``<design>/<epic-id>``) followed by an em dash.
A slice row carries an integer ``#`` and the same scoped id, un-bolded, in
the ``Epic`` cell::

    | # | Epic | Slice | Ends with | Score | State |
    |---|---|---|---|---|---|
    | | **`plugin-split/E1` — One plugin becomes five.** <prose> | | | | |
    | 4 | `plugin-split/E1` | Renames inside today's single plugin | <ends> | 1.00 | completed |

An older plan may omit the Score and State columns, leaving a four-cell
slice row. Both shapes are valid input to this module.

This module owns that format and nothing else. It takes text and returns
data. It does no file I/O, and it knows nothing about gates, bundles, or
the record index. Three callers share it instead of each keeping a private
regex:

- ``shared/build_index.py``
- ``plugins/implement/scripts/verify_gate.py``
- ``plugins/artifact/scripts/build_builds_view.py``

Every row that looks like a slice row (a leading cell of digits) but does
not parse cleanly against either shape lands in ``ParsedSliceTable.unparsed``
as its raw text. Nothing here guesses at a row it cannot parse. A caller
that needs to resolve a slice to an epic makes that decision itself, from
the header ids this module already separated out.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field

# A slice row with all six columns. The Epic cell is unrestricted, because
# an authored row can leave it blank (the epic comes from the header row
# above it, not from this cell) — only Score and State exclude "|" outright,
# which is what keeps them from being swallowed into "ends with" by a
# greedy match reaching for the end of the line.
_ROW_RE_6COL = re.compile(
    r"^\|\s*(\d+)\s*\|\s*(.*?)\s*\|\s*(.+?)\s*\|\s*(.*?)\s*\|"
    r"\s*([^|]*?)\s*\|\s*([^|]*?)\s*\|\s*$"
)

# The legacy four-column shape, from a plan written before Score and State
# existed. No trailing columns to protect against, so this stays simple.
_ROW_RE_4COL = re.compile(
    r"^\|\s*(\d+)\s*\|\s*(.*?)\s*\|\s*(.+?)\s*\|\s*(.*?)\s*\|\s*$"
)

# A row whose leading cell is a run of digits: a candidate slice row,
# whether or not it goes on to parse. Used only to decide what counts as
# "unparsed" rather than plain prose or the separator row.
_CANDIDATE_ROW_RE = re.compile(r"^\|\s*\d+\s*\|")

# A cell that is nothing but a backticked span. A row's Epic cell states its
# id this way; this strips the backticks so callers see the bare text.
_BACKTICKED_CELL_RE = re.compile(r"^`([^`]+)`$")

# The em-dash marker inside an epic-header row's Epic cell: a backticked
# scoped id followed by an em dash (or an ASCII hyphen standing in for one).
_EPIC_HEADER_CELL_RE = re.compile(r"`([^`]+)`\s*[—–-]")


def _clean_epic_cell(raw: str) -> str:
    """Strip a wrapping pair of backticks from an Epic cell, if present.

    A well-formed row backticks its epic id. A row with a blank or
    otherwise unbackticked Epic cell keeps its raw text unchanged — the
    caller that needs a real id resolves it from the header row above,
    never from this cell.
    """
    match = _BACKTICKED_CELL_RE.match(raw)
    return match.group(1) if match else raw


@dataclass(frozen=True)
class SliceRow:
    """One parsed slice row.

    ``epic_id`` is the row's own Epic cell, with a wrapping pair of
    backticks stripped if present. It can be blank — a row is free to leave
    the epic to the header row above it — so a caller that needs to resolve
    a slice to an epic reads the header ids this module separates out,
    never this field alone. ``score`` and ``state`` are ``None`` on a
    legacy four-column row, and an empty string on a six-column row whose
    cell is blank.
    """

    n: int
    epic_id: str
    name: str
    ends_with: str
    score: str | None
    state: str | None
    raw: str


@dataclass(frozen=True)
class ParsedSliceTable:
    """The result of parsing one ``04-slices.md`` file's text."""

    rows: list[SliceRow] = field(default_factory=list)
    header_epic_ids: list[str] = field(default_factory=list)
    unparsed: list[str] = field(default_factory=list)


def parse_header_epic_id(line: str) -> str | None:
    """Return the raw epic id of an epic-header row, or ``None``.

    An epic-header row has an empty "#" cell, and every cell after Epic is
    also empty. The id is the text between the backticks in the Epic cell,
    unvalidated. A malformed header line — for example one with text left
    in a trailing cell — returns ``None`` rather than a guessed id.
    """
    stripped = line.strip()
    if not stripped.startswith("|") or not stripped.endswith("|"):
        return None
    cells = [c.strip() for c in stripped.split("|")]
    inner = cells[1:-1]
    if len(inner) < 2:
        return None
    if inner[0]:
        return None
    if any(inner[2:]):
        return None
    match = _EPIC_HEADER_CELL_RE.search(inner[1])
    if not match:
        return None
    return match.group(1)


def parse_row(line: str) -> SliceRow | None:
    """Return the slice row a line encodes, or ``None`` if it is not one.

    Tries the six-column shape first, then falls back to the legacy
    four-column shape. Returns ``None`` for a header row, the separator
    row, prose, or a row that matches neither shape.
    """
    stripped = line.strip()
    match = _ROW_RE_6COL.match(stripped)
    if match:
        number, epic_cell, name, ends_with, score, state = match.groups()
        return SliceRow(
            n=int(number),
            epic_id=_clean_epic_cell(epic_cell),
            name=name,
            ends_with=ends_with,
            score=score,
            state=state,
            raw=stripped,
        )
    match = _ROW_RE_4COL.match(stripped)
    if match:
        number, epic_cell, name, ends_with = match.groups()
        return SliceRow(
            n=int(number),
            epic_id=_clean_epic_cell(epic_cell),
            name=name,
            ends_with=ends_with,
            score=None,
            state=None,
            raw=stripped,
        )
    return None


def parse_table(text: str) -> ParsedSliceTable:
    """Parse a full ``04-slices.md`` file's text.

    Walks the file line by line. Each line is, in order: an epic-header
    row, a slice row, a candidate slice row that failed to parse (reported
    in ``unparsed`` with its raw text), or none of those (prose, the title
    row, the separator row), which this function silently skips, matching
    every caller's existing tolerance for surrounding narrative text.
    """
    result = ParsedSliceTable()
    for line in text.splitlines():
        stripped = line.strip()
        header_id = parse_header_epic_id(stripped)
        if header_id is not None:
            result.header_epic_ids.append(header_id)
            continue
        row = parse_row(stripped)
        if row is not None:
            result.rows.append(row)
            continue
        if _CANDIDATE_ROW_RE.match(stripped):
            result.unparsed.append(stripped)
    return result
