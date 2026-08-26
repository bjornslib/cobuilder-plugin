#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = []
# ///
"""Verify Gate 4 of a implement plan. Read-only, no side effects.

Gate 4 has three sub-steps, and this script checks all three so a status
file cannot claim the whole gate while one sub-step never ran:

Artifact key names (stable, used in --json output):
  4a:
    slices.file       - <plan>/04-slices.md exists
    slices.count      - number of slice rows parsed from the table.
                         "zero" when the file exists but no slice row parses.
  4b (nested under "epics"."<epic-id>", one entry per epic with more than
      one slice in 04-slices.md — a single-slice epic needs no design and
      is not listed here):
    design.file        - <plan>/epic-<epic-id>-design.md exists
    design.sections     - "ok" when the file carries all six required
                         section headers. "incomplete:<missing,...>" when
                         some are absent. "missing" when the file itself
                         is absent.
    design.approved     - "ok" when 00-status.md records 4b as APPROVED
                         for this plan. "n/a" is never used here — an
                         epic in this table by definition carries more
                         than one slice, so 4b is required. "pending"
                         otherwise.
  4c:
    rubrics.dir        - .cobuilder/rubrics/<slug> exists
    rubrics.count      - number of slice-N.md files found there
    rubrics.per_slice  - "ok" when every slice number from 04-slices.md has
                         a matching rubric file. "missing:<n,...>" names the
                         slice numbers with no rubric.

Exit 0 iff every key above is "ok" (slices.count and rubrics.count pass when
they are a positive integer, not literally the word "ok").

Usage:
    uv run verify_gate.py --plan docs/plans/<slug>
    uv run verify_gate.py --plan docs/plans/<slug> --rubrics-dir .cobuilder/rubrics/<slug>
    uv run verify_gate.py --plan docs/plans/<slug> --json
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "shared"))
import slice_table  # noqa: E402

# The 04-slices.md table format (see plugins/implement/skills/
# implement/SKILL.md, Gate 4a):
#
#   | # | Epic | Slice | Ends with | Score | State |
#   |---|---|---|---|---|---|
#   | | **`plugin-split/E1` — <epic name>.** <prose> | | | | |
#   | 4 | `plugin-split/E1` | <slice name> | <ends with> | 1.00 | completed |
#
# An epic-header row has an empty "#" cell and a bolded, backticked scoped
# epic id in the "Epic" cell. A slice row has an integer "#" and the same
# scoped id, un-bolded, in the "Epic" cell. shared/slice_table.py owns the
# parser for this table, shared by this script, shared/build_index.py, and
# plugins/artifact/scripts/build_builds_view.py.

REQUIRED_DESIGN_SECTIONS = [
    "## Scope and Intent",
    "## Files Touched",
    "## Types & Signatures",
    "## Slice Decomposition",
    "## Test Plan",
    "## Risks & Open Questions",
]

# 00-status.md's Gate 4 sub-step line, e.g.:
#   - 4b Epic technical solution designs: pending | APPROVED 2026-08-24 | n/a
STATUS_4B_RE = re.compile(
    r"^\s*-\s*4b\b.*?:\s*(APPROVED\b.*|pending|in progress|n/a.*)\s*$",
    re.IGNORECASE,
)


def parse_slices(text: str) -> tuple[list[dict], list[str]]:
    """Return (slice rows, epic ids seen as headers) from 04-slices.md.

    A slice row that does not match either pattern is silently skipped, the
    same way shared/build_index.py skips prose and separator rows. Never
    guesses at an epic id it cannot parse cleanly — an unparsed row is
    absent from the result, not resolved by a heuristic.
    """
    parsed = slice_table.parse_table(text)
    slices = [
        {"n": row.n, "epic_id": row.epic_id, "name": row.name}
        for row in parsed.rows
    ]
    return slices, parsed.header_epic_ids


def check_4a(plan_dir: Path) -> tuple[dict[str, str], list[dict]]:
    results: dict[str, str] = {}
    slices_path = plan_dir / "04-slices.md"
    if not slices_path.exists():
        results["slices.file"] = "missing"
        results["slices.count"] = "zero"
        return results, []

    results["slices.file"] = "ok"
    slices, _ = parse_slices(slices_path.read_text())
    results["slices.count"] = str(len(slices)) if slices else "zero"
    return results, slices


def epics_with_multiple_slices(slices: list[dict]) -> list[str]:
    """Every epic id that carries more than one slice row, in the order it
    first appears. A single-slice epic never needs a Gate 4b design."""
    counts: dict[str, int] = {}
    order: list[str] = []
    for slice_row in slices:
        epic_id = slice_row["epic_id"]
        if epic_id not in counts:
            order.append(epic_id)
        counts[epic_id] = counts.get(epic_id, 0) + 1
    return [epic_id for epic_id in order if counts[epic_id] > 1]


def epic_id_to_filename(epic_id: str) -> str:
    """`<design>/<epic-id>` -> `epic-<epic-id>-design.md`, matching the
    per-epic filename SKILL.md's Gate 4b names. The scoped prefix (the
    design slug before the slash) is not part of the filename — only the
    bare epic id after it is."""
    bare_id = epic_id.split("/")[-1] if "/" in epic_id else epic_id
    return f"epic-{bare_id}-design.md"


def check_design_sections(text: str) -> str:
    missing = [s for s in REQUIRED_DESIGN_SECTIONS if s not in text]
    return "ok" if not missing else "incomplete:" + ",".join(missing)


def check_4b_approved(status_text: str | None) -> str:
    if status_text is None:
        return "pending"
    for line in status_text.splitlines():
        match = STATUS_4B_RE.match(line)
        if match:
            value = match.group(1).strip()
            if value.upper().startswith("APPROVED"):
                return "ok"
            if value.lower().startswith("n/a"):
                return "n/a"
            return "pending"
    return "pending"


def check_4b(plan_dir: Path, slices: list[dict], status_text: str | None) -> dict[str, dict[str, str]]:
    results: dict[str, dict[str, str]] = {}
    approved_status = check_4b_approved(status_text)
    for epic_id in epics_with_multiple_slices(slices):
        design_path = plan_dir / epic_id_to_filename(epic_id)
        entry: dict[str, str] = {}
        if not design_path.exists():
            entry["design.file"] = "missing"
            entry["design.sections"] = "missing"
        else:
            entry["design.file"] = "ok"
            entry["design.sections"] = check_design_sections(design_path.read_text())
        entry["design.approved"] = approved_status
        results[epic_id] = entry
    return results


def check_4c(rubrics_dir: Path, slices: list[dict]) -> dict[str, str]:
    results: dict[str, str] = {}
    if not rubrics_dir.exists():
        results["rubrics.dir"] = "missing"
        results["rubrics.count"] = "zero"
        results["rubrics.per_slice"] = "missing:" + ",".join(str(s["n"]) for s in slices) if slices else "missing"
        return results

    results["rubrics.dir"] = "ok"
    rubric_files = sorted(rubrics_dir.glob("slice-*.md"))
    results["rubrics.count"] = str(len(rubric_files)) if rubric_files else "zero"

    have_numbers = set()
    rubric_re = re.compile(r"^slice-(\d+)\.md$")
    for path in rubric_files:
        m = rubric_re.match(path.name)
        if m:
            have_numbers.add(int(m.group(1)))

    missing_numbers = sorted(s["n"] for s in slices if s["n"] not in have_numbers)
    results["rubrics.per_slice"] = "ok" if not missing_numbers else "missing:" + ",".join(str(n) for n in missing_numbers)
    return results


def is_ok(value: str) -> bool:
    if value == "ok":
        return True
    if value == "n/a":
        return True
    if value.isdigit() and int(value) > 0:
        return True
    return False


def all_ok(flat: dict[str, str]) -> bool:
    return all(is_ok(v) for v in flat.values())


def flatten(prefix: str, results: dict) -> dict[str, str]:
    flat: dict[str, str] = {}
    for key, value in results.items():
        if isinstance(value, dict):
            flat.update(flatten(f"{prefix}{key}.", value))
        else:
            flat[f"{prefix}{key}"] = value
    return flat


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--plan", required=True, help="plan dir to verify, e.g. docs/plans/<slug>")
    parser.add_argument(
        "--rubrics-dir",
        default=None,
        help="rubrics dir (default: .cobuilder/rubrics/<slug>, <slug> taken "
        "from the plan dir's basename)",
    )
    parser.add_argument("--json", action="store_true", help="emit machine-readable JSON instead of a table")
    args = parser.parse_args()

    plan_dir = Path(args.plan).resolve()
    if not plan_dir.exists():
        print(
            f"error: plan dir {plan_dir} does not exist.\n"
            "remediation: run Gate 4a first, and save 04-slices.md there.",
            file=sys.stderr,
        )
        sys.exit(1)

    slug = plan_dir.name
    # plan_dir is docs/plans/<slug>. Its repo root is three levels up:
    # docs/plans/<slug> -> docs/plans -> docs -> <repo-root>.
    repo_root = plan_dir.parent.parent.parent
    rubrics_dir = Path(args.rubrics_dir).resolve() if args.rubrics_dir else (repo_root / ".cobuilder" / "rubrics" / slug)

    status_path = plan_dir / "00-status.md"
    status_text = status_path.read_text() if status_path.exists() else None

    a_results, slices = check_4a(plan_dir)
    b_results = check_4b(plan_dir, slices, status_text)
    c_results = check_4c(rubrics_dir, slices)

    flat = {}
    flat.update(flatten("4a.", a_results))
    for epic_id, entry in b_results.items():
        flat.update(flatten(f"4b.{epic_id}.", entry))
    flat.update(flatten("4c.", c_results))

    ok = all_ok(flat)

    if args.json:
        payload = {
            "plan": str(plan_dir),
            "rubrics_dir": str(rubrics_dir),
            "4a": a_results,
            "4b": b_results,
            "4c": c_results,
            "ok": ok,
        }
        print(json.dumps(payload, indent=2, ensure_ascii=False))
    else:
        print(f"Gate 4 — {slug}")
        print("--------")
        print("4a. Slice plan")
        for key, value in a_results.items():
            marker = "(ok)" if is_ok(value) else "(FAIL)"
            print(f"  {key:<20} {value:<30} {marker}")

        print("\n4b. Epic technical solution designs")
        if not b_results:
            print("  no epic carries more than one slice — nothing required")
        for epic_id, entry in b_results.items():
            print(f"  {epic_id}")
            for key, value in entry.items():
                marker = "(ok)" if is_ok(value) else "(FAIL)"
                print(f"    {key:<20} {value:<30} {marker}")

        print("\n4c. Blind rubrics")
        for key, value in c_results.items():
            marker = "(ok)" if is_ok(value) else "(FAIL)"
            print(f"  {key:<20} {value:<30} {marker}")

        print(f"\nOverall: {'OK' if ok else 'FAIL'}")
        if not ok:
            missing_designs = [
                epic_id
                for epic_id, entry in b_results.items()
                if not is_ok(entry.get("design.file", "missing")) or not is_ok(entry.get("design.sections", "missing"))
            ]
            if missing_designs:
                print(
                    "\nGate 4b is missing or incomplete for: " + ", ".join(missing_designs) + ".\n"
                    "remediation: write docs/plans/<slug>/epic-<epic-id>-design.md for each, "
                    "get user approval, and record it in 00-status.md."
                )

    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
