"""The vocabulary leads of one slice diff, for the evidence packet.

The names of a diff are the stems of its added files, the names of its new folders, and the
public symbols that it adds. A new folder is one that no existing file lies in. The leads go
in the evidence.vocabulary block of the packet, and a lead never enters the findings.
"""
from __future__ import annotations

from pathlib import Path
from typing import Any

from .boundary import context_of
from .config import Config, excluded_by
from .git import GitError, repo_files
from .names import stem_of
from .slice_drift import added_symbols
from .types import Boundary
from .vocabulary import Name, empty_leads, glossary_index, vocabulary_leads

NO_GLOSSARY = "vocabulary leads not analysed: no glossary entry in DDD-VOCABULARY.md."


def vocabulary_part(
    root: Path, base: str, files: dict[str, list[str]], boundaries: list[Boundary], config: Config
) -> tuple[dict[str, list[dict[str, Any]]], list[str]]:
    """Return the leads of one slice diff, and the not_analysed lines of what failed.

    Without a glossary, the leads are empty and one line names the glossary.
    """
    try:
        index = glossary_index(root)
        if not index:
            return empty_leads(), [NO_GLOSSARY]
        existing = _existing(root, files["added"], config)
        names = _added_names(files["added"], existing, boundaries)
        names += _symbol_names(root, base, files, boundaries, config)
    except (GitError, OSError) as error:
        return empty_leads(), [_note(error)]
    return vocabulary_leads(names, index, [stem_of(rel) for rel in existing]), []


def _existing(root: Path, added: list[str], config: Config) -> list[str]:
    """Return the repo files that the diff does not add and that no excluded path holds."""
    new = set(added)
    return [rel for rel in repo_files(root) if rel not in new and excluded_by(rel, config) is None]


def _added_names(added: list[str], existing: list[str], boundaries: list[Boundary]) -> list[Name]:
    """Return the stem of each added file, and the name of each new folder."""
    names: list[Name] = [(stem_of(rel), rel, _context(rel, boundaries)) for rel in added]
    for folder in _new_folders(added, existing):
        names.append((folder.rsplit("/", 1)[-1], folder, _context(folder, boundaries)))
    return names


def _new_folders(added: list[str], existing: list[str]) -> list[str]:
    """Return each folder of an added file that no existing file lies in, sorted."""
    folders: set[str] = set()
    for rel in added:
        parts = rel.split("/")[:-1]
        folders.update("/".join(parts[:depth]) for depth in range(1, len(parts) + 1))
    return sorted(
        folder for folder in folders if not any(rel.startswith(folder + "/") for rel in existing)
    )


def _symbol_names(
    root: Path, base: str, files: dict[str, list[str]], boundaries: list[Boundary], config: Config
) -> list[Name]:
    """Return each public symbol that the diff adds to a file, with the file and its context."""
    names: list[Name] = []
    for rel in [*files["added"], *files["modified"]]:
        context = _context(rel, boundaries)
        names += [(symbol, rel, context) for symbol in added_symbols(root, base, rel, config)]
    return names


def _context(rel: str, boundaries: list[Boundary]) -> str | None:
    """Return the id of the boundary record that holds the path, or None when no record does."""
    record = context_of(rel, boundaries)
    return None if record is None else record.id


def _note(error: Exception) -> str:
    """Return the not_analysed line of a leads part that failed, in one line."""
    return " ".join(f"not analysed for vocabulary leads: {error}".split())
