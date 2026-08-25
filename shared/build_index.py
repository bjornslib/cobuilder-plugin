#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = ["pyyaml"]
# ///
"""Compile every authored record into the self-bundle record index.

SELF-ONLY. Do not "fix" this later to accept a foreign bundle.

Source is the authored tree under ``<repo>/docs/`` plus the bundle's own
``inventory.yaml`` and ``data/story.json``. Destination is always
``<repo>/.cobuilder-architect/self/data/`` (``index.json`` and ``index.js``).

This script replaces ``build_adrs.py`` and ``build_designs.py``. It does not
sit beside them. It writes the same ``adrs.json``, ``adrs.js``, and
``designs.js`` projections those two scripts used to write, so the viewer's
existing Decisions and Designs rendering keeps working unchanged, and it
also writes the new ``index.json`` and ``index.js`` that carry every entity
with a stable id. A later slice retires the ``adrs.js`` and ``designs.js``
globals once the viewer reads the index directly. See ADR-0018.

This is a full rebuild every run, not a merge into a prior ``index.json``.
It scans every source document on disk each time, the same way
``build_adrs.py`` rebuilt ``adrs.js`` from every ``ADR-*.md`` file.

The joins between entities (``adr_to_pull_request``, ``slice_to_epic``,
``district_uncovered``, and the freshness block) are out of scope. A later
slice adds them. This script emits entities only.

If ``--bundle-dir`` is given and is not the self directory, refuse and exit
1. Never write into a foreign fixture.

Usage:
    uv run build_index.py
    uv run build_index.py --repo <path>
    uv run build_index.py --bundle-dir <repo>/.cobuilder-architect/self
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import re
import subprocess
import sys
from pathlib import Path

import yaml

sys.path.insert(0, str(Path(__file__).resolve().parent))
import validate_decision_state as vds  # noqa: E402
from _bundle_meta import (  # noqa: E402
    read_plugin_name,
    read_plugin_version,
    require_compatible,
    stamp_generator,
)
import slice_table  # noqa: E402

INDEX_SCHEMA_VERSION = "1.3"

SELF_BUNDLE = Path(".cobuilder-architect") / "self"
ADR_SOURCE_SUBDIR = Path("docs") / "architecture" / "adr"
DESIGN_SOURCE_SUBDIR = Path("docs") / "architecture" / "designs"
CONTEXT_SOURCE_SUBDIR = Path("docs") / "architecture" / "contexts"
PLANS_SOURCE_SUBDIR = Path("docs") / "plans"

ADR_FILENAME_RE = re.compile(r"^(ADR-\d{4})(?:-.*)?\.md$")
TITLE_PREFIX_RE = re.compile(r"^ADR-\d{4}\s+[—–-]\s+(.*)$")


# --------------------------------------------------------------------------
# repo resolution
# --------------------------------------------------------------------------


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


# --------------------------------------------------------------------------
# ADRs — feeds both the "adr" index entity and the legacy adrs.js projection
# --------------------------------------------------------------------------

ADR_VIEWER_KEYS = (
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
ADR_EXTRA_KEYS = ("maps_to", "approved_by", "history", "provenance", "related")


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


def adr_title(fm: dict) -> str:
    name = fm.get("name")
    if isinstance(name, str) and name.strip():
        return name
    title = fm.get("title") or ""
    match = TITLE_PREFIX_RE.match(str(title))
    return match.group(1) if match else str(title)


def project_adr_record(fm: dict, body: str) -> dict:
    record = {
        "id": fm.get("id"),
        "title": adr_title(fm),
        "state": fm.get("state"),
        "source_pr": fm.get("source_pr"),
        "problem": fm.get("problem"),
        "decision": fm.get("decision"),
        "alternatives": jsonable(fm.get("alternatives")),
        "forces": jsonable(fm.get("forces")),
        "delivers": jsonable(fm.get("delivers")),
        "body": body,
    }
    for key in ADR_EXTRA_KEYS:
        if key in fm and fm[key] not in (None, ""):
            record[key] = jsonable(fm[key])
    return record


def discover_adr_files(adr_dir: Path) -> list[Path]:
    if not adr_dir.is_dir():
        return []
    return sorted(p for p in adr_dir.glob("ADR-*.md") if p.is_file())


def collect_adrs(repo: Path) -> tuple[list[dict], dict[str, dict], list[str]]:
    """Read every ADR-*.md file.

    Returns (index_entities, viewer_records_by_id, failures). The index
    entity is a small subset of fields. The viewer record is the full
    projection ``adrs.js`` used to carry.
    """
    adr_dir = repo / ADR_SOURCE_SUBDIR
    found = discover_adr_files(adr_dir)
    failures: list[str] = []
    viewer_records: dict[str, dict] = {}
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
            failures.append(f"{rel}: `id` {rid!r} does not match filename prefix {expected!r}")
        if rid in viewer_records:
            failures.append(f"{rel}: duplicate id {rid!r}")
            continue
        if rid:
            viewer_records[rid] = project_adr_record(fm, body)

    entities = [
        {"id": rid, "title": rec.get("title"), "state": rec.get("state")}
        for rid, rec in sorted(viewer_records.items())
    ]
    return entities, viewer_records, failures


# --------------------------------------------------------------------------
# Designs and epics — feeds "design" + "epic" entities and designs.js
# --------------------------------------------------------------------------

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
        finding: dict = {}
        if "kind" in item:
            finding["kind"] = item["kind"]
        for key in item:
            if key not in finding:
                finding[key] = item[key]
        projected_findings.append(finding)
    assessment["findings"] = projected_findings
    return assessment, None


def collect_designs(
    repo: Path,
) -> tuple[list[dict], list[dict], dict[str, dict], list[str]]:
    """Read every design directory.

    Returns (design_entities, epic_entities, viewer_records_by_name, failures).
    An epic id is scoped as ``<design>/<epic-id>``, because a bare epic id
    such as ``E1`` repeats across designs.
    """
    designs_dir = repo / DESIGN_SOURCE_SUBDIR
    found = discover_goal_files(designs_dir)
    failures: list[str] = []
    viewer_records: dict[str, dict] = {}
    design_entities: list[dict] = []
    epic_entities: list[dict] = []

    for path in found:
        design_id = path.parent.name
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
        if name in viewer_records:
            failures.append(f"{rel}: duplicate name {name!r}")
            continue
        record: dict = {"goal": goal}

        intent_path = path.parent / "intent.json"
        if intent_path.is_file():
            intent_rel = intent_path.relative_to(repo) if intent_path.is_relative_to(repo) else intent_path
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
                assessment_path.relative_to(repo) if assessment_path.is_relative_to(repo) else assessment_path
            )
            assessment_raw, assessment_error = load_json(assessment_path)
            if assessment_error:
                failures.append(f"{assessment_rel}: {assessment_error}")
            else:
                assessment, assessment_shape = project_assessment(assessment_raw, assessment_rel)
                if assessment_shape:
                    failures.append(assessment_shape)
                elif assessment is not None:
                    record["assessment"] = assessment

        narrative_path = path.parent / "narrative.json"
        if narrative_path.is_file():
            narrative_rel = (
                narrative_path.relative_to(repo) if narrative_path.is_relative_to(repo) else narrative_path
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

        # The pull request draft is authored markdown that accompanies a design.
        # The viewer reads it to populate the "Envisioned pull request" section.
        # A design without a draft simply omits the key; do not invent a placeholder.
        pr_draft_path = path.parent / "pr-draft.md"
        if pr_draft_path.is_file():
            draft_text = pr_draft_path.read_text()
            if draft_text.strip():
                record["pr_draft"] = draft_text

        viewer_records[name] = record
        design_entities.append(
            {"id": design_id, "name": name, "outcome": goal.get("outcome"), "stage": goal.get("stage")}
        )
        for epic in goal.get("epics") or []:
            epic_id = epic.get("id")
            if not epic_id:
                continue
            epic_entities.append(
                {
                    "id": f"{design_id}/{epic_id}",
                    "design": design_id,
                    "epic_id": epic_id,
                    "branch": epic.get("branch"),
                    "pr": epic.get("pr"),
                    "state": epic.get("state"),
                    "note": epic.get("note"),
                }
            )

    return design_entities, epic_entities, viewer_records, failures


# --------------------------------------------------------------------------
# Contexts and boundary rules — feeds "context" + "boundary_rule" entities
# --------------------------------------------------------------------------

BOUNDARY_RULE_KINDS = {
    "forbidden_dependencies": "forbidden-dependency",
    "modules": "module-invariant",
    "context_map": "context-map",
}


def discover_boundary_files(contexts_dir: Path) -> list[Path]:
    if not contexts_dir.is_dir():
        return []
    return sorted(p for p in contexts_dir.glob("*/boundary.yaml") if p.is_file())


def collect_contexts(repo: Path) -> tuple[list[dict], list[dict], list[str]]:
    """Read every ``boundary.yaml``.

    Returns (context_entities, boundary_rule_entities, failures). A boundary
    rule id is ``<context>/<kind>/<n>``, one per entry in each of the three
    rule lists a boundary record may carry.
    """
    contexts_dir = repo / CONTEXT_SOURCE_SUBDIR
    found = discover_boundary_files(contexts_dir)
    failures: list[str] = []
    context_entities: list[dict] = []
    rule_entities: list[dict] = []

    for path in found:
        context_id = path.parent.name
        rel = path.relative_to(repo) if path.is_relative_to(repo) else path
        try:
            raw = yaml.safe_load(path.read_text())
        except (OSError, yaml.YAMLError) as exc:
            failures.append(f"{rel}: could not read boundary.yaml: {exc}")
            continue
        if not isinstance(raw, dict):
            failures.append(f"{rel}: boundary.yaml must be a mapping")
            continue

        verifies = raw.get("verifies")
        if not isinstance(verifies, list):
            verifies = []
        context_entities.append(
            {
                "id": context_id,
                "name": raw.get("name"),
                "path": raw.get("path"),
                "verifies": [str(v) for v in verifies],
            }
        )

        for source_key, kind in BOUNDARY_RULE_KINDS.items():
            rules = raw.get(source_key)
            if not isinstance(rules, list):
                continue
            for n, rule in enumerate(rules, start=1):
                rule_entities.append(
                    {
                        "id": f"{context_id}/{kind}/{n}",
                        "context": context_id,
                        "kind": kind,
                        "detail": jsonable(rule),
                    }
                )

    return context_entities, rule_entities, failures


# --------------------------------------------------------------------------
# Districts — feeds "district" entities, from the bundle's own inventory.yaml
# --------------------------------------------------------------------------


def collect_districts(bundle_dir: Path) -> tuple[list[dict], list[str]]:
    inventory_path = bundle_dir / "inventory.yaml"
    if not inventory_path.is_file():
        return [], []
    try:
        raw = yaml.safe_load(inventory_path.read_text())
    except (OSError, yaml.YAMLError) as exc:
        return [], [f"{inventory_path}: could not read inventory.yaml: {exc}"]
    if not isinstance(raw, dict):
        return [], [f"{inventory_path}: inventory.yaml must be a mapping"]
    rows = raw.get("contexts")
    if not isinstance(rows, list):
        return [], []
    entities = []
    for row in rows:
        if not isinstance(row, dict) or not row.get("id"):
            continue
        entities.append(
            {
                "id": row["id"],
                "label": row.get("label"),
                "paths": row.get("paths"),
            }
        )
    return entities, []


# --------------------------------------------------------------------------
# Slices — feeds "slice" entities, from docs/plans/<feature>/04-slices.md
# --------------------------------------------------------------------------


STATUS_GATE_RE = re.compile(r"^-\s*Gate\s*(\d+)\s*[—–-]\s*([^:]+):\s*(.+)$")
STATUS_SLICE_RE = re.compile(
    r"^-\s*\[(x| )\]\s*Slice\s*(\d+)\s*[—–-]\s*(.*?)(?:\s+score:\s*([^\s]+)(?:\s+on\s+attempt\s+(\d+))?)?$",
    re.IGNORECASE,
)


def collect_plans(repo: Path) -> tuple[list[dict], list[str]]:
    plans_dir = repo / PLANS_SOURCE_SUBDIR
    if not plans_dir.is_dir():
        return [], []
    entities: list[dict] = []
    failures: list[str] = []
    for slices_path in sorted(plans_dir.glob("*/04-slices.md")):
        feature = slices_path.parent.name
        status_slices: dict[int, dict] = {}
        status_path = slices_path.parent / "00-status.md"
        if status_path.is_file():
            try:
                for line in status_path.read_text().splitlines():
                    sm = STATUS_SLICE_RE.search(line.strip())
                    if sm:
                        checked = sm.group(1).lower() == "x"
                        num = int(sm.group(2))
                        score = sm.group(4) or ("1.00" if checked else "—")
                        attempts = int(sm.group(5)) if sm.group(5) else (1 if checked else 0)
                        status_slices[num] = {
                            "checked": checked,
                            "score": score,
                            "attempts": attempts,
                            "state": "completed" if checked else "planned",
                        }
            except OSError as exc:
                failures.append(f"{status_path}: could not read file: {exc}")

        try:
            lines = slices_path.read_text().splitlines()
        except OSError as exc:
            failures.append(f"{slices_path}: could not read file: {exc}")
            continue
        for line in lines:
            row = slice_table.parse_row(line.strip())
            if row is None:
                continue
            number = row.n
            slice_cell = row.name
            ends_with = row.ends_with
            n = row.n
            st = status_slices.get(n, {})
            checked = st.get("checked", False)
            score = st.get("score", "—")
            attempts = st.get("attempts", 1 if checked else 0)
            state = "completed" if checked else "planned"
            entities.append(
                {
                    "id": f"{feature}/{number}",
                    "feature": feature,
                    "n": n,
                    "title": slice_cell,
                    "ends_with": ends_with,
                    "score": score,
                    "attempts": attempts,
                    "state": state,
                }
            )
    return entities, failures


# --------------------------------------------------------------------------
# Pull requests — feeds "pull_request" entities, from the bundle's story.json
# --------------------------------------------------------------------------


def collect_pull_requests(bundle_dir: Path) -> tuple[list[dict], list[str]]:
    story_path = bundle_dir / "data" / "story.json"
    if not story_path.is_file():
        return [], []
    raw, error = load_json(story_path)
    if error:
        return [], [f"{story_path}: {error}"]
    if not isinstance(raw, dict):
        return [], [f"{story_path}: story.json must be an object"]
    timeline = raw.get("timeline")
    if not isinstance(timeline, list):
        return [], []
    entities = []
    for entry in timeline:
        if not isinstance(entry, dict) or entry.get("pr") is None:
            continue
        entities.append(
            {
                "id": entry["pr"],
                "title": entry.get("title"),
                "state": entry.get("status"),
                "commit": entry.get("commit"),
                "date": entry.get("date"),
            }
        )
    return entities, []


# --------------------------------------------------------------------------
# Publications — feeds "publication" entities, from exports/publish-manifest.json
# --------------------------------------------------------------------------


def collect_publications(bundle_dir: Path) -> tuple[list[dict], list[str]]:
    manifest_path = bundle_dir / "exports" / "publish-manifest.json"
    if not manifest_path.is_file():
        return [], []
    raw, error = load_json(manifest_path)
    if error:
        return [], [f"{manifest_path}: {error}"]
    if not isinstance(raw, dict):
        return [], [f"{manifest_path}: publish-manifest.json must be an object"]
    entities: list[dict] = []
    prs = raw.get("prs")
    if isinstance(prs, dict):
        for pr_number, entry in prs.items():
            if not isinstance(entry, dict):
                continue
            page = entry.get("export_file")
            if not page:
                continue
            entities.append(
                {
                    "id": page,
                    "pull_request": int(pr_number) if str(pr_number).isdigit() else pr_number,
                    "artifact_url": entry.get("artifact_url"),
                    "published_at": entry.get("published_at"),
                }
            )
    index_entry = raw.get("index")
    if isinstance(index_entry, dict) and index_entry.get("artifact_url"):
        entities.append(
            {
                "id": "exports/index.html",
                "pull_request": None,
                "artifact_url": index_entry.get("artifact_url"),
                "published_at": index_entry.get("published_at"),
            }
        )
    return entities, []


# --------------------------------------------------------------------------
# joins — resolves adr_to_pull_request, epic_to_pull_request, slice_to_epic,
# context_verifies_district, district_uncovered, adr_to_context, and
# adr_to_district. See ADR-0018 and 03-program-design.md.
# --------------------------------------------------------------------------

def gh_pr_for_branch(branch: str, warnings: list[str], gh_state: dict) -> int | None:
    """Look up the pull request whose head branch equals ``branch``.

    Uses ``gh pr list --head <branch> --state all``. Caches results and
    caches an unavailable ``gh`` across calls, so one offline machine does
    not retry the network once per branch. Returns None when no pull
    request exists yet, or when ``gh`` cannot answer.
    """
    if gh_state.get("unavailable"):
        return None
    cache = gh_state.setdefault("cache", {})
    if branch in cache:
        return cache[branch]
    try:
        out = subprocess.check_output(
            ["gh", "pr", "list", "--head", branch, "--state", "all", "--json", "number,state"],
            text=True,
            stderr=subprocess.PIPE,
            timeout=30,
        )
    except FileNotFoundError:
        gh_state["unavailable"] = True
        warnings.append("gh is not on PATH. Every branch-to-pull-request lookup is unresolved.")
        return None
    except (subprocess.CalledProcessError, subprocess.TimeoutExpired) as exc:
        gh_state["unavailable"] = True
        warnings.append(
            f"gh pr list failed ({exc}). Treating gh as unavailable for the rest of this build. "
            "Every remaining branch-to-pull-request lookup is unresolved."
        )
        return None
    try:
        rows = json.loads(out)
    except json.JSONDecodeError:
        cache[branch] = None
        return None
    number = rows[0]["number"] if rows else None
    cache[branch] = number
    return number


def resolve_epic_pull_requests(
    epic_entities: list[dict], warnings: list[str]
) -> tuple[dict[str, int], dict[str, str]]:
    """Resolve every epic's branch to a pull request, and record its status.

    An epic with no branch has not started. That is correct, not missing,
    so it never reaches ``gh``. Status is one of ``unstarted`` (no branch),
    ``no-pull-request`` (branch exists, gh found none), ``unknown`` (gh
    could not answer), or the pull request's own open, merged, or closed
    state.
    """
    gh_state: dict = {}
    epic_to_pr: dict[str, int] = {}
    epic_status: dict[str, str] = {}
    for epic in epic_entities:
        branch = epic.get("branch")
        if not branch:
            epic_status[epic["id"]] = "unstarted"
            continue
        if gh_state.get("unavailable"):
            epic_status[epic["id"]] = "unknown"
            continue
        number = gh_pr_for_branch(branch, warnings, gh_state)
        if number is None:
            epic_status[epic["id"]] = "unknown" if gh_state.get("unavailable") else "no-pull-request"
            continue
        epic_to_pr[epic["id"]] = number
        epic_status[epic["id"]] = "open"  # refined against pull_request entities by the caller
    return epic_to_pr, epic_status


def refine_epic_status(epic_status: dict[str, str], epic_to_pr: dict[str, int], pull_requests: list[dict]) -> None:
    """Replace the placeholder 'open' status with the real pull request state."""
    state_by_number = {pr["id"]: pr.get("state") for pr in pull_requests}
    for epic_id, pr_number in epic_to_pr.items():
        state = state_by_number.get(pr_number)
        if state:
            epic_status[epic_id] = str(state).lower()


def adrs_reaching_design(adr_id: str, adr_record: dict, design_records: dict[str, dict]) -> list[str]:
    """Return the design ids an ADR reaches: named in goal.adrs, or via a
    ``related`` path into that design's own directory."""
    reached: list[str] = []
    related = adr_record.get("related") or []
    for design_id, record in design_records.items():
        goal = record.get("goal") or {}
        adrs_named = goal.get("adrs") or ([goal["adr"]] if goal.get("adr") else [])
        if adr_id in adrs_named:
            reached.append(design_id)
            continue
        prefix = f"docs/architecture/designs/{design_id}/"
        if any(isinstance(r, str) and prefix in r for r in related):
            reached.append(design_id)
    return reached


