#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = ["pyyaml"]
# ///
"""Compile authored ADR markdown into the self-bundle viewer projection.

SELF-ONLY. Do not "fix" this later to accept a foreign bundle.

Source is always ``<repo>/docs/architecture/adr/ADR-*.md``.
Destination is always ``<repo>/.cobuilder-architect/self/data/``
(``adrs.json`` and ``adrs.js``).

This is a full rebuild every run, not a merge into a prior ``adrs.json``.
It scans every ``ADR-*.md`` file in the authored tree, the same way
``build_diagrams.py`` rebuilds ``diagrams.js`` from every ``.mmd`` on disk.

If ``--bundle-dir`` is given and is not that self directory, refuse and
exit 1. Never write into a foreign fixture.

Usage:
    uv run build_adrs.py
    uv run build_adrs.py --repo <path>
    uv run build_adrs.py --bundle-dir <repo>/.cobuilder-architect/self
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import re
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import validate_decision_state as vds  # noqa: E402

ADR_FILENAME_RE = re.compile(r"^(ADR-\d{4})(?:-.*)?\.md$")
TITLE_PREFIX_RE = re.compile(r"^ADR-\d{4}\s+[—–-]\s+(.*)$")
SOURCE_SUBDIR = Path("docs") / "architecture" / "adr"
SELF_BUNDLE = Path(".cobuilder-architect") / "self"

VIEWER_KEYS = (
    "id",
    "title",
    "state",
    "source_pr",
    "problem",
    "decision",
    "alternatives",
    "forces",
    "delivers",
    "body",
)
EXTRA_KEYS = ("maps_to", "approved_by", "history", "provenance")


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


def jsonable(value):
    """Coerce YAML types that json.dumps cannot emit (dates, mostly)."""
    if isinstance(value, dict):
        return {str(k): jsonable(v) for k, v in value.items()}
    if isinstance(value, list):
        return [jsonable(v) for v in value]
    if isinstance(value, dt.datetime):
        return value.date().isoformat()
    if isinstance(value, dt.date):
        return value.isoformat()
    return value


def split_frontmatter(text: str) -> tuple[dict | None, str]:
    """Return (frontmatter, body). Body is the markdown after the closing ---."""
    fm = vds.parse_frontmatter(text)
    lines = text.splitlines()
    try:
        start = lines.index("---")
        end = lines.index("---", start + 1)
    except ValueError:
        return fm, ""
    body = "\n".join(lines[end + 1 :])
    if body.startswith("\n"):
        body = body[1:]
    if text.endswith("\n") and body and not body.endswith("\n"):
        body += "\n"
    return fm, body


def record_title(fm: dict) -> str:
    name = fm.get("name")
    if isinstance(name, str) and name.strip():
        return name
    title = fm.get("title") or ""
    match = TITLE_PREFIX_RE.match(str(title))
    return match.group(1) if match else str(title)


def project_record(fm: dict, body: str) -> dict:
    record = {
        "id": fm.get("id"),
        "title": record_title(fm),
        "state": fm.get("state"),
        "source_pr": fm.get("source_pr"),
        "problem": fm.get("problem"),
        "decision": fm.get("decision"),
        "alternatives": jsonable(fm.get("alternatives")),
        "forces": jsonable(fm.get("forces")),
        "delivers": jsonable(fm.get("delivers")),
        "body": body,
    }
    for key in EXTRA_KEYS:
        if key in fm and fm[key] not in (None, ""):
            record[key] = jsonable(fm[key])
    return record


def discover_adr_files(adr_dir: Path) -> list[Path]:
    if not adr_dir.is_dir():
        return []
    return sorted(p for p in adr_dir.glob("ADR-*.md") if p.is_file())


def main() -> None:
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument("--repo", default=None, help="path to the git repo (default: cwd)")
    parser.add_argument(
        "--bundle-dir",
        default=None,
        help="must be <repo>/.cobuilder-architect/self if given; any other path is refused",
    )
    args = parser.parse_args()

    repo = resolve_repo(args.repo)
    self_dir = (repo / SELF_BUNDLE).resolve()
    if args.bundle_dir:
        given = Path(args.bundle_dir).resolve()
        if given != self_dir:
            print(
                "error: build_adrs.py is self-only.\n"
                f"  source:      {repo / SOURCE_SUBDIR}\n"
                f"  destination: {self_dir / 'data'}\n"
                f"  --bundle-dir was {given}, which is not the self bundle.\n"
                "remediation: omit --bundle-dir, or pass the self path. "
                "Never point this script at a foreign fixture.",
                file=sys.stderr,
            )
            sys.exit(1)

    adr_dir = repo / SOURCE_SUBDIR
    dest_dir = self_dir / "data"
    found = discover_adr_files(adr_dir)
    if not adr_dir.is_dir():
        print(f"No ADR dir at {adr_dir} — writing an empty projection.")
    elif not found:
        print(f"No ADR-*.md files found in {adr_dir} — writing an empty projection.")

    failures: list[str] = []
    records: dict[str, dict] = {}
    for path in found:
        rel = path.relative_to(repo) if path.is_relative_to(repo) else path
        match = ADR_FILENAME_RE.match(path.name)
        if not match:
            failures.append(f"{rel}: filename must be ADR-NNNN-<slug>.md")
            continue
        try:
            text = path.read_text()
        except OSError as exc:
            failures.append(f"{rel}: could not read file: {exc}")
            continue
        try:
            fm, body = split_frontmatter(text)
        except RuntimeError as exc:
            failures.append(f"{rel}: {exc}")
            continue
        if fm is None:
            failures.append(f"{rel}: no parseable YAML frontmatter")
            continue
        failures.extend(vds.validate_record(fm, str(rel)))
        rid = str(fm.get("id") or "")
        expected = match.group(1)
        if rid and rid != expected:
            failures.append(
                f"{rel}: `id` {rid!r} does not match filename prefix {expected!r}"
            )
        if rid in records:
            failures.append(f"{rel}: duplicate id {rid!r}")
            continue
        if rid:
            records[rid] = project_record(fm, body)

    if failures:
        print("error: ADR validation failed for one or more files:", file=sys.stderr)
        for failure in failures:
            print(f"  {failure}", file=sys.stderr)
        print(
            "remediation: fix the markdown listed above — see "
            "skills/architecture/references/decision-records.md — then re-run. "
            "Nothing was written.",
            file=sys.stderr,
        )
        sys.exit(1)

    projected = {rid: records[rid] for rid in sorted(records)}
    dest_dir.mkdir(parents=True, exist_ok=True)
    json_path = dest_dir / "adrs.json"
    js_path = dest_dir / "adrs.js"
    json_path.write_text(
        json.dumps(projected, ensure_ascii=False, indent=2) + "\n"
    )
    js_path.write_text(
        f"window.ADRS = {json.dumps(projected, ensure_ascii=False)};\n"
    )
    print(
        f"Wrote {json_path} and {js_path} "
        f"({len(projected)} record(s); full rebuild, not a merge)"
    )


if __name__ == "__main__":
    main()
