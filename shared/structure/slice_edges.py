"""Boundary edges on the slice diff, and the prose rules of the touched contexts.

The reader of boundary.py finds each reference. A new file gives the edges on every line.
A modified file gives the edges on its added lines only. A forbidden target that is prose
has no path glob, so the script cannot match it, and the packet gives it to VALIDATE as a
rule to judge.

When the caller passes a YAML parser, each record is read in full, so a flow list such as
[shared] counts. Else the line reader reads the records, and it misses a flow list. The
parser comes from the entry point, because this package uses the standard library only.
"""
from __future__ import annotations

from collections.abc import Callable
from pathlib import Path
from typing import Any

from .boundary import (
    CONTEXTS_GLOB,
    boundary_edges,
    context_of,
    path_globs,
    read_boundaries,
    scan_file,
)
from .git import added_lines
from .records import parse_record
from .types import Boundary

Parser = Callable[[str], Any]
NO_YAML_NOTE = "pyyaml did not load, so the line reader read the boundary records."


def read_records(root: Path, parse: Parser | None) -> tuple[list[Boundary], list[str]]:
    """Return the boundary records of the repo, and the lines of each record that was not read.

    The parse function returns the YAML data of a text, or None when it cannot read the text.
    Without a parse function, the line reader reads every record.
    """
    if parse is None:
        boundaries, notes = read_boundaries(root)
        return boundaries, [*notes, NO_YAML_NOTE]
    boundaries: list[Boundary] = []
    notes: list[str] = []
    for path in sorted(root.glob(CONTEXTS_GLOB)):
        record = _record_of(path, parse)
        if record is None:
            rel = path.relative_to(root).as_posix()
            notes.append(f"{rel}: not analysed, the record cannot be read.")
        else:
            boundaries.append(record)
    return boundaries, notes


def edge_findings(
    root: Path, rel: str, boundaries: list[Boundary], lines: set[int] | None
) -> tuple[list[dict[str, Any]], list[str]]:
    """Return the boundary-edge findings of one file on the given lines, or on all lines.

    The lines are None for a new file. The second value holds the not_analysed line of the
    file, when the file does not parse.
    """
    if context_of(rel, boundaries) is None:
        return [], []
    scan = scan_file(rel, root, [record.path for record in boundaries])
    refs = [ref for ref in scan.references if lines is None or ref.line in lines]
    found = boundary_edges(rel, refs, boundaries)
    findings = [
        {"signal": item.signal, "path": item.path, "facts": dict(item.facts)} for item in found
    ]
    return findings, [] if scan.problem is None else [scan.problem]


def edge_part(
    root: Path, base: str, added: list[str], modified: list[str], boundaries: list[Boundary]
) -> tuple[list[dict[str, Any]], list[str]]:
    """Return the boundary-edge findings of the diff. A new file counts on every line."""
    findings: list[dict[str, Any]] = []
    notes: list[str] = []
    for rel in added:
        found, problems = edge_findings(root, rel, boundaries, None)
        findings.extend(found)
        notes.extend(problems)
    for rel in modified:
        found, problems = edge_findings(root, rel, boundaries, set(added_lines(root, base, rel)))
        findings.extend(found)
        notes.extend(problems)
    return findings, notes


def prose_rules(files: list[str], boundaries: list[Boundary]) -> list[dict[str, str]]:
    """Return each prose forbidden target of each context that the diff touches."""
    touched: dict[str, Boundary] = {}
    for rel in files:
        record = context_of(rel, boundaries)
        if record is not None:
            touched[record.id] = record
    return [
        {"context": record.id, "target": target, "why": why}
        for record in touched.values()
        for target, why in record.forbidden
        if not path_globs(target)
    ]


def _record_of(path: Path, parse: Parser) -> Boundary | None:
    """Return the record of one file, read in full when the parse function can read it.

    A text that the parse function cannot read goes to the line reader. A file that cannot
    be read gives None.
    """
    try:
        text = path.read_text(encoding="utf-8")
    except (OSError, ValueError):
        return None
    data = parse(text)
    if data is None:
        return parse_record(text)
    return boundary_from_mapping(data) if isinstance(data, dict) else None


def boundary_from_mapping(data: dict[str, Any]) -> Boundary | None:
    """Return the boundary of a parsed record, or None when it has no id or no path."""
    context = str(data.get("id") or "")
    path = str(data.get("path") or "").rstrip("/")
    if not context or not path:
        return None
    allowed = tuple(str(name) for name in _listed(data.get("allowed_dependencies")))
    forbidden = tuple(
        (str(entry["target"]), str(entry.get("why") or ""))
        for entry in _listed(data.get("forbidden_dependencies"))
        if isinstance(entry, dict) and "target" in entry
    )
    return Boundary(context, path, allowed, forbidden)


def _listed(value: Any) -> list[Any]:
    """Return the value when it is a list, and an empty list otherwise."""
    return value if isinstance(value, list) else []
