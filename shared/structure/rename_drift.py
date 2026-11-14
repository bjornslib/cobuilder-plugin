"""Python contract drift for a renamed file, in the slice view and the whole-repository view.

A renamed product file compares its new public surface with the surface of its old path at
the base commit, and each event names the old path. A Python file outside the diff that
still imports the old module gives one module-renamed event.
"""
from __future__ import annotations

import posixpath
import re
from pathlib import Path
from typing import Any

from .config import Config, excluded_by
from .drift import drift_events, public_surface
from .git import files_with_word, renamed_pairs
from .slice_drift import _base_text, _finding, _is_python_product, _read, _unparsed, drift_part

_FROM = re.compile(r"^\s*from\s+([\w.]+)\s+import\s+(.+)$", re.MULTILINE)
_IMPORT = re.compile(r"^\s*import\s+([\w.]+)", re.MULTILINE)


def drift_with_renames(
    root: Path, base: str, modified: list[str], diff: set[str], config: Config
) -> tuple[list[dict[str, Any]], list[dict[str, str]], list[str]]:
    """Return the drift findings, the moves, and the notes of the modified and renamed files."""
    findings, moves, notes = drift_part(root, base, modified, diff, config)
    renamed, rename_notes = rename_part(root, base, renamed_pairs(root, base), diff, config)
    return [*findings, *renamed], moves, [*notes, *rename_notes]


def rename_part(
    root: Path, base: str, pairs: list[tuple[str, str]], diff: set[str], config: Config
) -> tuple[list[dict[str, Any]], list[str]]:
    """Return the contract-drift findings and the not_analysed lines of the renamed files."""
    findings: list[dict[str, Any]] = []
    notes: list[str] = []
    for old, new in pairs:
        if not (_is_python_product(old, config) and _is_python_product(new, config)):
            continue
        before = _base_text(root, base, old)
        after = _read(root, new)
        problem = _unparsed(new, before, after)
        if problem is not None:
            notes.append(problem)
            continue
        for event in drift_events(public_surface(before), public_surface(after)):
            finding = _finding(root, new, event, diff | {old}, config)
            finding["facts"]["renamed_from"] = old
            findings.append(finding)
        moved = _module_event(root, old, new, diff | {old}, config)
        if moved is not None:
            findings.append(moved)
    return findings, notes


def _module_event(
    root: Path, old: str, new: str, diff: set[str], config: Config
) -> dict[str, Any] | None:
    """Return the module-renamed finding when a file outside the diff imports the old module."""
    names = _old_names(old, new)
    stem = posixpath.splitext(posixpath.basename(old))[0]
    callers = [
        rel for rel in files_with_word(root, stem)
        if rel.endswith(".py") and rel not in diff and excluded_by(rel, config) is None
        and names & _imported(_read(root, rel))
    ]
    if not callers:
        return None
    facts = {
        "kind": "module-renamed",
        "symbol": _dotted(old),
        "class": "input",
        "callers_untouched": callers[:config.caller_cap],
        "callers_total": len(callers),
        "renamed_from": old,
    }
    return {"signal": "contract-drift", "path": new, "facts": facts}


def _old_names(old: str, new: str) -> set[str]:
    """Return each dotted tail of the old module that is not also a tail of the new module."""
    return _tails(_dotted(old)) - _tails(_dotted(new))


def _tails(dotted: str) -> set[str]:
    """Return each dotted tail of a module name, such as lib and pkg.lib for pkg.lib."""
    parts = dotted.split(".")
    return {".".join(parts[index:]) for index in range(len(parts))}


def _dotted(rel: str) -> str:
    """Return the dotted module name of a Python path, without an __init__ part."""
    parts = posixpath.splitext(rel)[0].split("/")
    return ".".join(parts[:-1] if parts[-1] == "__init__" else parts)


def _imported(text: str) -> set[str]:
    """Return each module name that the import lines of a Python text name."""
    found = {match.group(1) for match in _IMPORT.finditer(text)}
    for match in _FROM.finditer(text):
        found.add(match.group(1))
        for name in match.group(2).replace("(", " ").replace(")", " ").split(","):
            word = name.split()[0] if name.split() else ""
            found.add(f"{match.group(1)}.{word}")
    return found
