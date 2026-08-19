#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = []
# ///
"""Extract per-PR unified diffs into <bundle-dir>/data/diffs-pr{N}.js.

For each requested PR, resolves its merge/squash commit, or — if the PR is
still open (no merge commit yet) — its head commit and local merge-base
(same discovery chain as extract_story.py — merge-commit scan, squash-commit
scan, gh CLI fallback with an open-PR path; duplicated here so this script is
standalone-runnable with no cross-imports), then computes the diff:
  - merge commit: `git diff <sha>^1 <sha>`
  - squash commit: `git diff <sha>^..<sha>`
  - open PR:       `git diff <merge-base>..<head>`

Open-PR diffs reflect the branch's current tip as of the run — re-running
after new commits land on that branch (and passing `--force`) refreshes the
diff rather than treating it as immutable history the way merged PRs are.

The diff is split per file (on `diff --git a/... b/...` boundaries), each
file's diff capped at 4000 lines with a truncation marker, and written as a
namespaced JS file: `window.DIFFS_BY_PR[N] = {"<path>": "<diff text>", ...}`.

`--branch` is the pre-submit path: it diffs a working branch that has no PR
number yet (`git diff <merge-base(base, ref)>..<ref>`), which is what submit
mode's interview reads before the PR exists. It writes JSON to
`<bundle-dir>/exports/branch-<slug>/diff.json` and touches NOTHING under
`data/` — story.json keys on an integer `pr`, so a branch cannot enter the
timeline, and a synthetic key would leak into verify_bundle.py, the viewer,
and the publish manifest. Authored `intent.json` and `assessment.json` live
under `docs/pull-requests/branch-<slug>/`, not next to this cache. This
script never writes those files. The PR number arrives when submit mode
opens the PR; the content is filed under it then. A branch diff always
overwrites, because the branch tip is the point.

Usage:
    uv run extract_diffs.py --repo <path> --prs 73,75
    uv run extract_diffs.py --repo <path> --prs 73 --force
    uv run extract_diffs.py --repo <path> --branch
    uv run extract_diffs.py --repo <path> --branch feature/x --base develop
"""
from __future__ import annotations

import argparse
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _manifest import rewrite_manifest

MAX_LINES_PER_FILE = 4000
MAX_BYTES_PER_FILE = 200_000  # belt-and-suspenders: some files (minified JS, a
# single-line JSON blob, a data-URI-heavy HTML export) pack megabytes onto a
# handful of lines, so the line cap alone doesn't bound them.
TRUNCATION_MARKER = "\n… [truncated by cobuilder-architect: diff exceeds 4000 lines]"
BYTE_TRUNCATION_MARKER = "\n… [truncated by cobuilder-architect: diff exceeds 200KB on very few lines]"
GENERATED_EXPORT_NOTE = "[not diffed by cobuilder-architect: this is a previously-published bundle export, not source — its content is a base64-heavy self-contained HTML file, and diffing it against itself on every regenerate would balloon future diffs without adding anything narratively useful]"

MERGE_PR_RE = re.compile(r"Merge pull request #(\d+) from \S+?/(\S+)")
SQUASH_PR_RE = re.compile(r"\(#(\d+)\)\s*$")
DIFF_GIT_RE = re.compile(r"^diff --git a/(.+?) b/(.+)$")
GENERATED_EXPORT_RE = re.compile(r"(^|/)exports/[^/]+\.html$")


# ---- PR resolution (duplicated from extract_story.py — no cross-imports) ----

def resolve_repo(repo_arg: str | None) -> Path:
    target = repo_arg or "."
    try:
        out = subprocess.check_output(
            ["git", "-C", target, "rev-parse", "--show-toplevel"],
            text=True,
            stderr=subprocess.PIPE,
        ).strip()
    except (subprocess.CalledProcessError, FileNotFoundError):
        print(
            f"error: '{target}' is not inside a git repository.\n"
            "remediation: run from inside a git checkout, or pass --repo <path-to-git-repo>",
            file=sys.stderr,
        )
        sys.exit(1)
    return Path(out)


