#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = []
# ///
"""Run the habit-sensors scan and write a per-smell report.

The script finds `habit-sensors` on PATH, runs it with `--json` and the
`--branch` base the caller gives, groups its findings per smell, and writes
`habit-smells.json` into `--out`. The report records the tool name, an
`available` flag with a reason, the branch base, `run_complete`, and
`commits_behind`. `habit-sensors` marks a run that did not finish with an
`incomplete-run` group; that group is a sentinel, never a smell, so the
report counts no finding for it.

The gate key in verify_bundle.py (`habit.smells`) reads the report from
`docs/architecture/review/` in the repo the bundle belongs to.

Usage:
    uv run habit_smells.py --branch <base> --repo <repo> [--out <dir>]

Exit 0 always. A missing tool is recorded, not an error.
"""
from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
from pathlib import Path

TOOL = "habit-sensors"
SENTINEL_SMELL = "incomplete-run"
REPORT_NAME = "habit-smells.json"
DEFAULT_OUT = Path("docs/architecture/review")
STALE_COMMITS = 200


def commits_behind(repo: Path, branch: str) -> int:
    """Count the commits on HEAD that the branch base does not hold.

    Falls back to a trailing `~<n>` suffix in the base name ("origin/master~30"
    is 30 commits back), and to 0 when neither source works."""
    try:
        proc = subprocess.run(
            ["git", "rev-list", "--count", f"HEAD..{branch}"],
            cwd=repo, capture_output=True, text=True, timeout=30,
        )
        if proc.returncode == 0:
            return int(proc.stdout.strip())
    except (OSError, ValueError, subprocess.SubprocessError):
        pass
    if "~" in branch:
        try:
            return int(branch.rsplit("~", 1)[1])
        except (ValueError, IndexError):
            pass
    return 0


def stated_interpreter(tool_path: Path) -> str | None:
    """The interpreter the tool's shebang names, if it names one.

    A tool file may carry its shebang below the first line (test fixtures and
    bundled scripts do this), and the OS then cannot exec the file. Read the
    first few lines and return the interpreter a python shebang asks for."""
    try:
        with open(tool_path) as f:
            for _ in range(5):
                line = f.readline()
                if not line:
                    return None
                if line.startswith("#!") and "python" in line:
                    name = line[2:].split()[-1].split("/")[-1]
                    return shutil.which(name) or name
    except OSError:
        return None
    return None


def collect(repo: Path, branch: str) -> dict:
    """Run the tool and return the raw scan record without the smell counts."""
    tool_path = shutil.which(TOOL)
    record: dict = {
        "tool": TOOL,
        "branch_base": branch,
        "commits_behind": commits_behind(repo, branch),
    }
    if tool_path is None:
        record["available"] = False
        record["available_reason"] = f"{TOOL} not found on PATH"
        record["run_complete"] = False
        record["smells"] = {}
        record["count_basis"] = "issues"
        return record
    tool_cmd = [tool_path, "--branch", branch]
    proc = None
    try:
        proc = subprocess.run(tool_cmd, capture_output=True, text=True, timeout=600, cwd=repo)
    except OSError:
        # The file does not exec directly. Run it with the interpreter its
        # shebang names, if that interpreter is python.
        interpreter = stated_interpreter(Path(tool_path))
        if interpreter is None:
            record["available"] = False
            record["available_reason"] = f"{TOOL} failed to run: not executable and no python shebang"
            record["run_complete"] = False
            record["smells"] = {}
            record["count_basis"] = "issues"
            return record
        try:
            proc = subprocess.run([interpreter, *tool_cmd], capture_output=True, text=True, timeout=600, cwd=repo)
        except (OSError, subprocess.SubprocessError) as err:
            record["available"] = False
            record["available_reason"] = f"{TOOL} failed to run: {err}"
            record["run_complete"] = False
            record["smells"] = {}
            record["count_basis"] = "issues"
            return record
    except subprocess.SubprocessError as err:
        record["available"] = False
        record["available_reason"] = f"{TOOL} failed to run: {err}"
        record["run_complete"] = False
        record["smells"] = {}
        record["count_basis"] = "issues"
        return record
    try:
        payload = json.loads(proc.stdout)
    except (json.JSONDecodeError, TypeError, ValueError):
        payload = None
    if proc.returncode != 0 or not isinstance(payload, list):
        stderr_tail = (proc.stderr or proc.stdout or "").strip()[-200:]
        record["available"] = False
        record["available_reason"] = f"{TOOL} exited {proc.returncode}: {stderr_tail}" if proc.returncode != 0 \
            else f"{TOOL} printed no JSON findings array"
        record["run_complete"] = False
        record["smells"] = {}
        record["count_basis"] = "issues"
        return record
    record["available"] = True
    # Each finding entry in `findings` is one smell group whose `issues` hold
    # its member locations. For duplicated-code a group is one cluster and its
    # issues are the member files, so `smells` counts issue-locations, not
    # cluster findings, for every smell. `count_basis` names that basis.
    smells: dict[str, int] = {}
    complete = True
    for group in payload:
        if not isinstance(group, dict):
            continue
        smell = group.get("smell")
        if smell == SENTINEL_SMELL:
            complete = False
            continue
        smells[smell] = smells.get(smell, 0) + len(group.get("issues", []))
    record["run_complete"] = complete
    record["smells"] = smells
    record["count_basis"] = "issues"
    record["findings"] = payload
    return record


def group_findings(payload: list) -> dict:
    """Sum the member-location count per smell, as `collect` records it. The
    incomplete-run group is a sentinel for a run that did not finish, so it is
    never counted."""
    smells: dict[str, int] = {}
    for group in payload:
        if not isinstance(group, dict):
            continue
        smell = group.get("smell")
        if smell == SENTINEL_SMELL:
            continue
        smells[smell] = smells.get(smell, 0) + len(group.get("issues", []))
    return smells


def write_report(data: dict, out_dir: Path) -> Path:
    out_dir.mkdir(parents=True, exist_ok=True)
    path = out_dir / REPORT_NAME
    path.write_text(json.dumps(data, indent=2, sort_keys=True) + "\n")
    return path


def summary_line(record: dict) -> str:
    if not record.get("available"):
        return f"{TOOL} unavailable: {record.get('available_reason', 'unknown reason')}"
    total = sum(record.get("smells", {}).values())
    state = "complete" if record.get("run_complete") else "INCOMPLETE"
    return (
        f"habit-smells: {total} findings across {len(record.get('smells', {}))} smells "
        f"(run {state}, {record.get('commits_behind', 0)} commits behind "
        f"{record.get('branch_base', '?')})"
    )


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--repo", required=True, help="repo to scan")
    parser.add_argument("--branch", required=True, help="branch base the scan covers (e.g. origin/master~30)")
    parser.add_argument("--out", default=None, help="report dir (default: docs/architecture/review)")
    args = parser.parse_args(argv)

    repo = Path(args.repo)
    out_dir = Path(args.out) if args.out else repo / DEFAULT_OUT
    record = collect(repo, args.branch)
    write_report(record, out_dir)
    print(summary_line(record))
    return 0


if __name__ == "__main__":
    sys.exit(main())