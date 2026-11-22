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

# The package sits beside this file. This folder goes on sys.path before the imports,
# because the tests load this file by its path. The package folder stays off the path,
# so that a module named types does not hide the standard library.
_HERE = os.path.dirname(os.path.abspath(__file__))
if _HERE not in sys.path:
    sys.path.insert(0, _HERE)

from structure.boundary import (
    boundary_edges,
    context_of,
    import_groups,
    read_boundaries,
    references,
)
from structure.config import Config, config_json, excluded_by, glob_line, load_config
from structure.folders import crowded_folder, folder_counts, folder_limit
from structure.git import GitError, new_files, repo_files
from structure.names import generic_name, is_test_name, split_tokens, stem_cluster
from structure.report import excluded_glob, signals_for, survey
from structure.types import Finding, Report

__all__ = [
    "Config",
    "Finding",
    "GitError",
    "Report",
    "boundary_edges",
    "context_of",
    "crowded_folder",
    "excluded_by",
    "folder_counts",
    "folder_limit",
    "generic_name",
    "import_groups",
    "is_test_name",
    "load_config",
    "main",
    "new_files",
    "read_boundaries",
    "references",
    "repo_files",
    "signals_for",
    "split_tokens",
    "stem_cluster",
    "survey",
]


def _files_report(paths: list[str]) -> dict[str, object]:
    """Return the findings and the not_analysed lines of the run.

    A file that a glob excludes adds one to the count of that glob. The run then gives
    one line for each glob, with the summed count. Every other line appears once. The
    folder lines of the repo stay out of the run, because --survey prints them.
    """
    findings: list[dict[str, object]] = []
    notes: list[str] = []
    skipped: dict[str, int] = {}
    for path in paths:
        root = Path(os.path.dirname(os.path.abspath(path)))
        config = load_config(root)
        if config.problem is not None:
            notes.append(config.problem)
        glob = excluded_glob(path, root, config)
        if glob is not None:
            skipped[glob] = skipped.get(glob, 0) + 1
            continue
        report = signals_for(path, root, config, folder_notes=False)
        findings.extend(dataclasses.asdict(finding) for finding in report.findings)
        notes.extend(report.not_analysed)
    notes.extend(glob_line(glob, count) for glob, count in skipped.items())
    return {"findings": findings, "not_analysed": list(dict.fromkeys(notes))}


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
