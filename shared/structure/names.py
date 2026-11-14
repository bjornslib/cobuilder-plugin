"""The name rules of the structure signals: tokens, test names, clusters, and generic names.

Each rule reads one new file name and its folder. A rule returns a Finding or None.
The rules use the names in the folder, and never the file contents.
"""
from __future__ import annotations

import posixpath
import re

from .config import Config, excluded_by
from .types import Finding

EXAMPLES_MAX = 5
_SEPARATORS = re.compile(r"[_\-.\s]+")
_TOKEN = re.compile(r"[A-Z]+(?=[A-Z][a-z])|[A-Z]?[a-z]+\d*|[A-Z]+\d*|\d+")


def folder_of(rel: str) -> str:
    """Return the folder of a repo-relative path. The root folder is '.'."""
    return posixpath.dirname(rel) or "."


def stem_of(name: str) -> str:
    """Return the file name without its last suffix. Any folder part is ignored."""
    return posixpath.splitext(posixpath.basename(name))[0]


def split_tokens(stem: str) -> list[str]:
    """Return the lower-case tokens of a stem, split on separators and on case changes."""
    tokens: list[str] = []
    for part in _SEPARATORS.split(stem):
        tokens.extend(token.lower() for token in _TOKEN.findall(part))
    return tokens


def first_token(name: str) -> str | None:
    """Return the first token of a file name, or None when the name has no token."""
    tokens = split_tokens(stem_of(name))
    return tokens[0] if tokens else None


def is_test_name(name: str, config: Config) -> bool:
    """Return True when the stem starts with a test prefix or ends with a test suffix."""
    stem = stem_of(name)
    return stem.startswith(config.test_prefixes) or stem.endswith(config.test_suffixes)


def in_test_folder(rel: str) -> bool:
    """Return True when a folder of rel is a test folder, such as tests, __tests__, or testSupport."""
    for part in rel.split("/")[:-1]:
        name = part.strip("_").lower()
        if name.startswith("test") or name.endswith("tests"):
            return True
    return False


def is_code(rel: str, config: Config) -> bool:
    """Return True when the suffix of rel is one of the code extensions, test names included."""
    return posixpath.splitext(rel)[1] in config.code_extensions


def is_product(rel: str, config: Config) -> bool:
    """Return True for a code file that is not a test name and that no excluded path holds."""
    code = posixpath.splitext(rel)[1] in config.code_extensions
    test = is_test_name(rel, config) or in_test_folder(rel)
    return code and not test and excluded_by(rel, config) is None


def stem_cluster(rel: str, files: list[str], config: Config) -> Finding | None:
    """Return a name-stem cluster for a new file that starts one, or None.

    The siblings are the non-test files of the folder that share the first token.
    """
    stem = first_token(rel)
    if stem is None or is_test_name(rel, config) or _blocked(rel, files, stem, config):
        return None
    folder = folder_of(rel)
    siblings = sorted(name for name in files if _is_sibling(name, folder, stem, config))
    if len(siblings) < config.cluster_min:
        return None
    examples = ", ".join(posixpath.basename(name) for name in siblings[:EXAMPLES_MAX])
    facts = {"stem": stem, "count": len(siblings), "examples": examples}
    return Finding("name-stem-cluster", rel, folder, facts)


def generic_name(rel: str, config: Config) -> Finding | None:
    """Return a generic-name finding when the stem is in generic_names, or None.

    The match ignores case and a leading underscore. A test name, or a file in a
    test folder, never matches.
    """
    stem = stem_of(rel)
    if is_test_name(rel, config) or in_test_folder(rel):
        return None
    if stem.lower().lstrip("_") not in config.generic_names:
        return None
    return Finding("generic-name", rel, folder_of(rel), {"stem": stem})


def family_text(names: list[str], config: Config) -> str:
    """Return the first-token groups of two or more non-test names, largest first.

    Each group reads as a token and its count, such as 'alpha (4)'. The groups join with a comma.
    """
    groups: dict[str, int] = {}
    for name in names:
        token = first_token(name)
        if token is not None and not is_test_name(name, config):
            groups[token] = groups.get(token, 0) + 1
    ranked = sorted(groups.items(), key=lambda item: (-item[1], item[0]))
    return ", ".join(f"{token} ({count})" for token, count in ranked if count >= 2)


def _blocked(rel: str, files: list[str], stem: str, config: Config) -> bool:
    """Return True when no cluster can start with stem in the folder of rel.

    An excluded stem, an all-digit stem, or a stem in the folder path blocks the cluster.
    So does a direct sub-folder whose name tokens are exactly the stem.
    """
    folder = folder_of(rel)
    if stem in config.excluded_stems or stem.isdigit() or stem in _path_tokens(folder):
        return True
    return any(split_tokens(child) == [stem] for child in _sub_folders(folder, files))


def _path_tokens(folder: str) -> set[str]:
    """Return the tokens of the last three parts of a folder path."""
    return {token for part in folder.split("/")[-3:] for token in split_tokens(part)}


def _sub_folders(folder: str, files: list[str]) -> set[str]:
    """Return the names of the direct sub-folders of folder that hold files."""
    prefix = "" if folder == "." else folder + "/"
    rests = [name[len(prefix):] for name in files if name.startswith(prefix)]
    return {rest.split("/")[0] for rest in rests if "/" in rest}


def _is_sibling(name: str, folder: str, stem: str, config: Config) -> bool:
    """Return True when name sits in folder, is not a test name, and starts with stem."""
    return (
        folder_of(name) == folder
        and not is_test_name(name, config)
        and first_token(name) == stem
    )