def run_git(repo: Path, args: list[str]) -> str:
    return subprocess.check_output(["git", "-C", str(repo)] + args, text=True)


def run_git_quiet(repo: Path, args: list[str]) -> str:
    """run_git for a probe whose failure is expected and handled. Keeps git's
    own stderr off the user's terminal."""
    return subprocess.check_output(
        ["git", "-C", str(repo)] + args, text=True, stderr=subprocess.DEVNULL
    )


def get_remote_origin(repo: Path) -> str | None:
    try:
        return run_git(repo, ["remote", "get-url", "origin"]).strip()
    except subprocess.CalledProcessError:
        return None


def detect_default_branch(repo: Path) -> str:
    """Detect the repo's default branch: origin/HEAD symref first, then try
    `main` and `master` directly. Exits 1 with remediation if none resolve."""
    try:
        # This is a probe, and a repo with no origin/HEAD symref is the normal
        # case, not an error — swallow git's "fatal:" so it never reaches the
        # user's terminal on the way to the `main`/`master` fallback below.
        out = run_git_quiet(repo, ["symbolic-ref", "--short", "refs/remotes/origin/HEAD"]).strip()
        if out.startswith("origin/"):
            out = out[len("origin/"):]
        if out:
            return out
    except subprocess.CalledProcessError:
        pass

    for candidate in ("main", "master"):
        try:
            run_git(repo, ["rev-parse", "--verify", "--quiet", candidate])
            return candidate
        except subprocess.CalledProcessError:
            continue

    print(
        "error: could not detect the default branch.\n"
        "Tried: `git symbolic-ref --short refs/remotes/origin/HEAD`, then `main`, then `master`.\n"
        "remediation: pass --dot-range <branch> explicitly.",
        file=sys.stderr,
    )
    sys.exit(1)


def commit_kind(repo: Path, sha: str) -> str:
    out = run_git(repo, ["rev-list", "--parents", "-n", "1", sha]).strip()
    parts = out.split()
    return "merge" if len(parts) >= 3 else "squash"


def discover_merge_prs(repo: Path, rev: str) -> list[dict]:
    out = run_git(repo, ["log", "--merges", "--format=%h|%s", rev])
    prs = []
    for line in out.splitlines():
        line = line.strip()
        if not line:
            continue
        commit_hash, subject = line.split("|", 1)
        m = MERGE_PR_RE.search(subject)
        if not m:
            continue
        prs.append({"hash": commit_hash, "pr": int(m.group(1)), "kind": "merge"})
    return prs


def discover_squash_prs(repo: Path, rev: str) -> list[dict]:
    out = run_git(repo, ["log", "--first-parent", "--no-merges", "--format=%h|%s", rev])
    prs = []
    for line in out.splitlines():
        line = line.strip()
        if not line:
            continue
        commit_hash, subject = line.split("|", 1)
        m = SQUASH_PR_RE.search(subject)
        if not m:
            continue
        prs.append({"hash": commit_hash, "pr": int(m.group(1)), "kind": "squash"})
    return prs


def compute_merge_base(repo: Path, base_ref: str, head_ref: str) -> str | None:
    """Local merge-base of a PR's base branch and head commit. Falls back to
    `origin/<base_ref>` when the bare branch name doesn't resolve locally
    (e.g. an open PR from a fork, or a base branch not fetched under that
    exact local name)."""
    try:
        return run_git(repo, ["merge-base", base_ref, head_ref]).strip()
    except subprocess.CalledProcessError:
        pass
    try:
        return run_git(repo, ["merge-base", f"origin/{base_ref}", head_ref]).strip()
    except subprocess.CalledProcessError:
        return None


