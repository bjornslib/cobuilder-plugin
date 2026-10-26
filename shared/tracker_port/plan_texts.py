"""The title and the text fields of plan records. They come from goal.json, the epic design file, and the slice table."""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any


def goal_of(plans_dir: Path, design: str) -> dict[str, Any] | None:
    # The goal.json of a design. None means the design has no readable goal.json.
    path = plans_dir.parent / "architecture" / "designs" / design / "goal.json"
    try:
        goal = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None
    return goal if isinstance(goal, dict) else None


def _text(value: Any) -> str | None:
    return value if isinstance(value, str) and value else None


def clean_name(name: str | None) -> str | None:
    """A table cell is bold markdown. The tracker title is plain text: the bold lead, with no markers."""
    if not name:
        return name
    text = name.strip()
    if text.startswith("**"):
        text = text[2:]
    head, marker, _rest = text.partition("**")
    return (head if marker else text).strip().rstrip(".").strip() or name.strip()


def _relative(plans_dir: Path, path: Path) -> str:
    # A path in the repo root form, such as docs/plans/x/epic-E1-design.md, so every machine holds the same text.
    return Path(os.path.relpath(path, plans_dir.parent.parent)).as_posix()


def program_texts(plans_dir: Path, program: str) -> dict[str, str | None]:
    # The program takes its name from the design of its own name, else the plan folder name.
    goal = goal_of(plans_dir, program) or {}
    done_when = goal.get("done_when")
    lines = [item for item in done_when if isinstance(item, str) and item] if isinstance(done_when, list) else []
    folder = plans_dir.parent / "architecture" / "designs" / program
    return {
        "title": _text(goal.get("title")) or program,
        "description": _text(goal.get("outcome")),
        "acceptance_criteria": "\n".join(lines) or None,
        "design": _relative(plans_dir, folder) if folder.is_dir() else None,
    }


def epic_texts(plans_dir: Path | None, program: str, epic_id: str, name: str | None = None) -> dict[str, str | None]:
    # The design is the epic id prefix, as in "plugin-split/E1". The plan folder name is the fallback.
    if plans_dir is None:
        return {"title": clean_name(name)}
    design, _, local_id = epic_id.rpartition("/")
    entry: dict[str, Any] = {}
    for candidate in dict.fromkeys((design or program, program)):
        goal = goal_of(plans_dir, candidate) or {}
        entries = goal.get("epics")
        found = [e for e in entries if isinstance(e, dict) and e.get("id") == local_id] if isinstance(entries, list) else []
        if found:
            entry = found[0]
            break
    file = plans_dir / program / f"epic-{local_id}-design.md"
    return {
        "title": clean_name(name) or _text(entry.get("title")),
        "description": _text(entry.get("outcome")),
        "design": _relative(plans_dir, file) if file.is_file() else None,
    }
