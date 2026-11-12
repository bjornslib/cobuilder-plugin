"""Facts about new files, for the structure coaching.

The module reports facts and does not judge them. It uses the standard library
only, so the coach can import it without uv. A git error or a bad config never
raises. The report names the problem in not_analysed. The command prints JSON.

Usage: python3 structure_signals.py --file <path> [--file <path>] | --survey | --defaults
"""
from __future__ import annotations

import argparse
import dataclasses
import json
import os
import sys
from pathlib import Path

# The sibling modules sit beside this file. The folder goes on sys.path before the imports,
# because the tests load this file by its path.
_HERE = os.path.dirname(os.path.abspath(__file__))
if _HERE not in sys.path:
    sys.path.insert(0, _HERE)

from structure_config import (
    Config,
    config_json,
    drop_excluded,
    excluded_by,
    load_config,
)
from structure_folders import crowded_folder, folder_counts, folder_limit
from structure_git import GitError, new_files, repo_files, repo_top
from structure_names import (
    generic_name,
    is_test_name,
    split_tokens,
    stem_cluster,
)
from structure_types import Finding, Report

__all__ = [
    "Config",
    "Finding",
    "GitError",
    "Report",
    "crowded_folder",
    "excluded_by",
    "folder_counts",
    "folder_limit",
    "generic_name",
    "is_test_name",
    "load_config",
    "main",
    "new_files",
    "repo_files",
    "signals_for",
    "split_tokens",
    "stem_cluster",
    "survey",
]


def _no_limit_reason(config: Config) -> str:
    """Return the note for a crowded-folder check that cannot run."""
    return (
        f"crowded-folder not run: fewer than {config.min_folders} folders hold files, "
        "and no folder limit applies."
    )


def _problem_notes(config: Config) -> tuple[str, ...]:
    """Return the problem note of the config as a tuple of zero or one line."""
    return () if config.problem is None else (config.problem,)


def _findings(
    rel: str, files: list[str], config: Config
) -> tuple[tuple[Finding, ...], tuple[str, ...]]:
    """Return the findings of the three signals, and the note of a check that did not run."""
    counts = folder_counts(files)
    limit = folder_limit(counts, config)
    crowded = None if limit is None else crowded_folder(rel, files, counts, limit, config)
    notes = () if limit is not None else (_no_limit_reason(config),)
    found = (crowded, stem_cluster(rel, files, config), generic_name(rel, config))
    return tuple(item for item in found if item is not None), notes


def _report(path: str, root: Path, config: Config) -> Report:
    """Return the report for one file. Each step ends the check when it gives no work."""
    try:
        top = repo_top(root)
        rel = os.path.relpath(os.path.realpath(path), top)
    except GitError as error:
        return Report((), (f"not analysed: {error}",))
    glob = excluded_by(rel, config)
    if glob is not None:
        return Report((), (f"{rel} is not analysed: it matches {glob}.",))
    try:
        if rel not in new_files(top):
            return Report((), ())
        files, dropped = drop_excluded(repo_files(top), config)
    except GitError as error:
        return Report((), (f"not analysed: {error}",))
    findings, notes = _findings(rel, files, config)
    return Report(findings, dropped + notes)


def signals_for(path: str, root: Path, config: Config) -> Report:
    """Return the findings for one written file. The root is any folder of the repo.

    A problem with the config goes first in not_analysed.
    """
    report = _report(path, root, config)
    return Report(report.findings, _problem_notes(config) + report.not_analysed)


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


def _files_report(paths: list[str]) -> dict[str, object]:
    """Return the findings and the not_analysed lines of each file, in one report."""
    findings: list[dict[str, object]] = []
    notes: list[str] = []
    for path in paths:
        root = Path(os.path.dirname(os.path.abspath(path)))
        report = signals_for(path, root, load_config(root))
        findings.extend(dataclasses.asdict(finding) for finding in report.findings)
        notes.extend(report.not_analysed)
    return {"findings": findings, "not_analysed": notes}


def _parser() -> argparse.ArgumentParser:
    """Return the parser. Exactly one of the three options is required."""
    parser = argparse.ArgumentParser(description="Print the structure facts of new files as JSON.")
    modes = parser.add_mutually_exclusive_group(required=True)
    modes.add_argument(
        "--file", action="append", metavar="PATH", help="a new file to check, repeatable"
    )
    modes.add_argument(
        "--survey", action="store_true", help="the folders over the limit in this repo"
    )
    modes.add_argument("--defaults", action="store_true", help="the default config as JSON")
    return parser


def main(argv: list[str]) -> int:
    """Print the JSON of one option. Return 0, or 2 for a usage error."""
    try:
        args = _parser().parse_args(argv)
    except SystemExit as error:
        return int(error.code or 0)
    if args.defaults:
        data: dict[str, object] = config_json(Config())
    elif args.survey:
        data = survey(Path.cwd())
    else:
        data = _files_report(args.file)
    print(json.dumps(data, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
