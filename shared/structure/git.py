"""Git reads for the structure signals. Each function runs git in one folder of a repo.

A failed git command raises GitError. The callers write the error into not_analysed.
"""
from __future__ import annotations

import subprocess
from pathlib import Path


class GitError(Exception):
    """A git command did not run, or it failed."""


def _git(root: Path, *args: str) -> str:
    """Return the output of git run in root. Raise GitError when git fails."""
    try:
        result = subprocess.run(
            ["git", "-C", str(root), *args], capture_output=True, timeout=30, check=False
        )
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


def repo_top(root: Path) -> Path:
    """Return the top folder of the repo that holds root. Raise GitError outside a repo."""
    return Path(_git(root, "rev-parse", "--show-toplevel").strip())


def try_repo_top(root: Path) -> Path | None:
    """Return the top folder of the repo that holds root, or None outside a repo."""
    text = (_try_git(root, "rev-parse", "--show-toplevel") or "").strip()
    return Path(text) if text else None


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
