#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = []
# ///
"""Render submit mode's `intent` and `assessment` blocks into two markdown
deliverables. Pure rendering — it makes no judgment, contacts no service, and
never calls `gh`. Claude authors both blocks (see
skills/odyssey/references/interview-guide.md and review-mode.md); this script
only lays them out.

Two sources, one shape:

  --prs N     reads timeline[N].intent / .assessment from <bundle-dir>/data/
              story.json, and writes <bundle-dir>/exports/pr-N-description.md
              and pr-N-assessment.md.

  --branch    reads <bundle-dir>/exports/branch-<slug>/{intent,assessment}.json
              (the pre-submit staging dir extract_diffs.py --branch creates)
              and writes description.md / assessment.md beside them. Use this
              before the PR exists, when there is no number to file under.

`description.md` follows references/pr-description-template.md — it is the PR
body, and it exists so a reviewer reads the author's argument before the diff.
An empty field drops its whole section rather than printing a placeholder.

Usage:
    uv run render_review.py --bundle-dir <bundle> --prs 73
    uv run render_review.py --bundle-dir <bundle> --prs 73,75
    uv run render_review.py --repo <path> --bundle-dir <bundle> --branch
"""
from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

VERDICT_LABEL = {
    "sound": "Sound",
    "concerns": "Concerns",
    "rework": "Rework",
}
TIER_LABEL = {
    "routine": "Routine",
    "architectural": "Architectural",
    "sensitive": "Sensitive",
}
PATTERN_LABEL = {
    "conforms": "Conforms to an existing pattern",
    "new-valuable": "New pattern, and it earns its place",
    "duplicate": "Duplicates something the repo already has",
    "reinvention": "Reinvents a solved problem",
}
DRIFT_LABEL = {
    "out_of_scope": "Out of scope, but touched",
    "unaddressed_risk": "Risk with no guard",
    "adopted_alternative": "Rejected option adopted",
    "delta_shift": "District delta shifted",
}


# ---- plumbing (duplicated from the sibling scripts — no cross-imports) ----

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


def slugify(name: str) -> str:
    """Same rule as extract_diffs.py and SKILL.md's Hub resolution."""
    out = re.sub(r"[^a-z0-9]+", "-", name.lower())
    return out.strip("-") or "branch"


def branch_slug(repo: Path, ref: str) -> str:
    name = ref
    if ref == "HEAD":
        try:
            name = subprocess.check_output(
                ["git", "-C", str(repo), "rev-parse", "--abbrev-ref", "HEAD"],
                text=True,
                stderr=subprocess.DEVNULL,
            ).strip()
        except subprocess.CalledProcessError:
            name = ""
        if not name or name == "HEAD":
            try:
                name = subprocess.check_output(
                    ["git", "-C", str(repo), "rev-parse", "--short=8", "HEAD"],
                    text=True,
                    stderr=subprocess.DEVNULL,
                ).strip()
            except subprocess.CalledProcessError:
                name = ""
    return slugify(name)


def read_json(path: Path) -> dict | None:
    if not path.exists():
        return None
    try:
        data = json.loads(path.read_text())
    except json.JSONDecodeError:
        return None
    return data if isinstance(data, dict) else None


# ---- small markdown helpers ----

def section(title: str, body: str) -> str:
    """A heading plus body, or "" when the body is empty. This is what makes
    an unanswered interview question vanish instead of printing a placeholder
    that reads like the author had nothing to say."""
    body = (body or "").strip()
    return f"## {title}\n\n{body}\n" if body else ""


def bullets(items) -> str:
    if not isinstance(items, list):
        return ""
    return "\n".join(f"- {str(item).strip()}" for item in items if str(item).strip())


def paragraphs(*values: str) -> str:
    return "\n\n".join(v.strip() for v in values if v and str(v).strip())


def evidence_list(items) -> str:
    if not isinstance(items, list) or not items:
        return ""
    return " ".join(f"`{str(i).strip()}`" for i in items if str(i).strip())


