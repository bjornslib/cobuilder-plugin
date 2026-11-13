"""Duplicated code and consumer locality on the slice diff, for the evidence packet.

copy_part indexes the product files of the work tree. It keeps each block whose lines
in a slice file are lines that the diff adds. It gives one finding for each pair of files.
locality_part gives an entry for each added product file that the layer rules keep.
A git error or a read error gives one not_analysed line and no finding.
"""
from __future__ import annotations

from pathlib import Path
from typing import Any

from .config import Config
from .duplicates import DuplicateBlock, duplicate_blocks
from .git import GitError, added_lines, repo_files
from .locality import consumer_locality, import_graph
from .names import is_product

SIGNAL = "duplicate-block"


def copy_part(
    root: Path, base: str, added: list[str], modified: list[str], config: Config
) -> tuple[list[dict[str, Any]], list[str]]:
    """Return the duplicate-block findings of the diff, and one not_analysed line on failure."""
    try:
        slice_lines = _slice_lines(root, base, added, modified, config)
        blocks: list[DuplicateBlock] = []
        if slice_lines:
            texts = _texts(root, config)
            blocks = duplicate_blocks(texts, config.dup_window, config.dup_min_chars)
    except (GitError, OSError) as error:
        return [], [_note("duplicated code", error)]
    return _findings(blocks, slice_lines), []


def locality_part(
    root: Path, added: list[str], config: Config
) -> tuple[list[dict[str, Any]], list[str]]:
    """Return the consumer locality entries of the added files, and the not_analysed lines."""
    targets = [rel for rel in added if is_product(rel, config)]
    if not targets:
        return [], []
    try:
        graph, notes = import_graph(root, _product_rels(root, config))
    except (GitError, OSError) as error:
        return [], [_note("consumer locality", error)]
    return consumer_locality(graph, targets), notes


def _slice_lines(
    root: Path, base: str, added: list[str], modified: list[str], config: Config
) -> dict[str, set[int] | None]:
    """Return the slice files that are product files, with the lines that each one adds.

    A new file maps to None, which counts every line. A modified file maps to its added lines.
    """
    lines: dict[str, set[int] | None] = {rel: None for rel in added if is_product(rel, config)}
    for rel in modified:
        if is_product(rel, config):
            lines[rel] = set(added_lines(root, base, rel))
    return lines


def _product_rels(root: Path, config: Config) -> list[str]:
    """Return the product files that exist in the work tree. A deleted file gives none."""
    return [rel for rel in repo_files(root) if is_product(rel, config) and (root / rel).is_file()]


def _texts(root: Path, config: Config) -> list[tuple[str, str]]:
    """Return the repo path and the text of each product file of the work tree."""
    return [
        (rel, (root / rel).read_text(encoding="utf-8", errors="replace"))
        for rel in _product_rels(root, config)
    ]


def _findings(
    blocks: list[DuplicateBlock], slice_lines: dict[str, set[int] | None]
) -> list[dict[str, Any]]:
    """Return one finding for each pair of files, with the largest block that the diff adds to."""
    best: dict[frozenset[str], tuple[int, dict[str, Any]]] = {}
    for block in blocks:
        claim = _claim(block, slice_lines)
        key = frozenset((block.first, block.second))
        if claim is not None and (key not in best or claim[0] > best[key][0]):
            best[key] = claim
    found = [finding for _, finding in best.values()]
    return sorted(found, key=lambda item: (item["path"], item["facts"]["other"]))


def _claim(
    block: DuplicateBlock, slice_lines: dict[str, set[int] | None]
) -> tuple[int, dict[str, Any]] | None:
    """Return the size and the finding of the first side that the diff adds to, or None.

    The first side sorts first, so a pair of two slice files gives the first path.
    """
    sides = (
        (block.first, block.second, block.first_lines, block.second_lines),
        (block.second, block.first, block.second_lines, block.first_lines),
    )
    for path, other, mine, theirs in sides:
        if path in slice_lines and _adds(mine, slice_lines[path]):
            return _size(mine), _finding(path, other, mine, theirs)
    return None


def _adds(lines: tuple[int, ...], added: set[int] | None) -> bool:
    """Return True when every line of the block is an added line, or when the file is new."""
    return added is None or set(lines) <= added


def _finding(
    path: str, other: str, mine: tuple[int, ...], theirs: tuple[int, ...]
) -> dict[str, Any]:
    """Return one duplicate-block finding, with the facts that the design names."""
    facts = {
        "lines": _span(mine),
        "other": other,
        "other_lines": _span(theirs),
        "size": _size(mine),
    }
    return {"signal": SIGNAL, "path": path, "facts": facts}


def _span(lines: tuple[int, ...]) -> str:
    """Return the first and the last line of a block, as a range."""
    return f"{min(lines)}-{max(lines)}"


def _size(lines: tuple[int, ...]) -> int:
    """Return the inclusive line count of a block."""
    return max(lines) - min(lines) + 1


def _note(label: str, error: Exception) -> str:
    """Return the not_analysed line of a part that failed, in one line."""
    return " ".join(f"not analysed for {label}: {error}".split())
