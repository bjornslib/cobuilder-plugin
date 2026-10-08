"""The scan: shared/habit_smells.py and the verify_bundle.py habit.smells key
(slice 1 of habit-smells, epic E1).

The tests stub `habit-sensors` on PATH with a script that records the args it
was called with and prints a canned JSON findings array, then run the real
script as a subprocess.
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
SHARED = REPO_ROOT / "shared"
HABIT_SMELLS = SHARED / "habit_smells.py"
VERIFY_BUNDLE = SHARED / "verify_bundle.py"

BRANCH = "origin/master~30"

# A full run: three smell groups, no incompleteness signal.
COMPLEXITY_ISSUE = {
    "key": "a/x.py",
    "details": {"file": "a/x.py", "line": 1, "column": 5,
                "message": "too complex", "source": "ruff:C901"},
}


def fake_payload(no_incomplete: bool = False) -> list:
    dup = [
        {
            "key": f"a/dup{i}.py",
            "details": {"file": f"a/dup{i}.py", "line": 10, "column": 1,
                        "message": "duplicate block", "source": "habit-hooks"},
        }
        for i in range(150)
    ]
    payload = [
        {"smell": "high-complexity", "issues": [COMPLEXITY_ISSUE]},
        {
            "smell": "swallowed-exception",
            "issues": [
                {"key": "b/y.py", "details": {"file": "b/y.py", "line": 4, "column": 9,
                                              "message": "except: pass", "source": "flake8:BLE001"}},
                {"key": "b/z.py", "details": {"file": "b/z.py", "line": 20, "column": 13,
                                              "message": "except Exception: pass",
                                              "source": "flake8:BLE001"}},
            ],
        },
        {"smell": "duplicated-code", "issues": dup},
    ]
    if not no_incomplete:
        payload.append({"smell": "incomplete-run", "issues": []})
    return payload


STUB = """\
#!/usr/bin/env python3
import json, os, sys
args = sys.argv[1:]
if "--json" in args:
    # The real habit-sensors takes no --json; exit 2 as it does.
    sys.stderr.write("unrecognized argument: --json\\n")
    sys.exit(2)
path = os.environ["HABIT_ARGS_FILE"]
with open(path, "w") as f:
    json.dump(args, f)
with open(OUT_FILE) as f:
    sys.stdout.write(f.read())