def try_gh_pr(repo: Path, pr_num: int) -> dict | None:
    origin = get_remote_origin(repo)
    cmd = [
        "gh", "pr", "view", str(pr_num), "--json",
        "mergeCommit,title,mergedAt,headRefOid,baseRefName",
    ]
    if origin:
        cmd += ["--repo", origin]
    try:
        out = subprocess.check_output(cmd, cwd=str(repo), text=True, stderr=subprocess.PIPE)
    except (subprocess.CalledProcessError, FileNotFoundError):
        return None
    try:
        data = json.loads(out)
    except json.JSONDecodeError:
        return None

    merge_commit = (data.get("mergeCommit") or {}).get("oid")
    merged_at = data.get("mergedAt") or ""

    if merge_commit:
        return {"hash": merge_commit, "pr": pr_num, "kind": commit_kind(repo, merge_commit)}

    if merged_at:
        # Reported merged but no merge commit oid — unexpected shape, don't guess.
        return None

    # No merge commit and not merged: this PR is still open.
    head_ref = data.get("headRefOid")
    base_ref = data.get("baseRefName")
    if not head_ref or not base_ref:
        return None
    merge_base = compute_merge_base(repo, base_ref, head_ref)
    if not merge_base:
        return None
    return {"hash": head_ref, "pr": pr_num, "kind": "open", "diff_base": merge_base}


def resolve_prs(repo: Path, pr_nums: list[int], dot_range: str | None) -> dict[int, dict]:
    rev = dot_range or detect_default_branch(repo)
    try:
        merges = discover_merge_prs(repo, rev)
        squashes = discover_squash_prs(repo, rev)
    except subprocess.CalledProcessError as e:
        print(
            f"error: git discovery failed for rev '{rev}': {e}\n"
            "remediation: verify the revision/range exists in this repo, or pass --dot-range explicitly.",
            file=sys.stderr,
        )
        sys.exit(1)
    combined: dict[int, dict] = {}
    for entry in squashes + merges:  # merges added last so they win on conflict
        combined[entry["pr"]] = entry

    resolved: dict[int, dict] = {}
    missing = []
    for num in pr_nums:
        if num in combined:
            resolved[num] = combined[num]
        else:
            missing.append(num)

    if missing:
        gh_path = shutil.which("gh")
        still_missing = []
        for num in missing:
            entry = try_gh_pr(repo, num) if gh_path else None
            if entry:
                resolved[num] = entry
            else:
                still_missing.append(num)
        if still_missing:
            print(
                f"error: could not resolve PR(s) {', '.join(str(n) for n in still_missing)}.\n"
                "Tried: merge-commit scan (`git log --merges`), squash-commit scan "
                "(`git log --first-parent`), and gh CLI fallback "
                f"({'available' if gh_path else 'gh not found on PATH'}).\n"
                "remediation: verify the PR number merged into this repo, or install/auth `gh`.",
                file=sys.stderr,
            )
            sys.exit(1)

    return resolved


# ---- working-branch resolution (no PR number yet) ----

def slugify(name: str) -> str:
    """Same rule as SKILL.md's Hub resolution slug: lowercase, every
    non-alphanumeric run collapsed to one hyphen, no leading/trailing
    hyphen."""
    out = re.sub(r"[^a-z0-9]+", "-", name.lower())
    return out.strip("-") or "branch"


def resolve_branch(repo: Path, ref: str, base: str | None) -> dict:
    """Resolve a working branch against its base. Returns the same
    {hash, kind, diff_base} shape the open-PR path produces, plus the
    branch name, its slug, and the base it was diffed against."""
    base_ref = base or detect_default_branch(repo)

    try:
        head_sha = run_git(repo, ["rev-parse", ref]).strip()
    except subprocess.CalledProcessError:
        print(
            f"error: '{ref}' does not resolve to a commit in this repo.\n"
            "remediation: pass --branch <existing-branch>, or omit it to use HEAD.",
            file=sys.stderr,
        )
        sys.exit(1)

    # A meaningful slug needs the branch NAME, not "HEAD". Detached HEAD has no
    # name, so fall back to the short sha rather than slugging "head".
    name = ref
    if ref == "HEAD":
        try:
            name = run_git(repo, ["rev-parse", "--abbrev-ref", "HEAD"]).strip()
        except subprocess.CalledProcessError:
            name = ""
        if not name or name == "HEAD":
            name = head_sha[:8]

    merge_base = compute_merge_base(repo, base_ref, head_sha)
    if not merge_base:
        print(
            f"error: no merge-base between '{base_ref}' and '{ref}'.\n"
            f"Tried: `git merge-base {base_ref} {ref}`, then `git merge-base origin/{base_ref} {ref}`.\n"
            "remediation: fetch the base branch, or pass --base <branch> explicitly.",
            file=sys.stderr,
        )
        sys.exit(1)

    if merge_base == head_sha:
        print(
            f"error: '{ref}' has no commits beyond '{base_ref}' — there is nothing to review.\n"
            "remediation: commit your work on this branch first.",
            file=sys.stderr,
        )
        sys.exit(1)

    return {
        "hash": head_sha,
        "kind": "open",
        "diff_base": merge_base,
        "branch": name,
        "slug": slugify(name),
        "base": base_ref,
    }


