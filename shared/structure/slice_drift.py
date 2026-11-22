"""Python contract drift on the slice diff, for the evidence packet.

A modified Python file that is not a test name gives its drift events. A removed symbol
that another product file of the work tree defines is a move. A move gives no event, and
the packet lists it instead. A caller is a file outside the diff that holds the last part
of the symbol name as a whole word.
"""
from __future__ import annotations

import ast
from pathlib import Path
from typing import Any

from .config import Config, excluded_by, load_config
from .drift import drift_events, public_surface
from .git import GitError, file_at, files_with_word
from .names import is_test_name


def file_drift(
    root: Path, base: str, rel: str, diff_files: set[str], config: Config
) -> tuple[list[dict[str, Any]], list[dict[str, str]], list[str]]:
    """Return the contract-drift findings, the moves, and the not_analysed lines of one file.

    Only a modified Python file that is not a test name is read. A side that does not
    parse gives one not_analysed line, and no finding.
    """
    if not _is_python_product(rel, config):
        return [], [], []
    before = file_at(root, base, rel)
    after = _read(root, rel)
    problem = _unparsed(rel, before, after)
    if problem is not None:
        return [], [], [problem]
    findings: list[dict[str, Any]] = []
    moves: list[dict[str, str]] = []
    for event in drift_events(public_surface(before), public_surface(after)):
        target = definer(root, event["symbol"], rel, config) if event["kind"] == "removed" else None
        if target is None:
            findings.append(_finding(root, rel, event, diff_files, config))
        else:
            moves.append({"path": rel, "symbol": event["symbol"], "moved_to": target})
    return findings, moves, []


def drift_part(
    root: Path, base: str, modified: list[str], diff: set[str], config: Config
) -> tuple[list[dict[str, Any]], list[dict[str, str]], list[str]]:
    """Return the contract-drift findings, the moves, and the not_analysed lines of the diff."""
    findings: list[dict[str, Any]] = []
    moves: list[dict[str, str]] = []
    notes: list[str] = []
    for rel in modified:
        found, moved, problems = file_drift(root, base, rel, diff, config)
        findings.extend(found)
        moves.extend(moved)
        notes.extend(problems)
    return findings, moves, notes


def caller_files(root: Path, symbol: str, diff_files: set[str], config: Config) -> list[str]:
    """Return the sorted files outside the diff that name the symbol, except excluded paths."""
    word = symbol.split(".")[-1]
    return [
        rel for rel in files_with_word(root, word)
        if rel not in diff_files and excluded_by(rel, config) is None
    ]


def callers_untouched(
    root: Path, symbol: str, diff_files: set[str], cap: int | None = None
) -> list[str]:
    """Return up to cap files outside the diff that name the last part of the symbol, sorted.

    Without a cap, the caller_cap of the config applies, as in each contract-drift finding.
    """
    config = load_config(root)
    limit = config.caller_cap if cap is None else cap
    return caller_files(root, symbol, diff_files, config)[:limit]


def definer(root: Path, symbol: str, source: str, config: Config) -> str | None:
    """Return the first other product file that defines the full symbol, or None.

    The symbol keeps its class part, so an __init__ of another class does not match.
    """
    matches = (
        rel for rel in files_with_word(root, symbol.split(".")[-1])
        if rel != source and _is_python_product(rel, config)
        and symbol in public_surface(_read(root, rel))
    )
    return next(matches, None)


def added_symbols(root: Path, base: str, rel: str, config: Config) -> list[str]:
    """Return the sorted public symbols that a Python product file holds and its base lacks.

    A file that the base does not hold counts all of its public symbols. A file that does not
    parse gives none.
    """
    if not _is_python_product(rel, config):
        return []
    before = _base_text(root, base, rel)
    after = _read(root, rel)
    if _unparsed(rel, before, after) is not None:
        return []
    return sorted(public_surface(after).keys() - public_surface(before).keys())


def _finding(
    root: Path, rel: str, event: dict[str, str], diff_files: set[str], config: Config
) -> dict[str, Any]:
    """Return one contract-drift finding, with the callers that the change may reach."""
    callers = caller_files(root, event["symbol"], diff_files, config)
    facts: dict[str, Any] = {
        **event,
        "callers_untouched": callers[:config.caller_cap],
        "callers_total": len(callers),
    }
    return {"signal": "contract-drift", "path": rel, "facts": facts}


def _is_python_product(rel: str, config: Config) -> bool:
    """Return True for a Python file that is not a test name and that no excluded path holds."""
    return (
        rel.endswith(".py")
        and not is_test_name(rel, config)
        and excluded_by(rel, config) is None
    )


def _read(root: Path, rel: str) -> str:
    """Return the text of a work-tree file. Bytes that do not decode become replacements."""
    return (root / rel).read_text(encoding="utf-8", errors="replace")


def _base_text(root: Path, base: str, rel: str) -> str:
    """Return the text of the file at base, or an empty text when the base does not hold it."""
    try:
        return file_at(root, base, rel)
    except GitError:
        return ""


def _unparsed(rel: str, *sources: str) -> str | None:
    """Return the not_analysed line for the first source that does not parse, or None."""
    for source in sources:
        try:
            ast.parse(source)
        except (SyntaxError, ValueError) as error:
            line = getattr(error, "lineno", None)
            return f"{rel}: not analysed for contract drift, the file does not parse (line {line})."
    return None
