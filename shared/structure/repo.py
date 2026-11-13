"""The whole-repository record of epic E6, for review mode and maintenance mode.

repo_findings runs each signal on every file that no excluded path holds. It ranks the findings
by change count, and it adds the folder table. The record has the keys of epic E6, step D5.
compare_findings tags two records by key. A step that fails gives one not_analysed line, and the
other steps still run. The signals sit in the repo_* modules beside this one.
"""
from __future__ import annotations

import contextlib
from collections.abc import Iterator
from pathlib import Path
from typing import Any

from .config import Config, drop_excluded, load_config
from .git import GitError, commit_file_sets, head_commit, repo_files, repo_top
from .locality import Graph, import_graph
from .names import is_code, is_product
from .repo_folders import folder_table
from .repo_groups import co_change_groups, duplicate_groups, twin_names
from .repo_rank import ranked_rows
from .repo_signals import (
    boundary_findings,
    crowded_findings,
    drift_findings,
    generic_findings,
    locality_findings,
    stem_findings,
)
from .repo_trend import apply_trend, compare_findings
from .slice_edges import Parser, read_records
from .types import Finding

__all__ = [
    "change_counts", "compare_findings", "empty_record", "folder_table",
    "record_here", "repo_findings",
]

SCHEMA = 1
WINDOW_DAYS = 90
WIDE_DAYS = 365
MIN_COMMITS = 20
CO_CHANGE_DAYS = 365


def repo_findings(root: Path, since: str | None, parse: Parser | None = None) -> dict[str, Any]:
    """Return the record of the repo at root. A since commit gives the base of contract drift.

    The parse function reads each boundary record in full. Without one, the line reader does.
    """
    config = load_config(root)
    notes = [] if config.problem is None else [config.problem]
    files: list[str] = []
    with _guarded("the file list", notes):
        files = _input_files(root, config, notes)
    commit: str | None = None
    with _guarded("the commit", notes):
        commit = head_commit(root)
    counts, window = _history(root, notes)
    findings = _file_findings(root, files, config, parse, notes)
    findings += _group_findings(root, files, config, notes)
    graph = _import_graph(root, files, config, notes)
    product = [rel for rel in files if is_product(rel, config)]
    product_graph = {src: targets for src, targets in graph.items() if is_product(src, config)}
    findings += locality_findings(product_graph, product)
    if since is not None:
        with _guarded("contract drift", notes):
            findings += drift_findings(root, since, config, notes)
    return {
        "schema": SCHEMA,
        "commit": commit,
        "since": since,
        "window_days": window,
        "findings": ranked_rows(findings, counts, files),
        "folders": _folders(root, files, graph, config, notes),
        "not_analysed": list(dict.fromkeys(notes)),
    }


def empty_record(since: str | None, note: str) -> dict[str, Any]:
    """Return a record with no finding and one not_analysed line, for a repo that cannot be read."""
    return {
        "schema": SCHEMA,
        "commit": None,
        "since": since,
        "window_days": WINDOW_DAYS,
        "findings": [],
        "folders": [],
        "not_analysed": [note],
    }


def record_here(
    since: str | None, parse: Parser | None, compare: str | None = None
) -> dict[str, Any]:
    """Return the record of the repo that holds the working folder. A git error gives a note.

    With compare, each finding gets its trend from the record at that path.
    """
    try:
        root = repo_top(Path.cwd())
    except GitError as error:
        return empty_record(since, " ".join(f"not analysed: {error}".split()))
    record = repo_findings(root, since, parse)
    if compare is not None:
        apply_trend(record, Path(compare))
    return record


def change_counts(root: Path, days: int = WINDOW_DAYS) -> dict[str, int]:
    """Return the number of commits of the last days that change each path."""
    counts: dict[str, int] = {}
    for names in commit_file_sets(root, days):
        for name in set(names):
            counts[name] = counts.get(name, 0) + 1
    return counts


def _history(root: Path, notes: list[str]) -> tuple[dict[str, int], int]:
    """Return the change count of each path, and the window of those counts in days.

    The window is 90 days. It widens to 365 days when the 90-day window holds fewer than 20 commits.
    """
    window = WINDOW_DAYS
    with _guarded("the change window", notes):
        recent = len(commit_file_sets(root, WINDOW_DAYS))
        window = WINDOW_DAYS if recent >= MIN_COMMITS else WIDE_DAYS
    counts: dict[str, int] = {}
    with _guarded("the change counts", notes):
        counts = change_counts(root, window)
    return counts, window


def _input_files(root: Path, config: Config, notes: list[str]) -> list[str]:
    """Return the sorted files that no excluded path holds and that the work tree still has."""
    kept, dropped = drop_excluded(repo_files(root), config)
    notes.extend(dropped)
    return sorted(rel for rel in kept if (root / rel).is_file())


def _file_findings(
    root: Path, files: list[str], config: Config, parse: Parser | None, notes: list[str]
) -> list[Finding]:
    """Return the findings of the folder, name-family, generic-name, and boundary signals."""
    found: list[Finding] = []
    with _guarded("the crowded folders", notes):
        found += crowded_findings(files, config, notes)
    with _guarded("the name families", notes):
        found += stem_findings(files, config)
    found += generic_findings(files, config)
    with _guarded("the boundary edges", notes):
        boundaries, problems = read_records(root, parse)
        notes.extend(problems)
        found += boundary_findings(root, files, boundaries, notes)
    return found


def _group_findings(
    root: Path, files: list[str], config: Config, notes: list[str]
) -> list[Finding]:
    """Return the findings of the twin-name, co-change, and duplicate-group signals."""
    found = twin_names(files, config)
    with _guarded("the co-change groups", notes):
        commits = commit_file_sets(root, CO_CHANGE_DAYS)
        found += co_change_groups(commits, set(files), config)
    with _guarded("the duplicate groups", notes):
        found += duplicate_groups(root, files, config)
    return found


def _import_graph(root: Path, files: list[str], config: Config, notes: list[str]) -> Graph:
    """Return the import graph of the code files. A read failure gives an empty graph and a note."""
    graph: Graph = {}
    with _guarded("the import graph", notes):
        graph, problems = import_graph(root, [rel for rel in files if is_code(rel, config)])
        notes.extend(problems)
    return graph


def _folders(
    root: Path, files: list[str], graph: Graph, config: Config, notes: list[str]
) -> list[dict[str, Any]]:
    """Return the folder table. A failure gives an empty table and a note."""
    rows: list[dict[str, Any]] = []
    with _guarded("the folder table", notes):
        rows = folder_table(root, files, graph, config, notes)
    return rows


@contextlib.contextmanager
def _guarded(label: str, notes: list[str]) -> Iterator[None]:
    """Turn a read failure of one step into one not_analysed line, so the other steps still run."""
    try:
        yield
    except (GitError, OSError, ValueError) as error:
        notes.append(" ".join(f"not analysed for {label}: {error}".split()))
