#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = []
# ///
"""Compile per-PR Mermaid diagram sources into <bundle-dir>/data/diagrams.js.

Reads `<bundle-dir>/data/diagrams/pr{N}-level{L}.mmd` (L in 1..3 — level 4 has
no diagram; see `skills/odyssey/references/diagram-mode.md` for the authoring
contract) and rebuilds `data/diagrams.js` from scratch as a single line:

    window.DIAGRAMS = {"<pr>": {"<level>": "<mmd source>"}, ...};

This is a full rebuild every run, not a merge into a prior diagrams.js — it
scans every `pr*-level*.mmd` file present in the diagrams dir each time, the
same way `extract_diffs.py`'s `rewrite_manifest()` rebuilds `manifest.js` from
what's on disk rather than accreting stale entries.

Every build validates every discovered .mmd file (unless `--validate` is
passed, which validates only and writes nothing):
  - the first non-blank, non-`%%`-comment line must start with the level's
    required diagram type (1 -> C4Container, 2 -> sequenceDiagram,
    3 -> classDiagram)
  - `{}`, `()`, `[]` must balance across the whole file
  - the file must be non-empty after stripping comments/whitespace

All failing files are reported together, not just the first one found.

`--strict` additionally shells out to `npx @mermaid-js/mermaid-cli` per file
to prove it actually parses, when `npx` is on PATH; if `npx` is missing this
prints a skip note and continues rather than failing the build.

A missing diagrams dir, or a diagrams dir with zero .mmd files, is not an
error: `data/diagrams.js` is written as `window.DIAGRAMS = {};`.

Usage:
    uv run build_diagrams.py --repo <path>
    uv run build_diagrams.py --bundle-dir <path>/.cobuilder-architect/self --prs 73,75
    uv run build_diagrams.py --bundle-dir <bundle> --validate
    uv run build_diagrams.py --bundle-dir <bundle> --strict
"""
from __future__ import annotations

import argparse
import json
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

FILENAME_RE = re.compile(r"^pr(\d+)-level(\d+)\.mmd$")
REQUIRED_TYPE = {
    1: "C4Container",
    2: "sequenceDiagram",
    3: "classDiagram",
}
OPEN_TO_CLOSE = {"{": "}", "(": ")", "[": "]"}
CLOSE_TO_OPEN = {v: k for k, v in OPEN_TO_CLOSE.items()}


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


def discover_diagram_files(diagrams_dir: Path) -> list[tuple[int, int, Path]]:
    """Returns [(pr_num, level, path), ...] for every pr{N}-level{L}.mmd found."""
    found = []
    if not diagrams_dir.is_dir():
        return found
    for path in diagrams_dir.glob("pr*-level*.mmd"):
        m = FILENAME_RE.match(path.name)
        if not m:
            continue
        found.append((int(m.group(1)), int(m.group(2)), path))
    return found


def strip_comments(text: str) -> str:
    """Blanks every `%%` comment line, keeping the line COUNT intact.

    The blank line matters: check_balance() reports a line number, and callers
    show that number to whoever has to fix the file. Dropping comment lines
    outright would shift every later number by the count of comments above it,
    which sends the reader to the wrong line. An emptied line still strips to
    nothing, so the "empty after stripping" test below reads the same either way.
    """
    return "\n".join(
        "" if line.strip().startswith("%%") else line
        for line in text.splitlines()
    )


def first_content_line(text: str) -> str | None:
    for line in text.splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("%%"):
            continue
        return stripped
    return None


def check_balance(text: str) -> str | None:
    """Returns an error string naming the first imbalance, or None if balanced."""
    stack: list[tuple[str, int]] = []  # (bracket, line number it opened on)
    for i, line in enumerate(text.splitlines(), start=1):
        for ch in line:
            if ch in OPEN_TO_CLOSE:
                stack.append((ch, i))
            elif ch in CLOSE_TO_OPEN:
                if not stack or stack[-1][0] != CLOSE_TO_OPEN[ch]:
                    return f"line {i}: unmatched '{ch}'"
                stack.pop()
    if stack:
        ch, line_no = stack[0]
        return f"line {line_no}: unclosed '{ch}'"
    return None


def validate_file(path: Path, level: int) -> list[str]:
    """Returns a list of problem strings (empty if the file is valid)."""
    problems: list[str] = []
    try:
        text = path.read_text()
    except OSError as e:
        return [f"could not read file: {e}"]

    stripped_of_comments = strip_comments(text)
    if not stripped_of_comments.strip():
        problems.append("file is empty after stripping comments/whitespace")
        return problems

    required = REQUIRED_TYPE.get(level)
    line = first_content_line(text)
    if required and (line is None or not line.startswith(required)):
        found = line if line is not None else "(no content line found)"
        problems.append(
            f"line 1: expected first content line to start with '{required}', found: {found!r}"
        )

    # Checked against the comment-stripped text, never the raw file: a `%%` comment
    # is prose, and prose carries brackets. `%% see rewrite_manifest(` or a `:-)` in
    # a note used to fail the whole build and send the authoring subagent off to
    # "fix" a diagram that was already correct.
    balance_error = check_balance(stripped_of_comments)
    if balance_error:
        problems.append(f"unbalanced brackets — {balance_error}")

    problems.extend(check_c4_title(text, level))

    return problems