def resolve_adr_to_pull_request(
    adrs_viewer: dict[str, dict],
    design_records: dict[str, dict],
    epic_entities: list[dict],
    epic_to_pr: dict[str, int],
) -> dict[str, dict]:
    """Resolve every ADR to its pull request, direct path first.

    ``via`` names which path resolved: ``direct`` (frontmatter carries
    ``source_pr``), ``epic`` (through a design and an epic's branch), or
    ``none`` (neither path resolves). ``path`` names the epics travelled,
    so a reader can see why the join landed where it did.
    """
    epics_by_design: dict[str, list[dict]] = {}
    for epic in epic_entities:
        epics_by_design.setdefault(epic["design"], []).append(epic)

    result: dict[str, dict] = {}
    for adr_id, record in sorted(adrs_viewer.items()):
        source_pr = record.get("source_pr")
        if source_pr:
            result[adr_id] = {"pr": source_pr, "via": "direct", "path": []}
            continue

        design_ids = adrs_reaching_design(adr_id, record, design_records)
        candidate_epics = [
            epic["id"] for design_id in design_ids for epic in epics_by_design.get(design_id, [])
        ]
        if not candidate_epics:
            result[adr_id] = {"pr": None, "via": "none", "path": []}
            continue

        resolved_pr = None
        for epic_id in candidate_epics:
            if epic_id in epic_to_pr:
                resolved_pr = epic_to_pr[epic_id]
                break
        result[adr_id] = {"pr": resolved_pr, "via": "epic", "path": candidate_epics}
    return result


