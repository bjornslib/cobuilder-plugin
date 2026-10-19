#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = []
# ///
"""The one parser for the gate blocks of a plan's ``00-status.md``.

A gate block is one gate line plus its optional view line. The gate line
names the gate and its approval state, and nothing else. The link a
workflow prints for the gate lives on its own ``view:`` line directly under
the gate line, indented two spaces (ADR-0032, amendment of 2026-09-28).
The URL is the full deep link that View mode prints, so it names a
machine-specific local server and its port, and the absolute form never
enters a derived payload.

Two consumers read the same authored block: ``build_index.py`` projects gate
steps for the record index, and ``build_builds_view.py`` projects them for
the Builds view page's payload. This module is the one place the block is
parsed, on the lesson of ``slice_table.py``: divergent parsers of one table
needed one edit per format change, and the same failure returns with two
parsers of one line. The two facts the old suffix format rode on one string
— the approval state and the link — now live on two lines, so no reader has
to split them.

The projection keeps the portable fact and drops the machine-specific one.
``view`` carries the route fragment from the link's first ``#``, such as
``#/review-link/build/plan/product``. A link token with no ``#`` is kept
whole. A gate block with no ``view:`` line yields ``view=None``.
``verify_gate.py`` reads the same blocks through this module. It checks
only that a link exists, not the URL itself.
"""
from __future__ import annotations

import re

# The gate line. The dash tolerance `[—–-]` matches the repo's house style,
# and the gate number accepts a letter suffix, so "Gate 2b" parses.
GATE_LINE_RE = re.compile(r"^-\s*Gate\s*(\d+\w?)\s*[—–-]\s*([^:]+):\s*(.+)$")

# The view line. The leading whitespace is what makes it a sub-line of the
# gate line above it: a top-level `view:` word is not a link.
VIEW_LINE_RE = re.compile(r"^\s+view:\s*(\S+)\s*$")

# 00-status.md's Gate 2b line, e.g.:
#   - Gate 2b — Interaction design: APPROVED 2026-09-14
#   - Gate 2b — Interaction design: n/a (no UI) — Screens: "none"
STATUS_2B_RE = re.compile(
    r"^\s*-\s*Gate\s*2b\b.*?:\s*(APPROVED\b.*|pending|in progress|n/a.*)\s*$",
    re.IGNORECASE,
)


def view_route(token: str) -> str:
    """The portable route fragment of one view link.

    The fragment starts at the token's first ``#``, so the machine-specific
    scheme, host, and port drop away. A token with no ``#`` carries no
    fragment to cut, so it is kept whole.
    """
    hash_at = token.find("#")
    return token[hash_at:] if hash_at >= 0 else token


def parse_status_gates(status_text: str) -> list[dict]:
    """Every gate block in a ``00-status.md``, in document order.

    One gate line plus its optional directly-following indented ``view:``
    line yields one step: ``n``, ``name``, ``state``, and ``view``. ``view``
    is None when the block carries no link. The ``view:`` line is directly
    adjacent; any other line between the two ends the block, and the gate
    then carries no link. The 4a, 4b, and 4c sub-lines under Gate 4 are not
    gate lines, because they name no gate.
    """
    lines = status_text.splitlines()
    gates: list[dict] = []
    for i, line in enumerate(lines):
        match = GATE_LINE_RE.match(line.strip())
        if not match:
            continue
        gate = {
            "n": match.group(1),
            "name": match.group(2).strip(),
            "state": match.group(3).strip(),
            "view": None,
        }
        if i + 1 < len(lines):
            view_match = VIEW_LINE_RE.match(lines[i + 1])
            if view_match:
                gate["view"] = view_route(view_match.group(1))
        gates.append(gate)
    return gates


# An approved gate state carries its date: "APPROVED 2026-09-14 ...".
APPROVED_DATE_RE = re.compile(r"^APPROVED\s+(\d{4}-\d{2}-\d{2})", re.IGNORECASE)

# The Gate 4 sub-lines, such as "- 4b Epic designs: APPROVED 2026-09-20". They name no gate.
GATE4_SUBSTEP_RE = re.compile(r"^-\s*(4[abc])\b.*?:\s*(.+)$")


def approved_date(state: str) -> str | None:
    """The ``YYYY-MM-DD`` date of an approved gate state, or None."""
    match = APPROVED_DATE_RE.match(state.strip())
    return match.group(1) if match else None


def parse_gate4_substeps(status_text: str) -> dict[str, str]:
    """The state of each Gate 4 sub-line, keyed ``4a``, ``4b``, or ``4c``.

    The first sub-line for a key wins. A key with no sub-line is absent.
    """
    steps: dict[str, str] = {}
    for line in status_text.splitlines():
        match = GATE4_SUBSTEP_RE.match(line.strip())
        if match and match.group(1) not in steps:
            steps[match.group(1)] = match.group(2).strip()
    return steps