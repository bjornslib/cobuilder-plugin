#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = ["pyyaml>=6,<7"]
# ///
"""Write the evidence packet of one slice diff, for VALIDATE.

The packet holds facts and no verdict. It lists the added and modified files of the diff,
the Python contract drift with the callers that each change may reach, the boundary edges
on the diff, the prose rules of each touched context, and the vocabulary leads. VALIDATE
judges each fact.

Usage: uv run shared/structure_evidence.py [--base <sha>] --out <packet.json>

Without --base, the diff starts at the merge-base with the default branch. A git error or
a helper that does not import gives one not_analysed line and no finding. A file that does
not parse gives one not_analysed line. The script exits 0, or 2 for a usage error.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path
from typing import Any

# The helpers sit in the structure package beside this file. The folder goes on sys.path
# before the imports, so that a run from any working folder finds them.
_HERE = os.path.dirname(os.path.abspath(__file__))
if _HERE not in sys.path:
    sys.path.insert(0, _HERE)

try:
    from structure.config import Config, drop_excluded, load_config
    from structure.git import GitError, added_lines, merge_base, repo_top, slice_files
    from structure.slice_drift import caller_files, drift_part
    from structure.slice_edges import edge_part, prose_rules, read_records
    from structure.slice_reuse import copy_part, locality_part
    from structure.slice_vocab import vocabulary_part
    from structure.vocabulary import empty_leads
except (ImportError, SyntaxError) as error:  # the run still writes one packet, see main
    IMPORT_FAILURE: str | None = str(error) or type(error).__name__
else:
    IMPORT_FAILURE = None

try:
    import yaml
except ImportError:  # the line reader reads the records, and the packet says so
    yaml = None

__all__ = ["added_lines", "build_packet", "callers_untouched", "main", "slice_files"]

NO_BASE = "not analysed: no merge-base with the default branch. Pass --base <sha>."


def callers_untouched(
    root: Path, symbol: str, diff_files: set[str], cap: int = 10
) -> list[str]:
    """Return up to cap files outside the diff that name the last part of the symbol, sorted.

    The default cap of 10 matches the list that each contract-drift finding holds.
    """
    return caller_files(root, symbol, diff_files, load_config(root))[:cap]


def build_packet(root: Path, base: str | None) -> dict[str, Any]:
    """Return the evidence packet for the diff from base to the work tree of the repo at root."""
    if base is None:
        return _packet(None, _files([], []), [], _evidence([], []), [NO_BASE])
    config = load_config(root)
    notes = [] if config.problem is None else [config.problem]
    try:
        return _analyse(root, base, config, notes)
    except GitError as error:
        line = _one_line(f"not analysed: {error}")
        return _packet(base, _files([], []), [], _evidence([], []), [*notes, line])


def _analyse(root: Path, base: str, config: Config, notes: list[str]) -> dict[str, Any]:
    """Return the packet of a diff that git can read. A GitError goes to the caller."""
    raw = slice_files(root, base)
    added, dropped_added = drop_excluded(raw["added"], config)
    modified, dropped_modified = drop_excluded(raw["modified"], config)
    diff = set(added) | set(modified)
    parse = _yaml_parse if yaml is not None else None
    boundaries, record_notes = read_records(root, parse)
    drift, moves, drift_notes = drift_part(root, base, modified, diff, config)
    edges, edge_notes = edge_part(root, base, added, modified, boundaries)
    copies, copy_notes = copy_part(root, base, added, modified, config)
    locality, locality_notes = locality_part(root, added, config)
    leads, lead_notes = vocabulary_part(root, base, _files(added, modified), boundaries, config)
    rules = prose_rules(sorted(diff), boundaries)
    all_notes = [
        *notes, *dropped_added, *dropped_modified, *record_notes, *drift_notes, *edge_notes,
        *copy_notes, *locality_notes, *lead_notes,
    ]
    return _packet(
        base, _files(added, modified), [*drift, *edges, *copies],
        _evidence(rules, moves, locality, leads), all_notes,
    )


def _yaml_parse(text: str) -> Any:
    """Return the YAML data of one boundary record, or None when YAML cannot read the text."""
    try:
        return yaml.safe_load(text)
    except yaml.YAMLError:
        return None


def _packet(
    base: str | None,
    files: dict[str, list[str]],
    findings: list[dict[str, Any]],
    evidence: dict[str, Any],
    notes: list[str],
) -> dict[str, Any]:
    """Return the packet with the keys of the packet contract. Each line of not_analysed is once."""
    return {
        "schema": 1,
        "base": base,
        "files": files,
        "findings": findings,
        "evidence": evidence,
        "not_analysed": list(dict.fromkeys(notes)),
    }


def _files(added: list[str], modified: list[str]) -> dict[str, list[str]]:
    """Return the file lists of the packet."""
    return {"added": list(added), "modified": list(modified)}


def _evidence(
    rules: list[dict[str, str]],
    moves: list[dict[str, str]],
    locality: list[dict[str, Any]] | None = None,
    vocabulary: dict[str, list[dict[str, Any]]] | None = None,
) -> dict[str, Any]:
    """Return the evidence block. Each list of leads is empty when no lead is analysed."""
    return {
        "boundary_rules_for_agent": list(rules),
        "vocabulary": vocabulary or empty_leads(),
        "moves": list(moves),
        "consumer_locality": list(locality or []),
    }


def _one_line(text: str) -> str:
    """Return the text with each run of white space made one space, so that it fits one line."""
    return " ".join(text.split())


def _one_line_packet(base: str | None, text: str) -> dict[str, Any]:
    """Return a packet with no finding and one not_analysed line."""
    return _packet(base, _files([], []), [], _evidence([], []), [_one_line(text)])


def _packet_here(base: str | None) -> dict[str, Any]:
    """Return the packet of the repo that holds the working folder."""
    if IMPORT_FAILURE is not None:
        text = f"not analysed: the structure helpers did not import: {IMPORT_FAILURE}"
        return _one_line_packet(base, text)
    try:
        root = repo_top(Path.cwd())
    except GitError as error:
        return _one_line_packet(base, f"not analysed: {error}")
    return build_packet(root, base or merge_base(root))


def _parser() -> argparse.ArgumentParser:
    """Return the parser with its two options."""
    parser = argparse.ArgumentParser(description="Write the evidence packet of one slice diff.")
    parser.add_argument(
        "--base",
        metavar="SHA",
        help="the slice base; by default the merge-base with the default branch",
    )
    parser.add_argument("--out", required=True, metavar="PATH", help="the packet file to write")
    return parser


def main(argv: list[str]) -> int:
    """Write the packet to the --out path and print that path. A usage error exits 2."""
    args = _parser().parse_args(argv)
    packet = _packet_here(args.base)
    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(packet, indent=2) + "\n", encoding="utf-8")
    print(out.resolve())
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
