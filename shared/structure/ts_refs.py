"""The TypeScript and JavaScript reader: the imports that resolve to a repo file, and path strings.

One pattern finds each comment and each string literal. The comments are blanked
before the import pattern runs, so an import inside a comment gives no reference.
"""
from __future__ import annotations

import json
import posixpath
import re
from pathlib import Path

from .source import line_text, literal_references, repo_file
from .types import Reference

_Aliases = tuple[str, dict[str, list[str]]]
_TOKEN = re.compile(
    r"""//[^\n]*|/\*.*?\*/|"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|`(?:\\.|[^`\\])*`""",
    re.DOTALL,
)
_IMPORT = re.compile(r"""\b(?:from|import|require)\s*\(?\s*(["'])([^"'\n]+)\1""")
_COMMENT_START = ("//", "/*")
_SUFFIXES = (".ts", ".tsx", ".js", ".jsx")


def ts_refs(rel: str, text: str, top: Path, paths: list[str]) -> list[Reference]:
    """Return the references of one TypeScript or JavaScript file."""
    lines = text.split("\n")
    code = _blank_comments(text)
    folder = posixpath.dirname(rel)
    aliases = _aliases(folder, top)
    found: list[Reference] = []
    for match in _IMPORT.finditer(code):
        target = _resolve(match.group(2), folder, top, aliases)
        if target is not None:
            line = code.count("\n", 0, match.start()) + 1
            found.append(Reference(line, line_text(lines, line), target, "import", False))
    found.extend(literal_references(lines, _literals(text), paths))
    return found


def _literals(text: str) -> list[tuple[int, str, bool]]:
    """Return each comment and string literal as (first line, token text, is_comment)."""
    found: list[tuple[int, str, bool]] = []
    line, last = 1, 0
    for match in _TOKEN.finditer(text):
        line += text.count("\n", last, match.start())
        last = match.start()
        token = match.group(0)
        found.append((line, token, token.startswith(_COMMENT_START)))
    return found


def _blank_comments(text: str) -> str:
    """Return the text with each comment replaced by spaces. The line breaks stay in place."""
    return _TOKEN.sub(_blank, text)


def _blank(match: re.Match[str]) -> str:
    """Return a comment as spaces, and any other token as it is."""
    token = match.group(0)
    if not token.startswith(_COMMENT_START):
        return token
    return re.sub(r"[^\n]", " ", token)


def _resolve(spec: str, folder: str, top: Path, aliases: _Aliases | None) -> str | None:
    """Return the repo file of an import spec, or None when the spec is external."""
    if spec.startswith("."):
        bases = [posixpath.join(folder, spec)]
    else:
        bases = _alias_bases(spec, aliases)
    for base in bases:
        found = _file_for(top, base)
        if found is not None:
            return found
    return None


def _alias_bases(spec: str, aliases: _Aliases | None) -> list[str]:
    """Return the repo paths that a spec names through the paths of a tsconfig file."""
    if aliases is None:
        return []
    folder, paths = aliases
    bases: list[str] = []
    for pattern, targets in paths.items():
        if pattern.endswith("*") and spec.startswith(pattern[:-1]):
            rest = spec[len(pattern) - 1:]
            bases.extend(posixpath.join(folder, t.replace("*", rest, 1)) for t in targets)
        elif spec == pattern:
            bases.extend(posixpath.join(folder, t) for t in targets)
    return bases


def _file_for(top: Path, base: str) -> str | None:
    """Return the repo file that a module base names, with a suffix or as an index file."""
    options = [base, *(base + suffix for suffix in _SUFFIXES)]
    options += [f"{base}/index{suffix}" for suffix in _SUFFIXES]
    for option in options:
        found = repo_file(top, option)
        if found is not None:
            return found
    return None


def _aliases(folder: str, top: Path) -> _Aliases | None:
    """Return the folder and the paths of the nearest tsconfig.json, or None when none exists."""
    current = folder
    while True:
        rel = "/".join(part for part in (current, "tsconfig.json") if part)
        if (top / rel).is_file():
            return current, _paths(top / rel)
        if not current:
            return None
        current = posixpath.dirname(current)


def _paths(path: Path) -> dict[str, list[str]]:
    """Return compilerOptions.paths of a tsconfig file, without its comments.

    A file that cannot be read, or that has no paths, gives an empty mapping.
    """
    try:
        data = json.loads(_blank_comments(path.read_text(encoding="utf-8")))
        mapping = data["compilerOptions"]["paths"]
        return {
            str(pattern): [t for t in targets if isinstance(t, str)]
            for pattern, targets in mapping.items()
            if isinstance(targets, list)
        }
    except (OSError, ValueError, KeyError, TypeError, AttributeError):
        return {}