def resolve_slice_to_epic(
    repo: Path, epic_entities: list[dict]
) -> tuple[dict[str, str], dict[str, str], list[str]]:
    """Read every ``04-slices.md`` and join each slice to the epic it
    advances. ``04-slices.md`` groups slices epic-first: a header row
    (an empty slice number) names the epic, and every slice row below it,
    up to the next header, belongs to that epic.

    An epic header must carry the scoped id, ``<design>/<epic-id>``. A bare
    id such as ``E1`` does not identify one epic, because more than one
    design can declare the same bare id. The join never guesses between
    them. A bare id, or a scoped id that names no real epic, produces an
    unresolved slice with a stated reason instead of a guessed epic.

    Returns ``(slice_to_epic, slice_to_epic_unresolved, warnings)``. The
    first dict holds only slices that resolved. The second names, for
    every slice that did not, why the join failed.
    """
    warnings: list[str] = []
    result: dict[str, str] = {}
    unresolved: dict[str, str] = {}
    epic_ids = {epic["id"] for epic in epic_entities}
    plans_dir = repo / PLANS_SOURCE_SUBDIR
    if not plans_dir.is_dir():
        return result, unresolved, warnings
    for slices_path in sorted(plans_dir.glob("*/04-slices.md")):
        feature = slices_path.parent.name
        current_epic: str | None = None
        current_reason: str | None = None
        for line in slices_path.read_text().splitlines():
            stripped = line.strip()
            header_id = slice_table.parse_header_epic_id(stripped)
            if header_id:
                if "/" not in header_id:
                    current_epic = None
                    current_reason = (
                        f"epic header {header_id!r} is a bare id, not a scoped "
                        "<design>/<epic-id> id, and more than one design can "
                        "share a bare id."
                    )
                    warnings.append(f"{slices_path}: {current_reason}")
                elif header_id not in epic_ids:
                    current_epic = None
                    current_reason = f"epic header names {header_id!r}, which no design declares."
                    warnings.append(f"{slices_path}: {current_reason}")
                else:
                    current_epic = header_id
                    current_reason = None
                continue
            row = slice_table.parse_row(stripped)
            if row is None:
                continue
            number = row.n
            slice_id = f"{feature}/{number}"
            if current_epic:
                result[slice_id] = current_epic
            elif current_reason:
                unresolved[slice_id] = current_reason
            else:
                reason = "slice declares no epic header above it."
                unresolved[slice_id] = reason
                warnings.append(f"{slices_path}: slice {number} {reason}")
    return result, unresolved, warnings


