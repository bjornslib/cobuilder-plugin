"""The folder rules of the structure signals: the file counts, the limit, and the crowded folder.

A folder is crowded when it holds more files than the limit and at least one code file.
"""
from __future__ import annotations

import math
import posixpath

from structure_config import Config
from structure_names import family_text, folder_of
from structure_types import Finding


def folder_counts(files: list[str]) -> dict[str, int]:
    """Return the number of files that each folder holds directly."""
    counts: dict[str, int] = {}
    for rel in files:
        folder = folder_of(rel)
        counts[folder] = counts.get(folder, 0) + 1
    return counts


def folder_limit(counts: dict[str, int], config: Config) -> int | None:
    """Return the larger of the config limit and the folder percentile, or None.

    The percentile needs at least min_folders folders that hold files. It is the
    value at position ceil(percentile / 100 * n), counted from 1 in sorted order.
    """
    limits = [] if config.folder_limit is None else [config.folder_limit]
    if counts and len(counts) >= config.min_folders:
        sizes = sorted(counts.values())
        rank = math.ceil(config.percentile * len(sizes) / 100)
        limits.append(sizes[max(rank, 1) - 1])
    return max(limits) if limits else None


def crowded_folder(
    rel: str, files: list[str], counts: dict[str, int], limit: int, config: Config
) -> Finding | None:
    """Return a finding when the folder of rel holds more than limit files and a code file.

    The families fact names the first-token groups of the folder, largest first.
    """
    folder = folder_of(rel)
    inside = [name for name in files if folder_of(name) == folder]
    count = counts.get(folder, 0)
    holds_code = any(posixpath.splitext(name)[1] in config.code_extensions for name in inside)
    if count <= limit or not holds_code:
        return None
    facts = {"count": count, "limit": limit, "families": family_text(inside, config)}
    return Finding("crowded-folder", rel, folder, facts)
