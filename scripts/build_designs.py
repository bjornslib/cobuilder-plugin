#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = []
# ///
"""Compile authored design directories into the self-bundle viewer projection.

SELF-ONLY. Do not "fix" this later to accept a foreign bundle.

Source is always ``<repo>/docs/architecture/designs/*/goal.json``.
Destination is always ``<repo>/.cobuilder-architect/self/data/designs.js``.

This is a full rebuild every run, not a merge into a prior ``designs.js``.
It scans every design directory the same way ``build_adrs.py`` rebuilds
``adrs.js`` from every ``ADR-*.md`` on disk, and ``build_diagrams.py``
rebuilds ``diagrams.js`` from every ``.mmd``.

A sibling ``intent.json`` or ``assessment.json`` is loaded when present
and attached to that design. Findings keep their ``kind`` so a design-stage
prediction stays visible.

If ``--bundle-dir`` is given and is not that self directory, refuse and
exit 1. Never write into a foreign fixture.

A missing designs dir, or a designs dir with zero ``goal.json`` files, is
not an error: ``data/designs.js`` is written as ``window.DESIGNS = {};``.

Usage:
    uv run build_designs.py
    uv run build_designs.py --repo <path>
    uv run build_designs.py --bundle-dir <repo>/.cobuilder-architect/self
"""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path

SOURCE_SUBDIR = Path("docs") / "architecture" / "designs"
SELF_BUNDLE = Path(".cobuilder-architect") / "self"

GOAL_FIELDS = (
    "name",
    "title",
    "created",
    "outcome",
    "done_when",
    "abort_if",
    "min_work",
    "limits",
    "epics",
    "stage",
    "supersedes",
    "adr",
    "adrs",
    "rounds",
)
EPIC_FIELDS = ("id", "slug", "branch", "pr", "state", "outcome")
INTENT_FIELDS = ("problem", "approach", "alternatives")
ASSESSMENT_FIELDS = ("verdict", "findings")


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


def discover_goal_files(designs_dir: Path) -> list[Path]:
    if not designs_dir.is_dir():
        return []
    return sorted(p for p in designs_dir.glob("*/goal.json") if p.is_file())


def load_json(path: Path) -> tuple[object | None, str | None]:
    try:
        text = path.read_text()
    except OSError as exc:
        return None, f"could not read file: {exc}"
    try:
        return json.loads(text), None
    except json.JSONDecodeError as exc:
        return None, f"invalid JSON: {exc}"


def project_fields(source: dict, fields: tuple[str, ...]) -> dict:
    """Copy known fields in a stable order, then any extras in sorted order."""
    out: dict = {}
    for key in fields:
        if key in source:
            out[key] = source[key]
    for key in sorted(source):
        if key not in out:
            out[key] = source[key]
    return out


def project_epics(raw) -> tuple[list | None, str | None]:
    if raw is None:
        return [], None
    if not isinstance(raw, list):
        return None, "`epics` must be an array"
    projected: list[dict] = []
    for i, item in enumerate(raw):
        if not isinstance(item, dict):
            return None, f"`epics[{i}]` must be an object"
        projected.append(project_fields(item, EPIC_FIELDS))
    return projected, None


def project_goal(raw: object, rel: Path) -> tuple[dict | None, list[str]]:
    if not isinstance(raw, dict):
        return None, [f"{rel}: goal.json must be an object"]
    failures: list[str] = []
    name = raw.get("name")
    outcome = raw.get("outcome")
    if not isinstance(name, str) or not name.strip():
        failures.append(f"{rel}: `name` is required")
    if not isinstance(outcome, str) or not outcome.strip():
        failures.append(f"{rel}: `outcome` is required")
    epics, epic_error = project_epics(raw.get("epics"))
    if epic_error:
        failures.append(f"{rel}: {epic_error}")
    if failures:
        return None, failures
    goal = project_fields(raw, GOAL_FIELDS)
    goal["epics"] = epics
    return goal, []


def project_intent(raw: object, rel: Path) -> tuple[dict | None, str | None]:
    if not isinstance(raw, dict):
        return None, f"{rel}: intent.json must be an object"
    return project_fields(raw, INTENT_FIELDS), None