def check_c4_title(text: str, level: int) -> list[str]:
    """A `#` outside quotation marks stops the C4 lexer dead: the whole diagram
    fails with `Lexical error on line N. Unrecognized text.` and the viewer shows
    an error card instead of a diagram.

    This is worth a dedicated check rather than leaving it to `--strict`, because
    it is the single most likely way to write a broken level-1 diagram: the title
    usually names the PR, and a PR is usually written `PR #1`. The bracket and
    header checks cannot see it, and `--strict` needs a Node toolchain that the
    plugin does not require.

    Only the C4 title line is affected. A `#` inside a quoted label is fine, and
    so is a `#` anywhere in a sequenceDiagram or a classDiagram — all verified
    against mermaid 11.6.0's parser.
    """
    if REQUIRED_TYPE.get(level) != "C4Container":
        return []
    problems: list[str] = []
    for lineno, raw in enumerate(text.splitlines(), start=1):
        if not raw.strip().startswith("title "):
            continue
        # Only a `#` that sits outside quotation marks reaches the lexer as syntax.
        outside = re.sub(r'"[^"]*"', "", raw)
        if "#" in outside:
            problems.append(
                f"line {lineno}: '#' outside quotation marks in a C4 title line — "
                "the C4 lexer stops there and the whole diagram fails to render. "
                "Write 'PR 1' instead of 'PR #1', or put the text in quotation marks."
            )
    return problems


def run_strict_check(path: Path) -> str | None:
    """Returns an error string if mermaid-cli fails to parse the file, else None."""
    with tempfile.TemporaryDirectory() as tmp:
        out_svg = Path(tmp) / "out.svg"
        try:
            result = subprocess.run(
                ["npx", "-y", "@mermaid-js/mermaid-cli", "-i", str(path), "-o", str(out_svg)],
                capture_output=True,
                text=True,
                timeout=120,
            )
        except (subprocess.TimeoutExpired, FileNotFoundError) as e:
            return f"mermaid-cli invocation failed: {e}"
        if result.returncode != 0:
            tail = (result.stderr or result.stdout or "").strip().splitlines()
            detail = tail[-1] if tail else f"exit code {result.returncode}"
            return f"mermaid-cli rejected the file: {detail}"
    return None


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--repo", default=None, help="path to the target git repo (default: cwd)")
    parser.add_argument("--bundle-dir", default=None, help="bundle output dir (default: <repo>/.cobuilder-architect/self)")
    parser.add_argument("--prs", default=None, help="comma-separated PR numbers (default: all PRs found in the diagrams dir)")
    parser.add_argument("--validate", action="store_true", help="validate only; write nothing")
    parser.add_argument("--strict", action="store_true", help="also parse each file with mermaid-cli via npx, if npx is on PATH")
    args = parser.parse_args()

    repo = resolve_repo(args.repo)
    bundle_dir = Path(args.bundle_dir).resolve() if args.bundle_dir else repo / ".cobuilder-architect" / "self"
    diagrams_dir = bundle_dir / "data" / "diagrams"
    diagrams_js = bundle_dir / "data" / "diagrams.js"

    requested_prs: set[int] | None = None
    if args.prs:
        requested_prs = {int(x.strip()) for x in args.prs.split(",") if x.strip()}
        if not requested_prs:
            print("error: --prs must list at least one PR number.\nremediation: pass --prs N[,M,...]", file=sys.stderr)
            sys.exit(1)

    all_found = discover_diagram_files(diagrams_dir)
    if requested_prs is not None:
        found = [(pr, level, path) for pr, level, path in all_found if pr in requested_prs]
    else:
        found = all_found

    if not diagrams_dir.is_dir():
        print(f"No diagrams dir at {diagrams_dir} — nothing to validate or compile.")
    elif not found:
        scope = f" for PR(s) {sorted(requested_prs)}" if requested_prs is not None else ""
        print(f"No .mmd files found in {diagrams_dir}{scope}.")

    failures: list[str] = []
    for pr_num, level, path in sorted(found):
        problems = validate_file(path, level)
        for problem in problems:
            failures.append(f"{path}: {problem}")
        if args.strict and not problems:
            if shutil.which("npx"):
                strict_error = run_strict_check(path)
                if strict_error:
                    failures.append(f"{path}: {strict_error}")
            else:
                print(f"skip: npx not found on PATH — cannot mermaid-cli-check {path}")

    if failures:
        print("error: diagram validation failed for one or more files:", file=sys.stderr)
        for failure in failures:
            print(f"  {failure}", file=sys.stderr)
        print(
            "remediation: fix the .mmd source listed above — see "
            "skills/odyssey/references/diagram-mode.md for the per-level contract "
            "and syntax constraints, then re-run.",
            file=sys.stderr,
        )
        sys.exit(1)

    if args.validate:
        print(f"OK: {len(found)} diagram file(s) validated, nothing written (--validate).")
        return

    # `--prs` scopes VALIDATION, never the compile. diagrams.js is always rebuilt
    # from every .mmd on disk, because generate mode runs this once per PR: scoping
    # the compile too would make `--prs 2` silently drop PR 1's diagrams from the
    # bundle. Same whole-directory rebuild rule as rewrite_manifest() in
    # extract_story.py — the file on disk is the state, the flag is just a filter
    # on what this invocation is responsible for checking.
    diagrams: dict[str, dict[str, str]] = {}
    for pr_num, level, path in sorted(all_found):
        diagrams.setdefault(str(pr_num), {})[str(level)] = path.read_text()

    diagrams_js.parent.mkdir(parents=True, exist_ok=True)
    diagrams_js.write_text(f"window.DIAGRAMS = {json.dumps(diagrams, ensure_ascii=False)};\n")
    print(
        f"Wrote {diagrams_js} ({len(all_found)} diagram(s) across {len(diagrams)} PR(s); "
        f"validated {len(found)} this run)"
    )


if __name__ == "__main__":
    main()
