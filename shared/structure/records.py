"""The line reader of the boundary records.

A record is a YAML file in docs/architecture/contexts. The reader takes only the
keys that the boundary check uses: id, path, allowed_dependencies, and
forbidden_dependencies. It needs no YAML library, so the coach stays standard
library only.
"""
from __future__ import annotations

import re

from .types import Boundary

_TOP_KEY = re.compile(r"^([A-Za-z_][A-Za-z0-9_]*):(?:\s+(.*))?$")
_PAIR = re.compile(r"^([A-Za-z_][A-Za-z0-9_]*):\s*(.*)$")
_ALLOWED = "allowed_dependencies"
_FORBIDDEN = "forbidden_dependencies"


def parse_record(text: str) -> Boundary | None:
    """Return the boundary that a record holds, or None when it has no id or no path."""
    scalars: dict[str, str] = {}
    allowed: list[str] = []
    forbidden: list[dict[str, str]] = []
    section = ""
    for line in text.split("\n"):
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue
        if not line[0].isspace() and not stripped.startswith("- "):
            section = _top_level(line, scalars)
        elif section == _ALLOWED and stripped.startswith("- "):
            allowed.append(_unquote(stripped[2:]))
        elif section == _FORBIDDEN:
            _forbidden_line(stripped, forbidden)
    return _boundary(scalars, allowed, forbidden)


def _top_level(line: str, scalars: dict[str, str]) -> str:
    """Store the value of a top-level key, and return the key as the current section."""
    match = _TOP_KEY.match(line)
    if match is None:
        return ""
    if match.group(2):
        scalars[match.group(1)] = _unquote(match.group(2))
    return match.group(1)


def _forbidden_line(stripped: str, forbidden: list[dict[str, str]]) -> None:
    """Add one line of the forbidden section to its entry. A dash starts a new entry."""
    body = stripped
    if body.startswith("- "):
        forbidden.append({})
        body = body[2:]
    pair = _PAIR.match(body)
    if pair is not None and forbidden:
        forbidden[-1][pair.group(1)] = _unquote(pair.group(2))


def _boundary(
    scalars: dict[str, str], allowed: list[str], forbidden: list[dict[str, str]]
) -> Boundary | None:
    """Return the boundary of the parsed keys, or None when the id or the path is missing."""
    context = scalars.get("id", "")
    path = scalars.get("path", "").rstrip("/")
    if not context or not path:
        return None
    rules = tuple(
        (entry["target"], entry.get("why", "")) for entry in forbidden if "target" in entry
    )
    return Boundary(context, path, tuple(allowed), rules)


def _unquote(value: str) -> str:
    """Return the value without spaces around it, and without one pair of matching quotes."""
    value = value.strip()
    if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
        return value[1:-1]
    return value
