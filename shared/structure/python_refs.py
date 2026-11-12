"""The Python reader: the imports that resolve to a repo file, and the path strings.

The imports come from ast. The comments and the string literals come from tokenize,
so a path string in a comment keeps its in_comment flag.
"""
from __future__ import annotations

import ast
import io
import posixpath
import tokenize
from pathlib import Path

from .source import line_text, literal_references, repo_file
from .types import Reference

_SHARED_FOLDER = "shared"


def python_refs(rel: str, text: str, top: Path, paths: list[str]) -> list[Reference]:
    """Return the references of one Python file. Raise SyntaxError when the file does not parse."""
    lines = text.split("\n")
    folder = posixpath.dirname(rel)
    found: list[Reference] = []
    for node in ast.walk(ast.parse(text)):
        if not isinstance(node, (ast.Import, ast.ImportFrom)):
            continue
        for parts, level in _import_parts(node):
            target = _resolve(parts, level, folder, top)
            if target is not None:
                source_line = line_text(lines, node.lineno)
                found.append(Reference(node.lineno, source_line, target, "import", False))
    found.extend(literal_references(lines, _literals(text), paths))
    return found


def _literals(text: str) -> list[tuple[int, str, bool]]:
    """Return each comment and string token as (first line, token text, is_comment)."""
    found: list[tuple[int, str, bool]] = []
    for token in tokenize.generate_tokens(io.StringIO(text).readline):
        if token.type == tokenize.COMMENT:
            found.append((token.start[0], token.string, True))
        elif token.type == tokenize.STRING:
            found.append((token.start[0], token.string, False))
    return found


def _import_parts(node: ast.Import | ast.ImportFrom) -> list[tuple[list[str], int]]:
    """Return each imported module as its name parts and its relative level."""
    if isinstance(node, ast.Import):
        return [(alias.name.split("."), 0) for alias in node.names]
    if node.module is None:
        return [([alias.name], node.level) for alias in node.names]
    return [(node.module.split("."), node.level)]


def _resolve(parts: list[str], level: int, folder: str, top: Path) -> str | None:
    """Return the repo file of one module, or None when the module is external."""
    for base in _bases(folder, level):
        stem = "/".join(part for part in (base, *parts) if part)
        for candidate in (f"{stem}.py", f"{stem}/__init__.py"):
            found = repo_file(top, candidate)
            if found is not None:
                return found
    return None


def _bases(folder: str, level: int) -> list[str]:
    """Return the folders that a module name is tried from.

    An absolute name is tried from the repo top, from the folder of the file, and from
    the shared folder. The plugin scripts put the shared folder on sys.path. A relative
    name starts at the folder that its dots reach.
    """
    if level == 0:
        return list(dict.fromkeys(["", folder, _SHARED_FOLDER]))
    parts = folder.split("/") if folder else []
    if level - 1 > len(parts):
        return []
    return ["/".join(parts[: len(parts) - level + 1])]