def diff_stats(repo: Path, base_sha: str, head_sha: str) -> dict[str, int]:
    """files/adds/dels from `git diff --numstat`. A binary file reports "-"
    for both counts, and contributes to `files` only."""
    out = run_git(repo, ["diff", "--numstat", f"{base_sha}..{head_sha}"])
    files = adds = dels = 0
    for line in out.splitlines():
        parts = line.split("\t")
        if len(parts) < 3:
            continue
        files += 1
        if parts[0].isdigit():
            adds += int(parts[0])
        if parts[1].isdigit():
            dels += int(parts[1])
    return {"files": files, "adds": adds, "dels": dels}


# ---- diff extraction ----

def get_diff_text(repo: Path, entry: dict) -> str:
    sha = entry["hash"]
    if entry["kind"] == "merge":
        # First-parent diff, not <parent1>..<parent2>. First-parent is the
        # PR's actual contribution to the mainline. <parent1>..<parent2>
        # additionally reverses whatever landed on the base branch after
        # the PR branched, which corrupts the diff for any PR that is not
        # the most recent merge. Do not "simplify" this back.
        return run_git(repo, ["diff", f"{sha}^1", sha])
    if entry["kind"] == "open":
        return run_git(repo, ["diff", f"{entry['diff_base']}..{sha}"])
    return run_git(repo, ["diff", f"{sha}^..{sha}"])


def split_diff_by_file(diff_text: str) -> dict[str, str]:
    files: dict[str, list[str]] = {}
    current_path: str | None = None
    current_lines: list[str] = []
    for line in diff_text.splitlines():
        m = DIFF_GIT_RE.match(line)
        if m:
            if current_path is not None:
                files[current_path] = current_lines
            current_path = m.group(2)  # "b/" side (post-change path)
            current_lines = [line]
        elif current_path is not None:
            current_lines.append(line)
    if current_path is not None:
        files[current_path] = current_lines

    result = {}
    for path, file_lines in files.items():
        if GENERATED_EXPORT_RE.search(path):
            result[path] = file_lines[0] + "\n" + GENERATED_EXPORT_NOTE
            continue
        if len(file_lines) > MAX_LINES_PER_FILE:
            text = "\n".join(file_lines[:MAX_LINES_PER_FILE]) + TRUNCATION_MARKER
        else:
            text = "\n".join(file_lines)
        if len(text.encode()) > MAX_BYTES_PER_FILE:
            # Truncate on a character boundary near the byte cap, not a line
            # boundary — a single oversized line is exactly the case this
            # guards against.
            encoded = text.encode()[:MAX_BYTES_PER_FILE]
            text = encoded.decode(errors="ignore") + BYTE_TRUNCATION_MARKER
        result[path] = text
    return result


def write_diffs_file(data_dir: Path, pr_num: int, files: dict[str, str]) -> Path:
    out_path = data_dir / f"diffs-pr{pr_num}.js"
    body = json.dumps(files, ensure_ascii=False, indent=2)
    content = (
        "window.DIFFS_BY_PR = window.DIFFS_BY_PR || {};\n"
        f"window.DIFFS_BY_PR[{pr_num}] = {body};\n"
    )
    out_path.write_text(content)
    return out_path


