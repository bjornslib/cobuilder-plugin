"""The report of one new file: the findings of the signals, and the lines of what was not analysed.

The signals report facts and do not judge them. A git error or a bad config never
raises. The report names the problem in not_analysed. The survey lists the folders
over the limit.
"""
from __future__ import annotations

import posixpath
from dataclasses import replace
from pathlib import Path

from .boundary import boundary_check, import_groups
from .config import Config, drop_excluded, excluded_by, load_config
from .folders import crowded_folder, folder_counts, folder_limit
from .git import GitError, new_files, repo_files, repo_top
from .names import (
    EXAMPLES_MAX,
    first_token,
    folder_of,
    generic_name,
    is_test_name,
    stem_cluster,
)
from .source import relative_path
from .types import Finding, Report


def _no_limit_reason(config: Config) -> str:
    """Return the note for a crowded-folder check that cannot run."""
    return (
        f"crowded-folder not run: fewer than {config.min_folders} folders hold files, "
        "and no folder limit applies."
    )


def _problem_notes(config: Config) -> tuple[str, ...]:
    """Return the problem note of the config as a tuple of zero or one line."""
    return () if config.problem is None else (config.problem,)


def _names_text(names: list[str] | tuple[str, ...]) -> str:
    """Return the base names of a group, separated by commas."""
    return ", ".join(posixpath.basename(name) for name in names)


def _family(rel: str, files: list[str], config: Config) -> list[str]:
    """Return the other non-test files of the folder of rel that share its first token."""
    token = first_token(rel)
    if token is None or is_test_name(rel, config):
        return []
    folder = folder_of(rel)
    return [
        name for name in sorted(files)
        if name != rel and folder_of(name) == folder and first_token(name) == token
        and not is_test_name(name, config)
    ]


def _group_facts(
    rel: str, files: list[str], top: Path, config: Config
) -> tuple[dict[str, object], tuple[str, ...]]:
    """Return the components and nearest_group facts, and the notes of the import reader.

    The import group of the file comes first. Without one, the name family of the file
    is the nearest group, and it names at most EXAMPLES_MAX files. Above the parse cap,
    the facts are absent.
    """
    groups, notes = import_groups(folder_of(rel), files, top)
    if groups is None:
        return {}, notes
    members = next((group for group in groups if rel in group), ())
    nearest = [name for name in members if name != rel]
    nearest = nearest or _family(rel, files, config)[:EXAMPLES_MAX]
    facts: dict[str, object] = {
        "components": "; ".join(_names_text(group) for group in groups),
        "nearest_group": _names_text(nearest) or None,
    }
    return facts, notes


def _findings(
    rel: str, files: list[str], config: Config, top: Path
) -> tuple[tuple[Finding, ...], tuple[str, ...]]:
    """Return the findings of the three name and folder signals, and the notes of the checks."""
    counts = folder_counts(files)
    limit = folder_limit(counts, config)
    notes: tuple[str, ...] = () if limit is not None else (_no_limit_reason(config),)
    crowded = None if limit is None else crowded_folder(rel, files, counts, limit, config)
    if crowded is not None:
        facts, group_notes = _group_facts(rel, files, top, config)
        crowded = replace(crowded, facts={**crowded.facts, **facts})
        notes = (*notes, *group_notes)
    found = (crowded, stem_cluster(rel, files, config), generic_name(rel, config))
    return tuple(item for item in found if item is not None), notes


def _report(path: str, root: Path, config: Config, folder_notes: bool) -> Report:
    """Return the report for one file. Each step ends the check when it gives no work."""
    try:
        top = repo_top(root)
    except GitError as error:
        return Report((), (f"not analysed: {error}",))
    rel = relative_path(path, top)
    glob = excluded_by(rel, config)
    if glob is not None:
        return Report((), (f"{rel} is not analysed: it matches {glob}.",))
    try:
        if rel not in new_files(top):
            return Report((), ())
        files, dropped = drop_excluded(repo_files(top), config)
    except GitError as error:
        return Report((), (f"not analysed: {error}",))
    findings, notes = _findings(rel, files, config, top)
    edges, edge_notes = boundary_check(rel, top)
    listed = dropped if folder_notes else ()
    return Report(findings + edges, listed + notes + edge_notes)


def signals_for(path: str, root: Path, config: Config, *, folder_notes: bool = True) -> Report:
    """Return the findings for one written file. The root is any folder of the repo.

    A problem with the config goes first in not_analysed. A repeated line appears once.
    The folder_notes flag adds the lines of the repo files that the folder counts leave out.
    """
    report = _report(path, root, config, folder_notes)
    notes = (*_problem_notes(config), *report.not_analysed)
    return Report(report.findings, tuple(dict.fromkeys(notes)))


def excluded_glob(path: str, root: Path, config: Config) -> str | None:
    """Return the glob that excludes the path, or None when no glob does or git fails."""
    try:
        return excluded_by(relative_path(path, repo_top(root)), config)
    except GitError:
        return None


def survey(root: Path) -> dict[str, object]:
    """Return each folder over the limit with its count, for the repo that holds root."""
    config = load_config(root)
    try:
        files, dropped = drop_excluded(repo_files(repo_top(root)), config)
    except GitError as error:
        notes = [*_problem_notes(config), f"not analysed: {error}"]
        return {"limit": None, "folders": [], "not_analysed": notes}
    counts = folder_counts(files)
    limit = folder_limit(counts, config)
    notes = [*_problem_notes(config), *dropped]
    if limit is None:
        notes.append(_no_limit_reason(config))
        return {"limit": None, "folders": [], "not_analysed": notes}
    folders = [
        {"folder": folder, "count": count}
        for folder, count in sorted(counts.items())
        if count > limit
    ]
    return {"limit": limit, "folders": folders, "not_analysed": notes}