"""


def stub_sensors(tmp_path: Path, payload: list) -> Path:
    bin_dir = tmp_path / "stubbin"
    bin_dir.mkdir(exist_ok=True)
    out_file = bin_dir / "output.json"
    out_file.write_text(json.dumps(payload))
    script = bin_dir / "habit-sensors"
    script.write_text(f"OUT_FILE = {str(out_file)!r}\n" + STUB)
    script.chmod(0o755)
    return bin_dir


def run_smells(
    tmp_path: Path,
    payload: list | None = None,
    bin_dir: Path | None = None,
    branch: str = BRANCH,
    out_dir: Path | None = None,
) -> tuple[subprocess.CompletedProcess, Path]:
    """Run shared/habit_smells.py with the stub on PATH. Returns (proc, report_path)."""
    if bin_dir is None:
        bin_dir = stub_sensors(tmp_path, fake_payload() if payload is None else payload)
    repo = tmp_path / "repo"
    repo.mkdir(exist_ok=True)
    out = out_dir if out_dir is not None else tmp_path / "out"
    args_file = tmp_path / "called_args.json"
    env = dict(os.environ)
    env["PATH"] = f"{bin_dir}{os.pathsep}{os.environ.get('PATH', '')}"
    env["HABIT_ARGS_FILE"] = str(args_file)
    if out_dir is None:
        out.mkdir(exist_ok=True)
    proc = subprocess.run(
        [sys.executable, str(HABIT_SMELLS), "--out", str(out), "--branch", branch, "--repo", str(repo)],
        capture_output=True, text=True, env=env,
    )
    return proc, out / "habit-smells.json"


# ---- shared/habit_smells.py ----


def test_full_run_writes_report_with_counts_and_run_complete(tmp_path):
    proc, report = run_smells(tmp_path, fake_payload(no_incomplete=True))
    assert proc.returncode == 0, f"exit {proc.returncode}: {proc.stderr}"
    assert report.exists(), "no habit-smells.json written"
    data = json.loads(report.read_text())
    assert data["run_complete"] is True, "full run not flagged run_complete"
    smells = data["smells"]
    assert smells["high-complexity"] == 1, "high-complexity count wrong"
    assert smells["swallowed-exception"] == 2, "swallowed-exception count wrong"
    assert smells["duplicated-code"] == 150, "duplicated-code count wrong"
    assert "incomplete-run" not in smells, "incomplete-run sentinel counted as a smell"


def test_out_flag_writes_report_into_given_dir(tmp_path):
    custom = tmp_path / "reports" / "some-run"
    proc, report = run_smells(tmp_path, out_dir=custom)
    assert proc.returncode == 0, f"exit {proc.returncode}: {proc.stderr}"
    assert report.exists(), "--out dir was not honored"


def test_missing_tool_reports_available_false_and_exits_0(tmp_path):
    # Empty PATH shell dir: no habit-sensors anywhere on PATH.
    bin_dir = tmp_path / "nobin"
    bin_dir.mkdir()
    proc, report = run_smells(tmp_path, bin_dir=bin_dir)
    assert proc.returncode == 0, f"exit {proc.returncode}: {proc.stderr}"
    printed = proc.stdout + proc.stderr
    assert "available" in printed, "missing tool is not reported as unavailable"
    assert "habit-sensors" in printed, "unavailable reason does not name the tool"


def test_branch_is_forwarded_to_habit_sensors(tmp_path):
    proc, report = run_smells(tmp_path)
    assert proc.returncode == 0, f"exit {proc.returncode}: {proc.stderr}"
    args = json.loads((tmp_path / "called_args.json").read_text())
    assert "--branch" in args, "habit-sensors was not given --branch"
    assert BRANCH in args, "the branch base value was not forwarded"


def test_resolves_sensors_from_path_only_never_a_habit_hooks_import(tmp_path):
    proc, report = run_smells(tmp_path)
    assert proc.returncode == 0, f"exit {proc.returncode}: {proc.stderr}"
    assert (tmp_path / "called_args.json").exists(), \
        "the PATH stub was not invoked — the script does not resolve habit-sensors from PATH"
    assert HABIT_SMELLS.exists(), "shared/habit_smells.py is missing"
    source = HABIT_SMELLS.read_text()
    assert "habit_hooks" not in source, "the script references a habit_hooks package path"


# The chosen count basis: `smells` counts member issue-locations for every
# smell (count_basis == "issues"). One finding entry per cluster, issues hold
# the member locations, duplicated-code groups sum across clusters.


def test_duplicated_code_counts_issue_locations_across_clusters(tmp_path):
    # One finding entry per cluster: 3 clusters with 3 member issues each.
    # On the issues basis this yields 9, not the cluster count of 3.
    payload = fake_payload(no_incomplete=True)
    payload = [p for p in payload if p.get("smell") != "duplicated-code"]
    for i in range(3):
        payload.append({
            "smell": "duplicated-code",
            "details": {
                "file": f"c/cluster{i}.py", "line": 1, "column": 1,
                "message": "duplicate block", "source": "habit-hooks",
            },
            "issues": [
                {"key": f"c/cluster{i}.py:{j}", "details": {"file": f"c/cluster{i}.py", "line": 10 * j,
                                                             "column": 1, "message": "member",
                                                             "source": "habit-hooks"}}
                for j in range(3)
            ],
        })
    proc, report = run_smells(tmp_path, payload)
    assert proc.returncode == 0, f"exit {proc.returncode}: {proc.stderr}"
    data = json.loads(report.read_text())
    # issues basis, not the cluster findings basis
    assert data["count_basis"] == "issues", "count_basis is not the chosen issues basis"
    assert data["smells"]["duplicated-code"] == 9, \
        "duplicated-code did not sum the member issue-locations across clusters"


def test_a_group_without_a_smell_name_is_not_counted(tmp_path):
    # A group with no `smell` string has no name to count under. It must not
    # write a null key into the record, and it must not stop the run.
    payload = fake_payload(no_incomplete=True)
    payload.append({"details": {}, "issues": [{"key": "x.py", "details": {"file": "x.py"}}]})
    payload.append({"smell": 7, "issues": [{"key": "y.py", "details": {"file": "y.py"}}]})
    proc, report = run_smells(tmp_path, payload)
    assert proc.returncode == 0, f"exit {proc.returncode}: {proc.stderr}"
    data = json.loads(report.read_text())
    assert all(isinstance(name, str) and name != "null" for name in data["smells"]), \
        f"a group without a smell name was counted: {data['smells']}"
    assert "7" not in data["smells"]


def test_incomplete_run_records_the_flag_and_the_tool(tmp_path):
    proc, report = run_smells(tmp_path, fake_payload())  # payload carries incomplete-run
    assert proc.returncode == 0, f"exit {proc.returncode}: {proc.stderr}"
    data = json.loads(report.read_text())
    assert data["run_complete"] is False, "an incomplete-run scan is not flagged"
    assert "habit-sensors" in json.dumps(data), "the incomplete run does not name the tool"


# ---- verify_bundle.py: the optional habit.smells key ----


def make_bundle(tmp_path: Path) -> tuple[Path, Path]:
    """A minimal bundle that otherwise verifies OK, in a repo-like layout."""
    repo = tmp_path / "repo"
    bundle = repo / ".cobuilder-architect" / "self"
    (bundle / "data").mkdir(parents=True)
    (bundle / "viewer").mkdir()
    (bundle / "bundle.json").write_text(json.dumps({"bundle_format": 4, "schema_version": "1.3"}))
    (bundle / "data" / "story.json").write_text(json.dumps({"meta": {"schema_version": "1.3"}, "timeline": []}))
    (bundle / "viewer" / "index.html").write_text("<html></html>")
    (bundle / "inventory.yaml").write_text("contexts:\n  - a\n")
    return repo, bundle


def review_dir(bundle_dir: Path) -> Path:
    # The report dir lives in the repo the bundle belongs to; the file is
    # written beside the review reports at docs/architecture/review/.
    return bundle_dir.parent.parent / "docs" / "architecture" / "review"


def write_scan(bundle_dir: Path, run_complete: bool = True, commits_behind: int = 5) -> None:
    review_dir(bundle_dir).mkdir(parents=True, exist_ok=True)
    path = review_dir(bundle_dir) / "habit-smells.json"
    path.write_text(json.dumps({
        "branch_base": BRANCH,
        "run_complete": run_complete,
        "commits_behind": commits_behind,
    }))


def run_verify(bundle_dir: Path) -> tuple[subprocess.CompletedProcess, dict]:
    proc = subprocess.run(
        [sys.executable, str(VERIFY_BUNDLE), "--bundle-dir", str(bundle_dir), "--json"],
        capture_output=True, text=True,
    )
    assert proc.returncode == 0, \
        f"verify_bundle failed (a smell warning must never fail a run): {proc.stdout}"
    payload = json.loads(proc.stdout)
    return proc, payload["baseline"]


def test_gate_ok_when_scan_is_current(tmp_path):
    repo, bundle = make_bundle(tmp_path)
    write_scan(bundle, run_complete=True, commits_behind=5)
    _, baseline = run_verify(bundle)
    assert baseline.get("habit.smells") == "ok", \
        f"habit.smells should be ok, got {baseline.get('habit.smells')!r}"


def test_gate_stale_when_recorded_base_over_200_commits_behind(tmp_path):
    repo, bundle = make_bundle(tmp_path)
    write_scan(bundle, run_complete=True, commits_behind=201)
    _, baseline = run_verify(bundle)
    status = baseline.get("habit.smells")
    assert status is not None, "habit.smells missing with a scan present"
    assert status.startswith("stale"), f"habit.smells should be stale, got {status!r}"


def test_gate_absent_when_no_scan_file(tmp_path):
    repo, bundle = make_bundle(tmp_path)
    _, baseline = run_verify(bundle)
    assert "habit.smells" not in baseline, "habit.smells reported with no scan file"


def test_gate_is_optional_and_never_fails_the_run(tmp_path):
    repo, bundle = make_bundle(tmp_path)
    write_scan(bundle, run_complete=False, commits_behind=201)
    proc, baseline = run_verify(bundle)  # run_verify asserts exit 0
    assert "habit.smells" in baseline["_optional"], \
        "habit.smells is not listed as an optional key"