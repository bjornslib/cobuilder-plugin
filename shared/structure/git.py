"""Git reads for the structure signals. Each function runs git in one folder of a repo.

A failed git command raises GitError. The callers write the error into not_analysed.
"""
from __future__ import annotations

import re
import subprocess
from pathlib import Path

_HUNK = re.compile(r"^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@", re.MULTILINE)


class GitError(Exception):
    """A git command did not run, or it failed."""


def _git(root: Path, *args: str, ok_codes: tuple[int, ...] = (0,)) -> str:
    """Return the output of git run in root. Raise GitError when the exit code is not allowed."""
    try:
        result = subprocess.run(
            ["git", "-C", str(root), *args], capture_output=True, timeout=30, check=False
        )
    except (OSError, subprocess.SubprocessError) as error:
        raise GitError(f"git {args[0]} did not run: {error}") from error
    if result.returncode not in ok_codes:
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


def merge_base(root: Path) -> str | None:
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
    base = merge_base(root)
    if base:
        names.update(_added(root, base, "HEAD"))
    return frozenset(names)


def slice_files(root: Path, base: str) -> dict[str, list[str]]:
    """Return the added and modified files of the slice diff, from base to the work tree.

    A file that git reports as added counts as added. So does each untracked file that
    the ignore rules keep. Raise GitError when base is not a commit.
    """
    output = _git(root, "diff", "-z", "--name-status", "--no-renames", "--no-color", base)
    added = set(_names(_git(root, "ls-files", "-z", "--others", "--exclude-standard")))
    modified: set[str] = set()
    tokens = output.split("\0")
    for status, name in zip(tokens[::2], tokens[1::2]):
        if status == "A":
            added.add(name)
        elif status == "M":
            modified.add(name)
    return {"added": sorted(added), "modified": sorted(modified)}


def added_lines(root: Path, base: str, path: str) -> list[int]:
    """Return the line numbers of the work tree that the diff from base adds to one file."""
    text = _git(root, "diff", "--no-color", "-U0", base, "--", path)
    lines: list[int] = []
    for match in _HUNK.finditer(text):
        start, count = int(match.group(1)), int(match.group(2) or 1)
        lines.extend(range(start, start + count))
    return lines


def file_at(root: Path, base: str, path: str) -> str:
    """Return the text of one file at the base commit. Raise GitError when the file is not there."""
    return _git(root, "show", f"{base}:{path}")


def files_with_word(root: Path, word: str) -> list[str]:
    """Return the sorted files of the work tree that hold word as a whole word.

    The search covers tracked and untracked files, and it skips ignored files. Exit code 1
    from git grep means no match, so it gives an empty list.
    """
    output = _git(
        root, "grep", "-z", "-l", "-I", "-w", "-F", "--untracked", "--exclude-standard",
        "-e", word, ok_codes=(0, 1),
    )
    return sorted(_names(output))
