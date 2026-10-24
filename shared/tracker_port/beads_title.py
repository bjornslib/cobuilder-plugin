"""The title rule of the beads adapter. Another tracker keeps its own rule."""

from __future__ import annotations

# The title rule of ADR-0044: an issue title is the name, not a copy of the cb id.
TITLE_RULE = "name"


def bd_title(cb_id: str, kind: str, name: str | None) -> str:
    # A pull request keeps its ref, and a record with no name keeps its cb id. TITLE_RULE sets the rest.
    if kind == "pr" or not name:
        return cb_id
    return name if TITLE_RULE == "name" else f"{cb_id} — {name}"
