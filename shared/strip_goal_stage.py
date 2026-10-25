# /// script
# requires-python = ">=3.11"
# dependencies = ["pyyaml>=6,<7"]
# ///
"""Remove `stage` from each design goal.json when the tracker holds the same stage.

Usage: strip_goal_stage.py [--repo PATH] [--dry-run]

The script never reads the files adapter as a tracker. With no tracker it keeps every file.
It prints one JSON report and exits 0.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from tracker_port import reader  # noqa: E402

DESIGNS = Path("docs") / "architecture" / "designs"


def detect_indent(text: str) -> int:
    match = re.search(r"^( +)\S", text, re.MULTILINE)
    return len(match.group(1)) if match else 2


def tracker_stages(repo: Path) -> tuple[dict[str, str | None] | None, str]:
    """Map each program name to its stage. None means the tracker cannot be used."""
    adapter = reader.open_adapter(repo)
    if adapter is None or adapter.name == "files":
        return None, "no tracker"
    snap = reader.snapshot(repo)
    if snap.error:
        return None, "tracker unreadable"
    return {name: rec.envelope.get("stage") for name, rec in snap.programs.items()}, ""


def strip_file(path: Path, data: dict, text: str) -> None:
    del data["stage"]
    out = json.dumps(data, indent=detect_indent(text), ensure_ascii=False)
    path.write_text(out + ("\n" if text.endswith("\n") else ""), encoding="utf-8")


def run(repo: Path, dry_run: bool) -> dict:
    report: dict = {"stripped": [], "kept": [], "no_stage_field": [], "dry_run": dry_run}
    files = sorted((repo / DESIGNS).glob("*/goal.json"))
    stages, why = tracker_stages(repo)
    for path in files:
        design = path.parent.name
        text = path.read_text(encoding="utf-8")
        data = json.loads(text)
        if "stage" not in data:
            report["no_stage_field"].append(design)
            continue
        if stages is None:
            reason = why
        elif design not in stages:
            reason = "no program"
        elif not stages[design]:
            reason = "no stage"
        elif stages[design] != data["stage"]:
            reason = "differs"
        else:
            reason = ""
        if reason:
            report["kept"].append({"design": design, "reason": reason})
            continue
        if not dry_run:
            strip_file(path, data, text)
        report["stripped"].append(design)
    return report


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--repo", type=Path, default=Path("."))
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args(argv)
    print(json.dumps(run(args.repo.resolve(), args.dry_run), indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
