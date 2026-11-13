"""The three signals of the whole-repository view alone: twin names, co-change, and duplicates.

A group finding keeps its members in facts, as a sorted list. Its path is the first member.
The rules follow epic E6, step D2, and the agencheck spike. A pair is two files in two folders.
"""
from __future__ import annotations

import itertools
from collections.abc import Iterable
from pathlib import Path
from typing import Any

from .boundary import connected_groups
from .config import Config
from .duplicates import duplicate_blocks
from .names import folder_of, is_product, is_test_name, stem_of
from .source import language_of
from .types import Finding

TWIN_EXCLUDED_STEMS = frozenset({
    "index", "__init__", "main", "types", "conftest",
    "page", "route", "layout", "loading", "error", "not-found", "template", "default",
})
MAX_COMMIT_FILES = 30
MIN_SUPPORT = 5
MIN_JACCARD = 0.5
Pairs = dict[tuple[str, str], int]


def group_finding(signal: str, members: Iterable[str], facts: dict[str, Any]) -> Finding:
    """Return one finding for a group. The count fact is the number of members."""
    ordered = sorted(members)
    kept = {**facts, "count": len(ordered), "members": ordered}
    return Finding(signal, ordered[0], folder_of(ordered[0]), kept)


def twin_names(files: list[str], config: Config) -> list[Finding]:
    """Return one finding for each stem that two or more folders hold in one language family."""
    by_stem: dict[str, list[tuple[str, str]]] = {}
    for rel in files:
        family, stem = language_of(rel), stem_of(rel).lower()
        if family is not None and is_product(rel, config) and stem not in TWIN_EXCLUDED_STEMS:
            by_stem.setdefault(stem, []).append((family, rel))
    found: list[Finding] = []
    for stem in sorted(by_stem):
        families = _twin_families(by_stem[stem])
        members = [rel for family, rel in by_stem[stem] if family in families]
        if members:
            found.append(group_finding("twin-name", members, {"stem": stem}))
    return found


def _twin_families(pairs: list[tuple[str, str]]) -> set[str]:
    """Return the language families whose stem sits in two or more folders."""
    folders: dict[str, set[str]] = {}
    for family, rel in pairs:
        folders.setdefault(family, set()).add(folder_of(rel))
    return {family for family, found in folders.items() if len(found) >= 2}


def co_change_groups(commits: list[list[str]], files: set[str], config: Config) -> list[Finding]:
    """Return one finding for each group of files that change together in the commits."""
    counts: dict[str, int] = {}
    support: Pairs = {}
    for names in commits:
        if len(names) > MAX_COMMIT_FILES:
            continue
        members = sorted({rel for rel in names if rel in files and not is_test_name(rel, config)})
        for rel in members:
            counts[rel] = counts.get(rel, 0) + 1
        for pair in itertools.combinations(members, 2):
            if folder_of(pair[0]) != folder_of(pair[1]):
                support[pair] = support.get(pair, 0) + 1
    passing = {pair: both for pair, both in support.items() if _passes(pair, both, counts)}
    return _pair_groups("co-change", passing, "support")


def _passes(pair: tuple[str, str], both: int, counts: dict[str, int]) -> bool:
    """Return True when a pair meets the support limit and the Jaccard limit."""
    union = counts[pair[0]] + counts[pair[1]] - both
    return both >= MIN_SUPPORT and both / union >= MIN_JACCARD


def duplicate_groups(root: Path, files: list[str], config: Config) -> list[Finding]:
    """Return one finding for each clone class, which is a set of files that share a block."""
    texts = [
        (rel, (root / rel).read_text(encoding="utf-8", errors="replace"))
        for rel in files if is_product(rel, config)
    ]
    sizes: Pairs = {}
    for block in duplicate_blocks(texts, config.dup_window, config.dup_min_chars):
        size = max(block.first_lines) - min(block.first_lines) + 1
        pair = (block.first, block.second)
        sizes[pair] = max(sizes.get(pair, 0), size)
    return _pair_groups("duplicate-group", sizes, "size")


def _pair_groups(signal: str, pairs: Pairs, label: str) -> list[Finding]:
    """Return one finding for each connected set of pairs, with the largest pair value as a fact."""
    names = sorted({name for pair in pairs for name in pair})
    found: list[Finding] = []
    for group in connected_groups(names, list(pairs)):
        inside = set(group)
        best = max(value for pair, value in pairs.items() if set(pair) <= inside)
        found.append(group_finding(signal, group, {label: best}))
    return found