def resolve_context_district_joins(
    context_entities: list[dict], district_entities: list[dict], adr_to_district: dict[str, str]
) -> tuple[dict[str, list[str]], list[str]]:
    """Resolve ``context_verifies_district`` and rank the uncovered districts.

    A district is uncovered when no context's ``verifies`` list names it.
    ``district_uncovered`` ranks those districts by how many ADRs anchor to
    them, most-pointed-at first, per ADR-0018's describe-backlog rule.
    """
    context_verifies_district: dict[str, list[str]] = {}
    verified: set[str] = set()
    for context in context_entities:
        districts = context.get("verifies") or []
        if districts:
            context_verifies_district[context["id"]] = list(districts)
            verified.update(districts)

    district_ids = [d["id"] for d in district_entities]
    counts: dict[str, int] = {}
    for district_id in adr_to_district.values():
        counts[district_id] = counts.get(district_id, 0) + 1

    uncovered = [d for d in district_ids if d not in verified]
    uncovered.sort(key=lambda d: (-counts.get(d, 0), d))
    return context_verifies_district, uncovered


def resolve_adr_context_district(adrs_viewer: dict[str, dict]) -> tuple[dict[str, str], dict[str, str]]:
    """Read each ADR's ``maps_to`` block for a direct context or district anchor."""
    adr_to_context: dict[str, str] = {}
    adr_to_district: dict[str, str] = {}
    for adr_id, record in adrs_viewer.items():
        maps_to = record.get("maps_to") or {}
        if not isinstance(maps_to, dict):
            continue
        context = maps_to.get("context")
        if context:
            adr_to_context[adr_id] = context
        district = maps_to.get("district")
        if district:
            adr_to_district[adr_id] = district
    return adr_to_context, adr_to_district


