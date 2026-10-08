#!/usr/bin/env python3
# /// script
# requires-python = ">=3.9"
# dependencies = []
# ///
"""Check that each boundary record is current with the code it describes.

A context is stale when its `boundary.yaml` has no usable `verified_at` commit, or when
a later commit changed a file under its `path`. With `--paths`, the script also lists
each given file that no context covers. `--require` makes stale or uncovered results
exit 1. Without it, the script always exits 0.
"""
from __future__ import annotations

import argparse
import re
import subprocess
import sys
from pathlib import Path

IGNORED_PREFIXES = ("docs/", "tests/", ".cobuilder/", ".cobuilder-architect/")


def read_field(text: str, key: str) -> str:
    match = re.search(rf"^{key}:[ \t]*(.*)$", text, re.M)
    if not match:
        return ""
    value = match.group(1).split(" #")[0].strip()
    return value.strip("'\"")


def load_contexts(repo: Path) -> list[dict[str, str]]:
    contexts = []
    for f in sorted((repo / "docs/architecture/contexts").glob("*/boundary.yaml")):
        text = f.read_text()
        contexts.append(
            {
                "id": read_field(text, "id") or f.parent.name,
                "path": read_field(text, "path").rstrip("/"),
                "verified_at": read_field(text, "verified_at"),
            }
        )
    return contexts


def git_out(repo: Path, *args: str) -> str | None:
    result = subprocess.run(["git", *args], cwd=repo, capture_output=True, text=True)
    return result.stdout.strip() if result.returncode == 0 else None


def context_status(repo: Path, ctx: dict[str, str]) -> str:
    sha = ctx["verified_at"]
    if not sha or git_out(repo, "rev-parse", "--verify", "-q", f"{sha}^{{commit}}") is None:
        return "stale"
    changed = git_out(repo, "log", "--format=%H", f"{sha}..HEAD", "--", ctx["path"],
                      ":(exclude)docs/architecture/contexts")
    return "stale" if changed is None or changed else "ok"


def covers(ctx: dict[str, str], path: str) -> bool:
    if ctx["path"] == ".":
        return True
    return bool(ctx["path"]) and (path == ctx["path"] or path.startswith(ctx["path"] + "/"))


def check(repo: Path, paths: list[str]) -> tuple[list[tuple[str, str]], list[str]]:
    contexts = load_contexts(repo)
    statuses = [(c["id"], context_status(repo, c)) for c in contexts]
    uncovered = [
        p
        for p in paths
        if not p.startswith(IGNORED_PREFIXES) and not any(covers(c, p) for c in contexts)
    ]
    return statuses, uncovered


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--repo", default=".", help="repository root")
    parser.add_argument("--paths", nargs="*", default=[], help="changed files to check for coverage")
    parser.add_argument("--require", action="store_true", help="exit 1 on a stale or uncovered result")
    args = parser.parse_args()

    repo = Path(args.repo).resolve()
    statuses, uncovered = check(repo, args.paths)
    if args.paths:
        touched = {
            c["id"] for c in load_contexts(repo) if any(covers(c, p) for p in args.paths)
        }
        statuses = [(i, s) for i, s in statuses if i in touched]
    for ctx_id, status in statuses:
        print(f"{ctx_id}: {status}")
    for p in uncovered:
        print(f"uncovered: {p}")
    bad = uncovered or any(s != "ok" for _, s in statuses)
    sys.exit(1 if args.require and bad else 0)


if __name__ == "__main__":
    main()