def write_branch_diff(bundle_dir: Path, entry: dict, files: dict[str, str], stats: dict[str, int]) -> Path:
    """Write the pre-submit staging file. JSON, not JS: nothing loads a branch
    diff into the viewer, and submit mode reads it directly."""
    out_dir = bundle_dir / "exports" / f"branch-{entry['slug']}"
    out_dir.mkdir(parents=True, exist_ok=True)
    payload = {
        "kind": "branch",
        "branch": entry["branch"],
        "slug": entry["slug"],
        "base": entry["base"],
        "merge_base": entry["diff_base"],
        "head": entry["hash"],
        "stats": stats,
        "files": files,
    }
    out_path = out_dir / "diff.json"
    out_path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n")
    return out_path


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--repo", default=None, help="path to the target git repo (default: cwd)")
    parser.add_argument("--bundle-dir", default=None, help="bundle output dir (default: <repo>/.cobuilder-architect/self)")
    parser.add_argument("--prs", default=None, help="comma-separated PR numbers, e.g. 73,75")
    parser.add_argument(
        "--branch",
        nargs="?",
        const="HEAD",
        default=None,
        metavar="REF",
        help="pre-submit path: diff a working branch with no PR number yet (default ref: HEAD). "
        "Writes exports/branch-<slug>/diff.json and nothing under data/. Mutually exclusive with --prs",
    )
    parser.add_argument(
        "--base",
        default=None,
        help="base branch --branch diffs against (default: repo's detected default branch)",
    )
    parser.add_argument(
        "--dot-range",
        default=None,
        help="git revision to scan for PR merge/squash commits (default: repo's detected default branch)",
    )
    parser.add_argument("--force", action="store_true", help="overwrite diffs-pr{N}.js files that already exist")
    args = parser.parse_args()

    if bool(args.prs) == bool(args.branch):
        print(
            "error: pass exactly one of --prs or --branch.\n"
            "remediation: --prs N[,M,...] for a PR that exists, --branch for a working branch that has no PR yet.",
            file=sys.stderr,
        )
        sys.exit(1)

    repo = resolve_repo(args.repo)
    bundle_dir = Path(args.bundle_dir).resolve() if args.bundle_dir else repo / ".cobuilder-architect" / "self"
    data_dir = bundle_dir / "data"
    manifest_js = data_dir / "manifest.js"

    if args.branch:
        entry = resolve_branch(repo, args.branch, args.base)
        files = split_diff_by_file(get_diff_text(repo, entry))
        stats = diff_stats(repo, entry["diff_base"], entry["hash"])
        out_path = write_branch_diff(bundle_dir, entry, files, stats)
        print(
            f"branch {entry['branch']} vs {entry['base']}: "
            f"{stats['files']} file(s), +{stats['adds']}/-{stats['dels']} -> {out_path}"
        )
        return

    pr_nums = sorted({int(x.strip()) for x in args.prs.split(",") if x.strip()})
    if not pr_nums:
        print("error: --prs must list at least one PR number.\nremediation: pass --prs N[,M,...]", file=sys.stderr)
        sys.exit(1)

    resolved = resolve_prs(repo, pr_nums, args.dot_range)

    data_dir.mkdir(parents=True, exist_ok=True)
    for pr_num in pr_nums:
        out_path = data_dir / f"diffs-pr{pr_num}.js"
        if out_path.exists() and not args.force:
            print(f"PR #{pr_num}: skip (exists) -> {out_path}")
            continue
        entry = resolved[pr_num]
        diff_text = get_diff_text(repo, entry)
        files = split_diff_by_file(diff_text)
        write_diffs_file(data_dir, pr_num, files)
        print(f"PR #{pr_num}: wrote {len(files)} file(s) -> {out_path}")

    rewrite_manifest(bundle_dir, manifest_js)
    print(f"Wrote {manifest_js}")


if __name__ == "__main__":
    main()