def resolve_feature_gates(repo: Path) -> dict[str, list[dict]]:
    plans_dir = repo / PLANS_SOURCE_SUBDIR
    gates_by_feature: dict[str, list[dict]] = {}
    if not plans_dir.is_dir():
        return gates_by_feature
    for status_path in sorted(plans_dir.glob("*/00-status.md")):
        feature = status_path.parent.name
        gates = []
        try:
            for line in status_path.read_text().splitlines():
                gm = STATUS_GATE_RE.search(line.strip())
                if gm:
                    gates.append(
                        {
                            "n": int(gm.group(1)),
                            "name": gm.group(2).strip(),
                            "state": gm.group(3).strip(),
                        }
                    )
        except OSError:
            continue
        if gates:
            gates_by_feature[feature] = gates
    return gates_by_feature


def resolve_joins(
    repo: Path,
    adrs_viewer: dict[str, dict],
    designs_viewer: dict[str, dict],
    entities: dict[str, list[dict]],
) -> tuple[dict, list[str]]:
    """Resolve every join this slice adds. Returns (joins, warnings).

    A warning is a degraded-but-visible condition, such as ``gh`` being
    unavailable. It never aborts the build, unlike a ``failures`` entry.
    """
    warnings: list[str] = []

    epic_to_pr, epic_status = resolve_epic_pull_requests(entities["epic"], warnings)
    refine_epic_status(epic_status, epic_to_pr, entities["pull_request"])

    adr_to_context, adr_to_district = resolve_adr_context_district(adrs_viewer)

    adr_to_pull_request = resolve_adr_to_pull_request(
        adrs_viewer, designs_viewer, entities["epic"], epic_to_pr
    )

    slice_to_epic, slice_to_epic_unresolved, slice_warnings = resolve_slice_to_epic(
        repo, entities["epic"]
    )
    warnings.extend(slice_warnings)

    context_verifies_district, district_uncovered = resolve_context_district_joins(
        entities["context"], entities["district"], adr_to_district
    )

    feature_gates = resolve_feature_gates(repo)

    joins = {
        "adr_to_pull_request": adr_to_pull_request,
        "epic_to_pull_request": epic_to_pr,
        "epic_status": epic_status,
        "slice_to_epic": slice_to_epic,
        "slice_to_epic_unresolved": slice_to_epic_unresolved,
        "context_verifies_district": context_verifies_district,
        "district_uncovered": district_uncovered,
        "adr_to_context": adr_to_context,
        "adr_to_district": adr_to_district,
        "feature_gates": feature_gates,
    }
    return joins, warnings


