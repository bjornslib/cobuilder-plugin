"""The epic of each slice row in a slice table."""

from __future__ import annotations

from slice_table import parse_header_epic_id, parse_row


def _row_epics(text: str) -> dict[str, str]:
    # A row with a blank Epic cell belongs to the epic header above it. Maps each slice row's raw line to its epic.
    current = ""
    epics: dict[str, str] = {}
    for line in text.splitlines():
        header_id = parse_header_epic_id(line)
        if header_id is not None:
            current = header_id
            continue
        row = parse_row(line)
        if row is not None:
            epics[row.raw] = row.epic_id or current
    return epics
