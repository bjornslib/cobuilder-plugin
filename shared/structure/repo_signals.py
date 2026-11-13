"""The E1 and E4 signals on the whole repository, for the record of epic E6.

Each runner reads the input set and runs one rule of the coach or of the evidence packet.
A folder finding comes once for each folder. A file finding comes once for each file. Only
the input set differs from the change view, so each rule keeps its meaning.
"""
from __future__ import annotations

from pathlib import Path
from typing import Any

from .config import Config, drop_excluded
from .folders import crowded_folder, folder_counts, folder_limit
from .git import slice_files
from .locality import Graph, consumer_locality
from .names import first_token, folder_of, generic_name, is_test_name, stem_cluster
from .slice_drift import drift_part
from .slice_edges import edge_findings
from .types import Boundary, Finding


def crowded_findings(files: list[str], config: Config, notes: list[str]) -> list[Finding]:
    """Return one crowded-folder finding for each folder over the limit."""
    counts = folder_counts(files)
    limit = folder_limit(counts, config)
    if limit is None:
        notes.append(
            f"crowded folders not run: fewer than {config.min_folders} folders hold files, "
            "and no folder limit applies."
        )
        return []
    first = _first_in_folder(files)
    found: list[Finding] = []
    for folder, count in sorted(counts.items()):
        if count <= limit:
            continue
        finding = crowded_folder(first[folder], files, counts, limit, config)
        if finding is not None:
            found.append(finding)
    return found


def _first_in_folder(files: list[str]) -> dict[str, str]:
    """Return the first file of each folder, in sorted order."""
    first: dict[str, str] = {}
    for rel in sorted(files):
        first.setdefault(folder_of(rel), rel)
    return first


def stem_findings(files: list[str], config: Config) -> list[Finding]:
    """Return one name-stem cluster for each folder and first token that hold enough names."""
    groups: dict[tuple[str, str], list[str]] = {}
    for rel in sorted(files):
        token = first_token(rel)
        if token is not None and not is_test_name(rel, config):
            groups.setdefault((folder_of(rel), token), []).append(rel)
    found: list[Finding] = []
    for members in groups.values():
        if len(members) < config.cluster_min:
            continue
        finding = stem_cluster(members[0], files, config)
        if finding is not None:
            found.append(finding)
    return found


def generic_findings(files: list[str], config: Config) -> list[Finding]:
    """Return one generic-name finding for each file whose stem is a generic name."""
    found = (generic_name(rel, config) for rel in sorted(files))
    return [finding for finding in found if finding is not None]


def boundary_findings(
    root: Path, files: list[str], boundaries: list[Boundary], notes: list[str]
) -> list[Finding]:
    """Return the boundary-edge findings of each file that a context covers."""
    found: list[Finding] = []
    for rel in sorted(files):
        items, problems = edge_findings(root, rel, boundaries, None)
        found.extend(_from_mapping(item) for item in items)
        notes.extend(problems)
    return found


def locality_findings(graph: Graph, product: list[str]) -> list[Finding]:
    """Return one consumer-locality finding for each product file that the layer rules keep."""
    found: list[Finding] = []
    for entry in consumer_locality(graph, product):
        facts = {key: value for key, value in entry.items() if key != "path"}
        found.append(Finding("consumer-locality", entry["path"], folder_of(entry["path"]), facts))
    return found


def drift_findings(root: Path, since: str, config: Config, notes: list[str]) -> list[Finding]:
    """Return the contract-drift findings of the files that changed since the base commit."""
    raw = slice_files(root, since)
    modified = drop_excluded(raw["modified"], config)[0]
    diff = set(drop_excluded(raw["added"], config)[0]) | set(modified)
    items, _moves, problems = drift_part(root, since, modified, diff, config)
    notes.extend(problems)
    return [_from_mapping(item) for item in items]


def _from_mapping(item: dict[str, Any]) -> Finding:
    """Return the Finding of one mapping that a reader of the evidence packet gave."""
    return Finding(item["signal"], item["path"], folder_of(item["path"]), dict(item["facts"]))