# --------------------------------------------------------------------------
# freshness — a sources block holds a content hash per docs/ subtree plus
# the git head. is_stale() recomputes it and compares.
# --------------------------------------------------------------------------

TRACKED_SUBTREES = (
    "docs/architecture/adr",
    "docs/architecture/designs",
    "docs/architecture/contexts",
    "docs/plans",
)


def hash_tree(path: Path) -> str:
    """A stable content hash of every file under ``path``, sorted by
    relative path. Returns a sentinel when the directory does not exist,
    so a missing tree still fingerprints as one deterministic value."""
    import hashlib

    if not path.is_dir():
        return "sha256:absent"
    digest = hashlib.sha256()
    for file_path in sorted(p for p in path.rglob("*") if p.is_file()):
        digest.update(str(file_path.relative_to(path)).encode("utf-8"))
        digest.update(b"\0")
        digest.update(file_path.read_bytes())
        digest.update(b"\0")
    return f"sha256:{digest.hexdigest()}"


def git_head(repo: Path) -> str | None:
    try:
        return subprocess.check_output(
            ["git", "-C", str(repo), "rev-parse", "HEAD"], text=True, stderr=subprocess.PIPE
        ).strip()
    except (subprocess.CalledProcessError, FileNotFoundError):
        return None


def compute_sources(repo: Path) -> dict:
    """Content hash per tracked docs/ subtree, plus the git head."""
    return {
        "git_head": git_head(repo),
        "trees": {subtree: hash_tree(repo / subtree) for subtree in TRACKED_SUBTREES},
    }