def cell(value) -> str:
    """One markdown table cell. A newline inside a cell ends the row and spills
    the rest of the value into the document as body text, so collapse every
    whitespace run to a single space before escaping the column separator.
    Authored JSON has no length discipline, and a multi-line `claim` is normal."""
    return " ".join(str(value or "").split()).replace("|", "\\|")


# ---- description.md ----

def render_description(title: str, intent: dict) -> str:
    alts = intent.get("alternatives")
    if isinstance(alts, list) and alts:
        alt_body = "\n".join(
            f"- **{str(a.get('option', '')).strip()}** — rejected because "
            f"{str(a.get('rejected_because', 'no reason recorded')).strip().rstrip('.')}."
            for a in alts
            if isinstance(a, dict) and str(a.get("option", "")).strip()
        )
    elif intent.get("source") == "author":
        alt_body = "None. The author reports no alternative was considered."
    else:
        alt_body = ""

    focus = bullets(intent.get("reviewer_focus"))
    unknowns = bullets(intent.get("unknowns"))
    if unknowns:
        lead = "The author flagged these parts as not fully understood:"
        focus = paragraphs(focus, f"{lead}\n\n{unknowns}")

    parts = [
        f"# {title}\n" if title else "",
        section("Problem", paragraphs(intent.get("problem", ""), intent.get("why_now", ""))),
        section("Why this approach", intent.get("approach", "")),
        section("Alternatives considered", alt_body),
        section("Out of scope", bullets(intent.get("out_of_scope"))),
        section("Risks", bullets(intent.get("risks"))),
        section("How this was tested", intent.get("testing", "")),
        section("Where to focus", focus),
    ]

    notes = []
    if intent.get("source") == "inferred":
        notes.append(
            "Intent inferred from the PR body, the commit messages, and the "
            "branch name. Not stated by the author."
        )
    authorship = intent.get("authorship")
    if authorship and authorship != "human":
        notes.append(f"Authorship: {authorship}.")
    if notes:
        parts.append("---\n\n" + "\n".join(f"_{n}_" for n in notes) + "\n")

    return "\n".join(p for p in parts if p).rstrip() + "\n"


# ---- assessment.md ----

def render_question(heading: str, block, extra_label: str = "", extra_key: str = "") -> str:
    if not isinstance(block, dict):
        return ""
    body = [str(block.get("answer", "")).strip()]
    if extra_key and str(block.get(extra_key, "")).strip():
        body.append(f"**{extra_label}:** {str(block[extra_key]).strip()}")
    ev = evidence_list(block.get("evidence"))
    if ev:
        body.append(f"Evidence: {ev}")
    return section(heading, paragraphs(*body))


def render_findings(findings) -> str:
    if not isinstance(findings, list) or not findings:
        return ""
    order = {"blocker": 0, "concern": 1, "note": 2}
    rows = sorted(
        (f for f in findings if isinstance(f, dict)),
        key=lambda f: order.get(f.get("severity"), 3),
    )
    lines = ["| Severity | Finding | Evidence |", "|---|---|---|"]
    for f in rows:
        severity = cell(f.get("severity", "note"))
        claim = cell(f.get("claim", ""))
        ev = cell(f.get("evidence", ""))
        lines.append(f"| {severity} | {claim} | {f'`{ev}`' if ev else '—'} |")
    body = "\n".join(lines)
    suggestions = [
        f"- **{str(f.get('claim', '')).strip()}** — {str(f['suggestion']).strip()}"
        for f in rows
        if str(f.get("suggestion", "")).strip()
    ]
    if suggestions:
        body += "\n\n**Suggestions**\n\n" + "\n".join(suggestions)
    return section("Findings", body)


def render_boundary_checks(checks) -> str:
    if not isinstance(checks, list) or not checks:
        return ""
    lines = ["| Result | Rule | Source | Evidence |", "|---|---|---|---|"]
    for c in checks:
        if not isinstance(c, dict):
            continue
        result = cell(c.get("result", ""))
        rule = cell(c.get("rule", ""))
        source = cell(c.get("source", ""))
        ev = cell(c.get("evidence", ""))
        lines.append(
            f"| {result} | {rule} | {f'`{source}`' if source else '—'} | {f'`{ev}`' if ev else '—'} |"
        )
    return section("Boundary checks", "\n".join(lines))


