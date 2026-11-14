"""The boundary edge and the import groups of the structure signals.

The boundary records of docs/architecture/contexts give each context its rules.
A reference is an import that resolves to a repo file, or a path string that starts
with a boundary path. E4 and E6 reuse these functions.
"""
from __future__ import annotations

import fnmatch
import tokenize
from collections.abc import Sequence
from pathlib import Path

from .config import Config
from .names import folder_of
from .python_refs import python_refs
from .records import parse_record
from .source import language_of, read_source, relative_path
from .ts_refs import ts_refs
from .types import Boundary, Finding, Reference, Scan

CONTEXTS_GLOB = "docs/architecture/contexts/*/boundary.yaml"
CACHE_PREFIX = "plugins/cache/"
_SIGNAL = "boundary-edge"


def read_boundaries(root: Path) -> tuple[list[Boundary], list[str]]:
    """Return the boundary records of the repo, and one line for each record that is not read.

    The root is the repo top folder.
    """
    boundaries: list[Boundary] = []
    notes: list[str] = []
    for path in sorted(root.glob(CONTEXTS_GLOB)):
        try:
            record = parse_record(path.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            record = None
        if record is None:
            rel = path.relative_to(root).as_posix()
            notes.append(f"{rel}: not analysed, the boundary record cannot be read.")
        else:
            boundaries.append(record)
    return boundaries, notes


def context_of(rel: str, boundaries: Sequence[Boundary]) -> Boundary | None:
    """Return the record with the longest path that holds rel, or None when no record does."""
    owners = [
        record for record in boundaries
        if rel == record.path or rel.startswith(record.path + "/")
    ]
    return max(owners, key=lambda record: len(record.path), default=None)


def references(path: str, root: Path) -> list[Reference]:
    """Return the outgoing references of one file. The root is the repo top folder.

    A file that does not parse, or cannot be read, gives no references.
    """
    boundaries, _ = read_boundaries(root)
    scan = scan_file(relative_path(path, root), root, [record.path for record in boundaries])
    return list(scan.references)


def scan_file(rel: str, top: Path, paths: Sequence[str]) -> Scan:
    """Return the references of one repo file, and the line that says why it was not read.

    The paths are the boundary paths that a path string must start with.
    """
    language = language_of(rel)
    if language is None:
        return Scan((), None)
    try:
        text = read_source(rel, top)
        if language == "python":
            found = python_refs(rel, text, top, list(paths))
        else:
            found = ts_refs(rel, text, top, list(paths))
    except (OSError, ValueError, SyntaxError, tokenize.TokenError) as error:
        problem = f"{rel}: not analysed, the file cannot be read or does not parse ({error})."
        return Scan((), problem)
    return Scan(tuple(sorted(found, key=lambda ref: (ref.line, ref.target))), None)


def import_groups(
    folder: str, rels: Sequence[str], top: Path, config: Config
) -> tuple[tuple[tuple[str, ...], ...] | None, tuple[str, ...]]:
    """Return the import groups of the code files in one folder, and the lines that say why.

    Two files join one group when one imports the other. A group holds two or more
    files, and the largest group comes first. A folder with more than
    config.parse_cap code files is not read, so the groups are None.
    """
    siblings = sorted(rel for rel in rels if folder_of(rel) == folder and language_of(rel))
    if len(siblings) > config.parse_cap:
        note = (
            f"{folder}: {len(siblings)} code files, over the parse cap of {config.parse_cap}. "
            "The import groups are not read."
        )
        return None, (note,)
    members = set(siblings)
    edges: list[tuple[str, str]] = []
    notes: list[str] = []
    for rel in siblings:
        scan = scan_file(rel, top, ())
        if scan.problem is not None:
            notes.append(scan.problem)
        for ref in scan.references:
            if ref.kind == "import" and ref.target in members and ref.target != rel:
                edges.append((rel, ref.target))
    return connected_groups(siblings, edges), tuple(notes)


def connected_groups(names: list[str], edges: list[tuple[str, str]]) -> tuple[tuple[str, ...], ...]:
    """Return each set of two or more connected names, sorted, with the largest set first."""
    parent = {name: name for name in names}

    def root_of(name: str) -> str:
        while parent[name] != name:
            name = parent[name]
        return name

    for left, right in edges:
        parent[root_of(left)] = root_of(right)
    sets: dict[str, list[str]] = {}
    for name in names:
        sets.setdefault(root_of(name), []).append(name)
    groups = [tuple(sorted(members)) for members in sets.values() if len(members) > 1]
    return tuple(sorted(groups, key=lambda group: (-len(group), group)))


def boundary_edges(
    rel: str, refs: Sequence[Reference], boundaries: Sequence[Boundary]
) -> list[Finding]:
    """Return one finding for each reference that breaks a rule of the file's context.

    A reference to the install cache gives no finding. A file with no context gives none.
    """
    source = context_of(rel, boundaries)
    if source is None:
        return []
    findings: list[Finding] = []
    for ref in refs:
        if ref.target.startswith(CACHE_PREFIX):
            continue
        for kind, to_name, rule in _breaks(ref, source, boundaries):
            facts = {
                "line": ref.line,
                "text": ref.text,
                "from_context": source.id,
                "to_context": to_name,
                "kind": kind,
                "rule": rule,
                "in_comment": ref.in_comment,
            }
            findings.append(Finding(_SIGNAL, rel, folder_of(rel), facts))
    return findings


def _breaks(
    ref: Reference, source: Boundary, boundaries: Sequence[Boundary]
) -> list[tuple[str, str | None, str]]:
    """Return each rule that one reference breaks, as (kind, to context, rule)."""
    target = context_of(ref.target, boundaries)
    to_name = None if target is None else target.id
    breaks: list[tuple[str, str | None, str]] = []
    if target is not None and target.id != source.id and target.id not in source.allowed:
        rule = f"allowed_dependencies of {source.id} does not name {target.id}"
        breaks.append(("outside-allowed", to_name, rule))
    for glob_target, why in source.forbidden:
        if any(fnmatch.fnmatchcase(ref.target, glob) for glob in path_globs(glob_target)):
            rule = f"forbidden_dependencies names {glob_target}: {why}"
            breaks.append(("forbidden-glob", to_name, rule))
    return breaks


def path_globs(target: str) -> list[str]:
    """Return the path globs of a forbidden target. Prose has no glob, so it gives none."""
    return [
        part for part in target.split(", ")
        if " " not in part and any(mark in part for mark in "*?[/")
    ]


def boundary_check(rel: str, top: Path) -> tuple[tuple[Finding, ...], tuple[str, ...]]:
    """Return the boundary-edge findings of one new file, and the lines of what was not analysed."""
    if language_of(rel) is None:
        return (), ()
    boundaries, notes = read_boundaries(top)
    if context_of(rel, boundaries) is None:
        no_context = f"{rel} is not analysed for boundaries: no boundary record covers it."
        return (), (*notes, no_context)
    scan = scan_file(rel, top, [record.path for record in boundaries])
    problems = () if scan.problem is None else (scan.problem,)
    return tuple(boundary_edges(rel, scan.references, boundaries)), (*notes, *problems)