def is_stale(index: dict, repo: Path) -> bool:
    """True when any tracked subtree hash or the git head has moved."""
    recorded = index.get("sources")
    if not recorded:
        return True
    return compute_sources(repo) != recorded


# --------------------------------------------------------------------------
# assembly
# --------------------------------------------------------------------------


def build_index(repo: Path, bundle_dir: Path) -> tuple[dict, dict, dict, list[str]]:
    """Full rebuild. Reads docs/ plus the bundle. Never merges, never authors.

    Returns (index, adrs_viewer_records, designs_viewer_records, failures).
    """
    failures: list[str] = []

    adr_entities, adrs_viewer, adr_failures = collect_adrs(repo)
    failures.extend(adr_failures)

    design_entities, epic_entities, designs_viewer, design_failures = collect_designs(repo)
    failures.extend(design_failures)

    context_entities, boundary_rule_entities, context_failures = collect_contexts(repo)
    failures.extend(context_failures)

    district_entities, district_failures = collect_districts(bundle_dir)
    failures.extend(district_failures)

    slice_entities, plan_failures = collect_plans(repo)
    failures.extend(plan_failures)

    pull_request_entities, pr_failures = collect_pull_requests(bundle_dir)
    failures.extend(pr_failures)

    publication_entities, publication_failures = collect_publications(bundle_dir)
    failures.extend(publication_failures)

    entities = {
        "adr": adr_entities,
        "design": design_entities,
        "epic": epic_entities,
        "context": context_entities,
        "district": district_entities,
        "boundary_rule": boundary_rule_entities,
        "pull_request": pull_request_entities,
        "slice": slice_entities,
        "publication": publication_entities,
    }

    joins, join_warnings = resolve_joins(repo, adrs_viewer, designs_viewer, entities)
    for warning in join_warnings:
        print(f"warning: {warning}", file=sys.stderr)

    index = {
        "schema_version": INDEX_SCHEMA_VERSION,
        "sources": compute_sources(repo),
        "entities": entities,
        "joins": joins,
    }
    return index, adrs_viewer, designs_viewer, failures


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
                "error: build_index.py is self-only.\n"
                f"  repo:        {repo}\n"
                f"  destination: {self_dir / 'data'}\n"
                f"  --bundle-dir was {given}, which is not the self bundle.\n"
                "remediation: omit --bundle-dir, or pass the self path. "
                "Never point this script at a foreign fixture.",
                file=sys.stderr,
            )
            sys.exit(1)

    require_compatible(self_dir, read_plugin_name())

    index, adrs_viewer, designs_viewer, failures = build_index(repo, self_dir)

    if failures:
        print("error: index build failed for one or more files:", file=sys.stderr)
        for failure in failures:
            print(f"  {failure}", file=sys.stderr)
        print(
            "remediation: fix the files listed above, then re-run. Nothing was written.",
            file=sys.stderr,
        )
        sys.exit(1)

    dest_dir = self_dir / "data"
    dest_dir.mkdir(parents=True, exist_ok=True)

    index_json_path = dest_dir / "index.json"
    index_js_path = dest_dir / "index.js"
    index_json_path.write_text(json.dumps(index, ensure_ascii=False, indent=2) + "\n")
    index_js_path.write_text(f"window.INDEX = {json.dumps(index, ensure_ascii=False)};\n")

    # Legacy projections. build_index.py subsumes build_adrs.py and
    # build_designs.py rather than sitting beside them (ADR-0018), so it
    # keeps writing the globals the viewer's existing modes already read.
    adrs_sorted = {rid: adrs_viewer[rid] for rid in sorted(adrs_viewer)}
    adrs_json_path = dest_dir / "adrs.json"
    adrs_js_path = dest_dir / "adrs.js"
    adrs_json_path.write_text(json.dumps(adrs_sorted, ensure_ascii=False, indent=2) + "\n")
    adrs_js_path.write_text(f"window.ADRS = {json.dumps(adrs_sorted, ensure_ascii=False)};\n")

    designs_sorted = {name: designs_viewer[name] for name in sorted(designs_viewer)}
    designs_js_path = dest_dir / "designs.js"
    designs_js_path.write_text(f"window.DESIGNS = {json.dumps(designs_sorted, ensure_ascii=False)};\n")

    stamp_generator(self_dir, read_plugin_name(), read_plugin_version())

    counts = {k: len(v) for k, v in index["entities"].items()}
    print(
        f"Wrote {index_json_path}, {index_js_path}, {adrs_json_path}, "
        f"{adrs_js_path}, and {designs_js_path} (full rebuild, not a merge). "
        f"Entity counts: {counts}"
    )


if __name__ == "__main__":
    main()