def project_assessment(raw: object, rel: Path) -> tuple[dict | None, str | None]:
    if not isinstance(raw, dict):
        return None, f"{rel}: assessment.json must be an object"
    assessment = project_fields(raw, ASSESSMENT_FIELDS)
    findings = assessment.get("findings")
    if findings is None:
        return assessment, None
    if not isinstance(findings, list):
        return None, f"{rel}: `findings` must be an array"
    projected_findings: list = []
    for i, item in enumerate(findings):
        if not isinstance(item, dict):
            return None, f"{rel}: `findings[{i}]` must be an object"
        # Keep `kind` first so a design-stage prediction stays visible.
        finding: dict = {}
        if "kind" in item:
            finding["kind"] = item["kind"]
        for key in item:
            if key not in finding:
                finding[key] = item[key]
        projected_findings.append(finding)
    assessment["findings"] = projected_findings
    return assessment, None


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
                "error: build_designs.py is self-only.\n"
                f"  source:      {repo / SOURCE_SUBDIR}\n"
                f"  destination: {self_dir / 'data' / 'designs.js'}\n"
                f"  --bundle-dir was {given}, which is not the self bundle.\n"
                "remediation: omit --bundle-dir, or pass the self path. "
                "Never point this script at a foreign fixture.",
                file=sys.stderr,
            )
            sys.exit(1)

    designs_dir = repo / SOURCE_SUBDIR
    dest_dir = self_dir / "data"
    found = discover_goal_files(designs_dir)
    if not designs_dir.is_dir():
        print(f"No designs dir at {designs_dir} — writing an empty projection.")
    elif not found:
        print(f"No goal.json files found in {designs_dir} — writing an empty projection.")

    failures: list[str] = []
    records: dict[str, dict] = {}
    for path in found:
        rel = path.relative_to(repo) if path.is_relative_to(repo) else path
        raw, error = load_json(path)
        if error:
            failures.append(f"{rel}: {error}")
            continue
        goal, goal_failures = project_goal(raw, rel)
        failures.extend(goal_failures)
        if goal is None:
            continue
        name = goal["name"]
        if name in records:
            failures.append(f"{rel}: duplicate name {name!r}")
            continue
        record: dict = {"goal": goal}

        intent_path = path.parent / "intent.json"
        if intent_path.is_file():
            intent_rel = (
                intent_path.relative_to(repo) if intent_path.is_relative_to(repo) else intent_path
            )
            intent_raw, intent_error = load_json(intent_path)
            if intent_error:
                failures.append(f"{intent_rel}: {intent_error}")
            else:
                intent, intent_shape = project_intent(intent_raw, intent_rel)
                if intent_shape:
                    failures.append(intent_shape)
                elif intent is not None:
                    record["intent"] = intent

        assessment_path = path.parent / "assessment.json"
        if assessment_path.is_file():
            assessment_rel = (
                assessment_path.relative_to(repo)
                if assessment_path.is_relative_to(repo)
                else assessment_path
            )
            assessment_raw, assessment_error = load_json(assessment_path)
            if assessment_error:
                failures.append(f"{assessment_rel}: {assessment_error}")
            else:
                assessment, assessment_shape = project_assessment(
                    assessment_raw, assessment_rel
                )
                if assessment_shape:
                    failures.append(assessment_shape)
                elif assessment is not None:
                    record["assessment"] = assessment

        narrative_path = path.parent / "narrative.json"
        if narrative_path.is_file():
            narrative_rel = (
                narrative_path.relative_to(repo)
                if narrative_path.is_relative_to(repo)
                else narrative_path
            )
            narrative_raw, narrative_error = load_json(narrative_path)
            if narrative_error:
                failures.append(f"{narrative_rel}: {narrative_error}")
            elif not isinstance(narrative_raw, dict):
                failures.append(f"{narrative_rel}: narrative.json must be an object")
            else:
                record["narrative"] = narrative_raw

        diagrams: dict[str, str] = {}
        diagrams_dir = path.parent / "diagrams"
        if diagrams_dir.is_dir():
            for level in (1, 2, 3):
                mmd = diagrams_dir / f"level-{level}.mmd"
                if mmd.is_file():
                    text = mmd.read_text()
                    if text.strip():
                        diagrams[str(level)] = text
        if diagrams:
            record["diagrams"] = diagrams

        records[name] = record

    if failures:
        print("error: design validation failed for one or more files:", file=sys.stderr)
        for failure in failures:
            print(f"  {failure}", file=sys.stderr)
        print(
            "remediation: fix the files listed above — see "
            "skills/odyssey/references/design-mode.md §12 — then re-run. "
            "Nothing was written.",
            file=sys.stderr,
        )
        sys.exit(1)

    projected = {name: records[name] for name in sorted(records)}
    dest_dir.mkdir(parents=True, exist_ok=True)
    js_path = dest_dir / "designs.js"
    js_path.write_text(
        f"window.DESIGNS = {json.dumps(projected, ensure_ascii=False)};\n"
    )
    print(
        f"Wrote {js_path} "
        f"({len(projected)} design(s); full rebuild, not a merge)"
    )


if __name__ == "__main__":
    main()