def render_delta(delta) -> str:
    if not isinstance(delta, dict):
        return ""
    lines = []
    added = delta.get("districts_added")
    if isinstance(added, list) and added:
        lines.append("**Districts added:** " + ", ".join(f"`{d}`" for d in added))
    changed = delta.get("districts_changed")
    if isinstance(changed, list) and changed:
        for c in changed:
            if not isinstance(c, dict):
                continue
            lines.append(
                f"- `{c.get('id', '?')}`: {c.get('files_before', '?')} -> "
                f"{c.get('files_after', '?')} files"
            )
    for key, label in (("edges_added", "Edges added"), ("edges_removed", "Edges removed")):
        edges = delta.get(key)
        if isinstance(edges, list) and edges:
            lines.append(f"**{label}:** " + ", ".join(f"`{e}`" for e in edges))
    return section("District delta", "\n".join(lines))


def render_drift(drift) -> str:
    if not isinstance(drift, list) or not drift:
        return ""
    lines = ["| Kind | What changed | Evidence |", "|---|---|---|"]
    for d in drift:
        if not isinstance(d, dict):
            continue
        kind = cell(DRIFT_LABEL.get(d.get("kind"), d.get("kind", "")))
        claim = cell(d.get("claim", ""))
        ev = cell(d.get("evidence", ""))
        lines.append(f"| {kind} | {claim} | {f'`{ev}`' if ev else '—'} |")
    return section("Drift from the stated intent", "\n".join(lines))


def render_assessment(title: str, assessment: dict, intent: dict | None) -> str:
    verdict = assessment.get("verdict", "")
    tier = assessment.get("risk_tier", "")
    stage = assessment.get("stage", "pre")

    header = [
        f"**Verdict:** {VERDICT_LABEL.get(verdict, verdict or 'not recorded')}",
        f"**Risk tier:** {TIER_LABEL.get(tier, tier or 'not recorded')}",
        f"**Stage:** {'post-merge' if stage == 'post' else 'pre-merge'}",
    ]
    if isinstance(intent, dict) and intent.get("unknowns"):
        header.append(
            f"**Author-flagged unknowns:** {len(intent['unknowns'])} "
            "(raises the tier by one step)"
        )

    pattern = assessment.get("pattern")
    pattern_heading = "Question 3 — new pattern, duplicate, or reinvention?"
    pattern_body = ""
    if isinstance(pattern, dict):
        verdict_line = PATTERN_LABEL.get(pattern.get("verdict"), pattern.get("verdict", ""))
        body = [f"**{verdict_line}**" if verdict_line else "", str(pattern.get("answer", "")).strip()]
        dupes = pattern.get("duplicates")
        if isinstance(dupes, list) and dupes:
            body.append("Duplicates: " + ", ".join(f"`{d}`" for d in dupes))
        ev = evidence_list(pattern.get("evidence"))
        if ev:
            body.append(f"Evidence: {ev}")
        pattern_body = section(pattern_heading, paragraphs(*body))

    parts = [
        f"# Assessment — {title}\n" if title else "# Assessment\n",
        "  \n".join(header) + "\n",
        section("Summary", assessment.get("summary", "")),
        render_question("Question 1 — is this sensible?", assessment.get("sensible")),
        render_question(
            "Question 2 — maintainability and readability",
            assessment.get("maintainability"),
            "Constraint introduced",
            "constraint_introduced",
        ),
        pattern_body,
        section("Will we regret this?", assessment.get("regret_risk", "")),
        render_findings(assessment.get("findings")),
        render_boundary_checks(assessment.get("boundary_checks")),
        render_delta(assessment.get("delta")),
        render_drift(assessment.get("drift")),
    ]

    generated = assessment.get("generated", "")
    footer = "_Generated by prodyssey submit mode"
    footer += f" on {generated}._" if generated else "._"
    parts.append("---\n\n" + footer + "\n")

    return "\n".join(p for p in parts if p).rstrip() + "\n"


# ---- drivers ----

