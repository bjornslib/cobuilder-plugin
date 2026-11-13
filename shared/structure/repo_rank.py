"""Rank the findings of the whole-repository record by change count, and make one row for each key.

A folder finding takes the largest change count of a file in its folder. A group finding takes
the largest count of its members. Each other finding takes the count of its path. The rules
follow epic E6, step D3.
"""
from __future__ import annotations

from collections import Counter
from dataclasses import replace
from typing import Any

from .keys import finding_key
from .names import folder_of
from .types import Finding

FOLDER_SIGNALS = frozenset({"crowded-folder", "name-stem-cluster"})


def ranked_rows(
    findings: list[Finding], counts: dict[str, int], files: list[str]
) -> list[dict[str, Any]]:
    """Return the findings as record rows, the largest change count first, then by key."""
    folder_max = _folder_max(files, counts)
    rows = [
        {
            "key": finding_key(item),
            "signal": item.signal,
            "path": item.path,
            "folder": item.folder,
            "facts": dict(item.facts),
            "changes": _changes(item, counts, folder_max),
        }
        for item in unique_findings(findings)
    ]
    return sorted(rows, key=lambda row: (-row["changes"], row["key"]))


def unique_findings(findings: list[Finding]) -> list[Finding]:
    """Return one finding for each key. A repeated key keeps its first finding and a count fact."""
    first: dict[str, Finding] = {}
    occurrences: Counter[str] = Counter()
    for item in findings:
        key = finding_key(item)
        occurrences[key] += 1
        first.setdefault(key, item)
    return [
        replace(item, facts={**item.facts, "count": occurrences[key]})
        if occurrences[key] > 1 else item
        for key, item in first.items()
    ]


def _folder_max(files: list[str], counts: dict[str, int]) -> dict[str, int]:
    """Return the largest change count of a file in each folder."""
    largest: dict[str, int] = {}
    for rel in files:
        folder = folder_of(rel)
        largest[folder] = max(largest.get(folder, 0), counts.get(rel, 0))
    return largest


def _changes(item: Finding, counts: dict[str, int], folder_max: dict[str, int]) -> int:
    """Return the change count of one finding, by its kind of key."""
    if item.signal in FOLDER_SIGNALS:
        return folder_max.get(item.folder, 0)
    members = item.facts.get("members")
    if isinstance(members, list):
        return max((counts.get(name, 0) for name in members), default=0)
    return counts.get(item.path, 0)
