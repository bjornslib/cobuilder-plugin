"""Facts about one new file, for the structure coaching.

The module reports facts and does not judge them. It uses the standard
library only, so the coach can import it without uv. A git error never
raises. The report names the error in not_analysed.
"""
from __future__ import annotations

import math
import os
import posixpath
import subprocess
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class Config:
    """The slice 1 defaults of epic-E1-design.md. Later slices add their fields."""

    folder_limit: int | None = 20
    percentile: int = 90
    min_folders: int = 10
    code_extensions: frozenset[str] = frozenset({
        ".py", ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".php",
        ".java", ".rb", ".go", ".rs", ".kt", ".cs", ".swift",
    })
    excluded_paths: tuple[str, ...] = (
        "**/.*/**", "**/docs/**", "**/fixtures/**", "**/__snapshots__/**",
        "**/migrations/**", "**/vendor/**", "**/generated/**",
    )


@dataclass(frozen=True)
class Finding:
    """One fact about one new file. The signal names the rule that fired."""

    signal: str
    path: str
    folder: str
    facts: dict[str, int | str]


@dataclass(frozen=True)
class Report:
    """The findings for one file, and the reason for each check that did not run."""

    findings: tuple[Finding, ...]
    not_analysed: tuple[str, ...]


class GitError(Exception):
    """A git command did not run, or it failed."""


def _git(root: Path, *args: str) -> str:
    """Return the output of git run in root. Raise GitError when git fails."""
    try:
        result = subprocess.run(["git", "-C", str(root), *args], capture_output=True, timeout=30)
    except (OSError, subprocess.SubprocessError) as error:
        raise GitError(f"git {args[0]} did not run: {error}") from error
    if result.returncode != 0:
        detail = result.stderr.decode("utf-8", "replace").strip()
        raise GitError(f"git {args[0]} failed: {detail}")
    return result.stdout.decode("utf-8", "replace")


def _try_git(root: Path, *args: str) -> str | None:
    """Return the output of git run in root, or None when git fails."""
    try:
        return _git(root, *args)
    except GitError:
        return None


def _names(output: str) -> list[str]:
    """Split the NUL-separated output of a git command into names."""
    return [name for name in output.split("\0") if name]


def repo_files(root: Path) -> list[str]:
    """Return the tracked files and the untracked files that ignore rules keep.

    The root is the repo top folder, because git lists names from its working folder.
    """
    return _names(_git(root, "ls-files", "-z", "--cached", "--others", "--exclude-standard"))


def _merge_base(root: Path) -> str | None:
    """Return the merge-base of HEAD and the default branch, or None when there is none.

    The default branch is origin HEAD, then main, then master.
    """
    origin = (_try_git(root, "symbolic-ref", "-q", "refs/remotes/origin/HEAD") or "").strip()
    for ref in (origin, "refs/heads/main", "refs/heads/master"):
        if not ref:
            continue
        base = (_try_git(root, "merge-base", "HEAD", ref) or "").strip()
        if base:
            return base
    return None


def _added(root: Path, *refs: str) -> set[str]:
    """Return the names that git diff lists as added, for the given refs."""
    output = _git(root, "diff", "-z", "--name-only", "--no-renames", "--diff-filter=A", *refs)
    return set(_names(output))


def new_files(root: Path) -> frozenset[str]:
    """Return the new files: untracked, staged as added, or added since the merge-base.

    The root is the repo top folder. Without a merge-base, the first two sets count alone.
    """
    names = set(_names(_git(root, "ls-files", "-z", "--others", "--exclude-standard")))
    names.update(_added(root, "--cached"))
    base = _merge_base(root)
    if base:
        names.update(_added(root, base, "HEAD"))
    return frozenset(names)


def _folder_of(rel: str) -> str:
    """Return the folder of a repo-relative path. The root folder is '.'."""
    return posixpath.dirname(rel) or "."


def folder_counts(files: list[str]) -> dict[str, int]:
    """Return the number of files that each folder holds directly."""
    counts: dict[str, int] = {}
    for rel in files:
        folder = _folder_of(rel)
        counts[folder] = counts.get(folder, 0) + 1
    return counts


def folder_limit(counts: dict[str, int], config: Config) -> int | None:
    """Return the larger of the config limit and the folder percentile, or None.

    The percentile needs at least min_folders folders that hold files. It is the
    value at position ceil(percentile / 100 * n), counted from 1 in sorted order.
    """
    limits = [] if config.folder_limit is None else [config.folder_limit]
    if counts and len(counts) >= config.min_folders:
        sizes = sorted(counts.values())
        rank = math.ceil(config.percentile * len(sizes) / 100)
        limits.append(sizes[max(rank, 1) - 1])
    return max(limits) if limits else None


def crowded_folder(
    rel: str, files: list[str], counts: dict[str, int], limit: int, config: Config
) -> Finding | None:
    """Return a finding when the folder of rel holds more than limit files and a code file."""
    folder = _folder_of(rel)
    count = counts.get(folder, 0)
    holds_code = any(
        _folder_of(name) == folder and posixpath.splitext(name)[1] in config.code_extensions
        for name in files
    )
    if count <= limit or not holds_code:
        return None
    return Finding("crowded-folder", rel, folder, {"count": count, "limit": limit})


def signals_for(path: str, root: Path, config: Config) -> Report:
    """Return the findings for one written file. The root is any folder of the repo.

    The check stops at the first step with no work. A git error goes into not_analysed.
    """
    try:
        top = Path(_git(root, "rev-parse", "--show-toplevel").strip())
        rel = os.path.relpath(os.path.realpath(path), top)
        if rel not in new_files(top):
            return Report((), ())
        files = repo_files(top)
    except GitError as error:
        return Report((), (f"not analysed: {error}",))
    counts = folder_counts(files)
    limit = folder_limit(counts, config)
    if limit is None:
        reason = (
            f"crowded-folder not run: fewer than {config.min_folders} folders hold files, "
            "and no folder limit applies."
        )
        return Report((), (reason,))
    finding = crowded_folder(rel, files, counts, limit, config)
    return Report(() if finding is None else (finding,), ())