def write_pair(out_dir: Path, prefix: str, title: str, intent: dict | None, assessment: dict | None) -> list[Path]:
    out_dir.mkdir(parents=True, exist_ok=True)
    written: list[Path] = []
    if intent:
        path = out_dir / f"{prefix}description.md"
        path.write_text(render_description(title, intent))
        written.append(path)
    if assessment:
        path = out_dir / f"{prefix}assessment.md"
        path.write_text(render_assessment(title, assessment, intent))
        written.append(path)
    return written


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--repo", default=None, help="path to the target git repo (default: cwd)")
    parser.add_argument("--bundle-dir", default=None, help="bundle dir (default: <repo>/.prodyssey/self)")
    parser.add_argument("--prs", default=None, help="comma-separated PR numbers, e.g. 73,75")
    parser.add_argument(
        "--branch",
        nargs="?",
        const="HEAD",
        default=None,
        metavar="REF",
        help="render the pre-submit staging dir for a working branch (default ref: HEAD). "
        "Mutually exclusive with --prs",
    )
    args = parser.parse_args()

    if bool(args.prs) == bool(args.branch):
        print(
            "error: pass exactly one of --prs or --branch.\n"
            "remediation: --prs N[,M,...] once the PR exists, --branch before it does.",
            file=sys.stderr,
        )
        sys.exit(1)

    repo = resolve_repo(args.repo)
    bundle_dir = Path(args.bundle_dir).resolve() if args.bundle_dir else repo / ".prodyssey" / "self"

    if args.branch:
        slug = branch_slug(repo, args.branch)
        stage_dir = bundle_dir / "exports" / f"branch-{slug}"
        if not stage_dir.exists():
            print(
                f"error: {stage_dir} does not exist.\n"
                f"remediation: run extract_diffs.py --branch {args.branch} first.",
                file=sys.stderr,
            )
            sys.exit(1)
        intent = read_json(stage_dir / "intent.json")
        assessment = read_json(stage_dir / "assessment.json")
        if not intent and not assessment:
            print(
                f"error: neither intent.json nor assessment.json found in {stage_dir}.\n"
                "remediation: run submit mode's interview and assessment before rendering.",
                file=sys.stderr,
            )
            sys.exit(1)
        title = (intent or {}).get("title") or f"Branch {slug}"
        written = write_pair(stage_dir, "", title, intent, assessment)
        for path in written:
            print(f"wrote {path}")
        return

    story = read_json(bundle_dir / "data" / "story.json")
    if story is None:
        print(
            f"error: {bundle_dir}/data/story.json not found or not valid JSON.\n"
            "remediation: run /prodyssey:baseline against this bundle first.",
            file=sys.stderr,
        )
        sys.exit(1)

    timeline = {item.get("pr"): item for item in story.get("timeline", []) if isinstance(item, dict)}
    pr_nums = sorted({int(x.strip()) for x in args.prs.split(",") if x.strip()})
    exports_dir = bundle_dir / "exports"

    exit_code = 0
    for pr_num in pr_nums:
        entry = timeline.get(pr_num)
        if entry is None:
            print(
                f"error: PR #{pr_num} is not in this bundle's timeline.\n"
                f"remediation: run /prodyssey:generate --prs {pr_num} first.",
                file=sys.stderr,
            )
            exit_code = 1
            continue
        intent = entry.get("intent") if isinstance(entry.get("intent"), dict) else None
        assessment = entry.get("assessment") if isinstance(entry.get("assessment"), dict) else None
        if not intent and not assessment:
            print(
                f"error: PR #{pr_num} has neither an `intent` nor an `assessment` block.\n"
                f"remediation: run /prodyssey:submit --prs {pr_num} first.",
                file=sys.stderr,
            )
            exit_code = 1
            continue
        title = f"PR #{pr_num} — {entry.get('title', '')}".rstrip(" —")
        written = write_pair(exports_dir, f"pr-{pr_num}-", title, intent, assessment)
        for path in written:
            print(f"PR #{pr_num}: wrote {path}")

    sys.exit(exit_code)


if __name__ == "__main__":
    main()
