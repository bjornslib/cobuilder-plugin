"""Helpers for the readers of one source file: languages, repo paths, and path strings.

A path string is a quoted part of a string literal or of a comment. It counts when
it has no space and starts with the path of a boundary record.
"""
from __future__ import annotations

import os
import posixpath
import re
from pathlib import Path

from .types import Reference

_QUOTED = re.compile(r"""["]([^"\n]*)["]|[']([^'\n]*)[']""")
_LANGUAGES = {
    ".py": "python",
    ".ts": "typescript",
    ".tsx": "typescript",
    ".js": "typescript",
    ".jsx": "typescript",
    ".mjs": "typescript",
    ".cjs": "typescript",
}


def language_of(rel: str) -> str | None:
    """Return the reader of a path: python, typescript, or None when no reader covers it."""
    return _LANGUAGES.get(posixpath.splitext(rel)[1])


def relative_path(path: str, top: Path) -> str:
    """Return the path relative to the repo top folder, with forward slashes."""
    rel = os.path.relpath(os.path.realpath(path), os.path.realpath(top))
    return rel.replace(os.sep, "/")


def read_source(rel: str, top: Path) -> str:
    """Return the text of a repo file. Raise OSError or ValueError when it cannot be read."""
    return (top / rel).read_text(encoding="utf-8")


def repo_file(top: Path, rel: str) -> str | None:
    """Return the normal form of rel when it names a file inside the repo, or None."""
    norm = posixpath.normpath(rel)
    if norm == ".." or norm.startswith(("../", "/")):
        return None
    return norm if (top / norm).is_file() else None


def line_text(lines: list[str], line: int) -> str:
    """Return the stripped text of a 1-based line. An out-of-range line gives an empty text."""
    return lines[line - 1].strip() if 0 < line <= len(lines) else ""


def literal_references(
    lines: list[str], literals: list[tuple[int, str, bool]], paths: list[str]
) -> list[Reference]:
    """Return one path-string reference for each quoted part that names a boundary path.

    Each literal holds its first line, its token text, and whether it is a comment.
    """
    found: list[Reference] = []
    for start, token, is_comment in literals:
        for match in _QUOTED.finditer(token):
            content = match.group(1) if match.group(1) is not None else match.group(2)
            if _is_path(content, paths):
                line = start + token.count("\n", 0, match.start())
                found.append(Reference(line, line_text(lines, line), content, "path", is_comment))
    return found


def _is_path(content: str, paths: list[str]) -> bool:
    """Return True when content has no space and equals a boundary path or starts with one."""
    if " " in content:
        return False
    return any(content == path or content.startswith(path + "/") for path in paths)
