"""The settings of the structure signals, the config file, and the excluded paths.

The config file is optional. A missing file gives the defaults. A bad file gives
the defaults too, and the problem note says why. The defaults hold the evidence
of epic-E1-design.md, steps A1 to A7.
"""
from __future__ import annotations

import dataclasses
import fnmatch
import json
from dataclasses import dataclass
from pathlib import Path

from .git import try_repo_top

CONFIG_RELPATH = ".cobuilder/structure-signals.json"


@dataclass(frozen=True)
class Config:
    """The settings of the signals. The problem note says why the config file was not used."""

    folder_limit: int | None = 20
    percentile: int = 90
    min_folders: int = 10
    cluster_min: int = 3
    generic_names: frozenset[str] = frozenset({
        "utils", "util", "helpers", "helper", "common", "misc", "manager", "base",
    })
    excluded_stems: frozenset[str] = frozenset({"a", "an", "the", "index", "main", "init", "use"})
    code_extensions: frozenset[str] = frozenset({
        ".py", ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".php",
        ".java", ".rb", ".go", ".rs", ".kt", ".cs", ".swift",
    })
    excluded_paths: tuple[str, ...] = (
        "**/.*/**", "**/docs/**", "**/documentation/**", "**/fixtures/**",
        "**/__snapshots__/**",
        "**/migrations/**", "**/vendor/**", "**/generated/**",
    )
    test_prefixes: tuple[str, ...] = ("test_", "test-")
    test_suffixes: tuple[str, ...] = (".test", ".spec", "_test")
    # Duplicated code, from epic-E4-design.md step C6.
    dup_window: int = 6
    dup_min_chars: int = 120
    dup_min_line_chars: int = 4
    dup_min_distinct_lines: int = 4
    dup_named_lines_drop: int = 4
    dup_skip_prefixes: tuple[str, ...] = (
        "#", "//", "*", "/*", "import ", "from ", "export {", "}", ")", "]",
    )
    # The most file names that a finding lists as examples.
    examples_max: int = 5
    # A folder with more code files than parse_cap is not read for import groups.
    parse_cap: int = 60
    locality_min_importers: int = 2
    layer_limit: int = 3
    folder_table_min_code: int = 3
    caller_cap: int = 10
    # The whole-repository view: twin names, co-change groups, and the change window.
    twin_excluded_stems: frozenset[str] = frozenset({
        "index", "__init__", "main", "types", "conftest",
        "page", "route", "layout", "loading", "error", "not-found", "template", "default",
    })
    co_change_max_commit_files: int = 30
    co_change_min_support: int = 5
    co_change_min_jaccard: float = 0.5
    change_window_days: int = 90
    wide_change_window_days: int = 365
    min_window_commits: int = 20
    co_change_days: int = 365
    problem: str | None = None


# The names that the config file may set, in the order of the dataclass.
_SETTINGS = tuple(field.name for field in dataclasses.fields(Config) if field.name != "problem")
_SET_FIELDS = frozenset({
    "generic_names", "excluded_stems", "code_extensions", "twin_excluded_stems",
})
_LOWER_FIELDS = frozenset({"generic_names", "excluded_stems", "twin_excluded_stems"})
_TUPLE_FIELDS = frozenset({"excluded_paths", "test_prefixes", "test_suffixes", "dup_skip_prefixes"})
_FRACTION_FIELDS = frozenset({"co_change_min_jaccard"})


def load_config(root: Path) -> Config:
    """Return the config of the repo that holds root, or the defaults.

    The root may be any folder of the repo. A bad file gives a problem note.
    """
    path = (try_repo_top(root) or root) / CONFIG_RELPATH
    try:
        if not path.is_file():
            return Config()
        return _read(path)
    except (OSError, TypeError, ValueError) as error:
        return Config(problem=f"config not used: {CONFIG_RELPATH}: {error}.")


def _read(path: Path) -> Config:
    """Return the config that the file holds. Raise TypeError or ValueError when it is bad."""
    data = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        raise TypeError("the file must hold a JSON object")
    return Config(**{name: _value(name, data[name]) for name in data if name in _SETTINGS})


def _value(name: str, value: object) -> object:
    """Return one setting in the type that Config uses. Raise TypeError or ValueError if bad."""
    if name == "folder_limit" and value is None:
        return None
    if name in _TUPLE_FIELDS:
        return tuple(_strings(name, value))
    if name in _SET_FIELDS:
        items = _strings(name, value)
        return frozenset(item.lower() if name in _LOWER_FIELDS else item for item in items)
    if name in _FRACTION_FIELDS:
        return _fraction(name, value)
    return _whole(name, value)


def _strings(name: str, value: object) -> list[str]:
    """Return the value when it is a list of strings. Raise TypeError otherwise."""
    if not isinstance(value, list) or not all(isinstance(item, str) for item in value):
        raise TypeError(f"{name} must be a list of strings")
    return value


def _whole(name: str, value: object) -> int:
    """Return the value when it is a whole number in range. Raise TypeError or ValueError."""
    if isinstance(value, bool) or not isinstance(value, int):
        raise TypeError(f"{name} must be a whole number")
    if name == "percentile" and not 1 <= value <= 100:
        raise ValueError("percentile must be from 1 to 100")
    if value < 0:
        raise ValueError(f"{name} must not be negative")
    return value


def _fraction(name: str, value: object) -> float:
    """Return the value as a float when it is from 0 to 1. Raise TypeError or ValueError."""
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise TypeError(f"{name} must be a number")
    if not 0 <= value <= 1:
        raise ValueError(f"{name} must be from 0 to 1")
    return float(value)


def config_json(config: Config) -> dict[str, object]:
    """Return the settings as JSON values, in the order of the dataclass."""
    values: dict[str, object] = {}
    for name in _SETTINGS:
        value = getattr(config, name)
        if isinstance(value, frozenset):
            value = sorted(value)
        elif isinstance(value, tuple):
            value = list(value)
        values[name] = value
    return values


def excluded_by(rel: str, config: Config) -> str | None:
    """Return the first glob of excluded_paths that matches rel, or None."""
    for glob in config.excluded_paths:
        if _matches(rel, glob):
            return glob
    return None


def _matches(rel: str, glob: str) -> bool:
    """Return True when glob matches rel. A leading **/ also matches at the root."""
    patterns = (glob, glob[3:]) if glob.startswith("**/") else (glob,)
    return any(fnmatch.fnmatchcase(rel, pattern) for pattern in patterns)


def drop_excluded(files: list[str], config: Config) -> tuple[list[str], tuple[str, ...]]:
    """Return the files that no glob excludes, and one line for each glob that removed files."""
    kept: list[str] = []
    removed: dict[str, int] = {}
    for rel in files:
        glob = excluded_by(rel, config)
        if glob is None:
            kept.append(rel)
        else:
            removed[glob] = removed.get(glob, 0) + 1
    lines = tuple(
        glob_line(glob, removed[glob]) for glob in config.excluded_paths if glob in removed
    )
    return kept, lines


def glob_line(glob: str, count: int) -> str:
    """Return the not_analysed line for the files that one glob removed."""
    return f"{glob}: {_count_files(count)} not analysed."


def _count_files(count: int) -> str:
    """Return the count with the word file, in the singular or the plural."""
    return f"{count} file" if count == 1 else f"{count} files"
