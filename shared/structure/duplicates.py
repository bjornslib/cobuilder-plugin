"""The duplicated-code index: blocks of copied lines that two or more files share.

Each file reads as normalized lines. A window of dup_window kept lines counts when it
passes two filters and holds enough characters. The index hashes each window.

Two files that share windows give one block for each run of shared windows. A run lies
on one diagonal, the offset between the window starts in the two files. The index holds
no slice rule. The slice filter in slice_reuse.py picks the blocks that a diff adds.
The module uses the standard library only.
"""
from __future__ import annotations

import hashlib
import itertools
import re
from collections import defaultdict
from dataclasses import dataclass

from .config import Config

_STRING = re.compile(r"""["](?:\\.|[^"\\])*["]|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`""")
_NUMBER = re.compile(r"\b\d+(?:\.\d+)?\b")
_NAMED = re.compile(r"\w+\s*[=:].*,$")
_Hit = tuple[int, int]


@dataclass(frozen=True)
class DuplicateBlock:
    """The lines of two files that share one run of windows.

    The first path sorts before the second. Each side lists its line numbers in order,
    and the two sides hold the same number of lines.
    """

    first: str
    second: str
    first_lines: tuple[int, ...]
    second_lines: tuple[int, ...]


def duplicate_blocks(files: list[tuple[str, str]], config: Config) -> list[DuplicateBlock]:
    """Return the blocks that the files share. Each file is a repo path and its text."""
    window = config.dup_window
    kept = {rel: _kept_lines(text, config) for rel, text in files}
    holders: dict[str, list[tuple[str, int]]] = defaultdict(list)
    for rel, lines in kept.items():
        for start, digest in _windows(lines, config):
            holders[digest].append((rel, start))
    blocks: list[DuplicateBlock] = []
    for pair, hits in sorted(_pair_hits(holders).items()):
        blocks.extend(_block(kept, pair, run, window) for run in _runs(hits))
    return blocks


def _kept_lines(text: str, config: Config) -> list[tuple[int, str]]:
    """Return the line number and the normalized text of each line that the index keeps."""
    kept: list[tuple[int, str]] = []
    for number, raw in enumerate(text.split("\n"), start=1):
        line = raw.strip()
        if len(line) >= config.dup_min_line_chars and not line.startswith(config.dup_skip_prefixes):
            kept.append((number, _normal(line)))
    return kept


def _normal(line: str) -> str:
    """Return the line with each string as S, each number as 0, and one space between words."""
    text = _NUMBER.sub("0", _STRING.sub("S", line))
    return " ".join(text.split())


def _windows(lines: list[tuple[int, str]], config: Config) -> list[tuple[int, str]]:
    """Return the start index and the hash of each window that passes the filters."""
    texts = [text for _, text in lines]
    window = config.dup_window
    found: list[tuple[int, str]] = []
    for start in range(len(texts) - window + 1):
        chunk = texts[start:start + window]
        if _keeps(chunk, config):
            found.append((start, _digest(chunk)))
    return found


def _keeps(chunk: list[str], config: Config) -> bool:
    """Return True when a window has enough distinct lines and characters, and few named lines.

    The named lines have the form name=value, or name: type,. Filter B drops a window
    with dup_named_lines_drop or more of them.
    """
    named = sum(1 for line in chunk if _NAMED.match(line))
    return (
        len(set(chunk)) >= config.dup_min_distinct_lines
        and named < config.dup_named_lines_drop
        and sum(len(line) for line in chunk) >= config.dup_min_chars
    )


def _digest(chunk: list[str]) -> str:
    """Return a short hash of the text of one window."""
    return hashlib.blake2b("\n".join(chunk).encode("utf-8"), digest_size=16).hexdigest()


def _pair_hits(
    holders: dict[str, list[tuple[str, int]]],
) -> dict[tuple[str, str], list[_Hit]]:
    """Return the window starts that each pair of files shares, with the first path sorted first."""
    hits: dict[tuple[str, str], list[_Hit]] = defaultdict(list)
    for group in holders.values():
        for (rel_a, start_a), (rel_b, start_b) in itertools.combinations(group, 2):
            if rel_a == rel_b:
                continue
            if rel_a < rel_b:
                hits[(rel_a, rel_b)].append((start_a, start_b))
            else:
                hits[(rel_b, rel_a)].append((start_b, start_a))
    return hits


def _runs(hits: list[_Hit]) -> list[list[_Hit]]:
    """Return the shared windows in runs. Each run steps by one window on one diagonal."""
    runs: list[list[_Hit]] = []
    for hit in sorted(hits, key=lambda item: (item[1] - item[0], item[0])):
        if runs and _follows(runs[-1][-1], hit):
            runs[-1].append(hit)
        else:
            runs.append([hit])
    return runs


def _follows(previous: _Hit, hit: _Hit) -> bool:
    """Return True when the hit is the next window of the same diagonal."""
    return hit[1] - hit[0] == previous[1] - previous[0] and hit[0] == previous[0] + 1


def _block(
    kept: dict[str, list[tuple[int, str]]],
    pair: tuple[str, str],
    run: list[_Hit],
    window: int,
) -> DuplicateBlock:
    """Return the block of one run, with the line numbers that its windows cover on each side."""
    first, second = pair
    (first_start, second_start), (first_last, second_last) = run[0], run[-1]
    first_lines = tuple(number for number, _ in kept[first][first_start:first_last + window])
    second_lines = tuple(number for number, _ in kept[second][second_start:second_last + window])
    return DuplicateBlock(first, second, first_lines, second_lines)
