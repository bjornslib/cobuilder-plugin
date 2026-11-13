"""The folder table of the whole-repository record: the edges and the ratios of each folder.

A folder gets a row when it holds FOLDER_MIN_CODE code files. An edge is an import between two
code files of the input set. A ratio with no edge to count is None. The rules follow epic E6,
step D4, and the import groups come from the reader of epic E1, step A9.
"""
from __future__ import annotations

from collections import Counter
from pathlib import Path
from typing import Any

from .boundary import import_groups
from .config import Config
from .locality import Graph
from .names import folder_of, is_code, is_test_name

FOLDER_MIN_CODE = 3
Edges = tuple[int, int, int]


def folder_table(
    root: Path, files: list[str], graph: Graph, config: Config, notes: list[str]
) -> list[dict[str, Any]]:
    """Return one row for each folder that holds FOLDER_MIN_CODE code files, sorted by folder."""
    code = [rel for rel in files if is_code(rel, config)]
    internal, outgoing, incoming = _edge_counts(graph, set(code))
    by_folder: dict[str, list[str]] = {}
    for rel in code:
        by_folder.setdefault(folder_of(rel), []).append(rel)
    rows: list[dict[str, Any]] = []
    for folder, members in sorted(by_folder.items()):
        if len(members) < FOLDER_MIN_CODE:
            continue
        edges = (internal[folder], outgoing[folder], incoming[folder])
        groups = _groups(root, folder, files, notes)
        rows.append(_row(folder, members, edges, groups, config))
    return rows


def _edge_counts(graph: Graph, code: set[str]) -> tuple[Counter[str], Counter[str], Counter[str]]:
    """Return the internal, outgoing, and incoming edge counts of each folder.

    An edge joins two different code files. An edge inside one folder is internal. An edge
    across folders leaves the folder of its source and enters the folder of its target.
    """
    internal: Counter[str] = Counter()
    outgoing: Counter[str] = Counter()
    incoming: Counter[str] = Counter()
    for source, targets in graph.items():
        for target in targets:
            if target == source or source not in code or target not in code:
                continue
            here, there = folder_of(source), folder_of(target)
            if here == there:
                internal[here] += 1
            else:
                outgoing[here] += 1
                incoming[there] += 1
    return internal, outgoing, incoming


def _groups(root: Path, folder: str, files: list[str], notes: list[str]) -> list[list[str]]:
    """Return the import groups of one folder. A folder over the parse cap gives none and a note."""
    groups, problems = import_groups(folder, files, root)
    notes.extend(problems)
    return [list(group) for group in groups or ()]


def _row(
    folder: str, members: list[str], edges: Edges, groups: list[list[str]], config: Config
) -> dict[str, Any]:
    """Return one folder row with the keys of the record."""
    internal, out, incoming = edges
    tests = sum(1 for rel in members if is_test_name(rel, config))
    return {
        "folder": folder,
        "n": len(members),
        "internal": internal,
        "out": out,
        "in": incoming,
        "cf": _ratio(2 * internal, 2 * internal + out + incoming),
        "instability": _ratio(out, out + incoming),
        "groups": groups,
        "test_share": _ratio(tests, len(members)),
    }


def _ratio(part: int, whole: int) -> float | None:
    """Return part over whole, or None when the whole is zero."""
    return None if whole == 0 else part / whole
