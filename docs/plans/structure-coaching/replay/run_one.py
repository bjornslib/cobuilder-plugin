"""Run one replay: seed, five GREEN slices, measures, and two follow-on tasks.

Usage: python3 run_one.py <on|off> <run number> [--slices N] [--no-follow]
Writes <here>/runs/<cond>-<n>/ with the repo, the transcripts, and result.json.
"""
import json
import shutil
import subprocess
import sys
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from tasks import FOLLOW_ONS, SLICES  # noqa: E402

PLUGIN = "/Users/theb/Documents/Windsurf/cobuilder-plugin/plugins/implement"
EVIDENCE = "/Users/theb/Documents/Windsurf/cobuilder-plugin/shared/structure_evidence.py"
TOOLS = ["Read", "Grep", "Glob", "Write", "Edit", "Bash(uv run:*)", "Bash(python3:*)", "Bash(ls:*)",
         "Bash(cat:*)", "Bash(mkdir:*)", "Bash(mv:*)", "Bash(git mv:*)", "Bash(git status:*)",
         "Bash(git diff:*)", "Bash(git log:*)", "Bash(rm:*)", "Bash(touch:*)"]

GREEN_PROMPT = """You are the GREEN role for slice {n} of a small build. There is no plan folder, no rubric, and no feedback file in this repo, so skip those steps of your role.

Task: {spec}

RED already wrote the failing test tests/test_task_{n}.py. Make it pass with the smallest good change. Do not edit any test file. Before you finish, run `uv run --with pytest pytest tests -q`. The tests of the earlier slices must keep passing. Do not commit. End with a short GREEN report."""

FOLLOW_PROMPT = """You maintain this Python repo. Do this task, then run `uv run --with pytest pytest tests -q` and keep the existing tests passing. You may change code anywhere, but do not edit the existing test files.

Task: {spec}"""


def sh(cwd, *args, check=True):
    return subprocess.run(args, cwd=cwd, check=check, capture_output=True, text=True)


def claude(cwd, prompt, out, agent=None):
    cmd = ["claude", "-p", "--plugin-dir", PLUGIN, "--model", "haiku", "--effort", "max",
           "--permission-mode", "acceptEdits", "--output-format", "stream-json", "--verbose",
           "--allowedTools", *TOOLS]
    if agent:
        cmd[2:2] = ["--agent", agent]
    start = time.time()
    with open(out, "w") as fh:
        proc = subprocess.run([*cmd, "--", prompt], cwd=cwd, stdout=fh, stderr=subprocess.STDOUT,
                              stdin=subprocess.DEVNULL, timeout=1800)
    return {"exit": proc.returncode, "seconds": round(time.time() - start)}


def pytest_ok(cwd, files):
    res = sh(cwd, "uv", "run", "--with", "pytest", "pytest", "-q", *files, check=False)
    return res.returncode == 0, res.stdout.strip().splitlines()[-1:] if res.stdout else []


def record(cwd, out, extra=()):
    sh(cwd, "uv", "run", EVIDENCE, *extra, "--out", str(out))
    return json.loads(Path(out).read_text())


def measures(repo, seed, run_dir):
    rec = record(repo, run_dir / "record.json", ["--repo"])
    packet = record(repo, run_dir / "packet.json", ["--base", seed])
    by = lambda sig: [f for f in rec["findings"] if f["signal"] == sig]
    files = [p for p in sh(repo, "git", "ls-files", "--cached", "--others", "--exclude-standard").stdout.split()
             if p.endswith(".py") and not p.startswith("tests/")]
    folders = {}
    for p in files:
        folders[str(Path(p).parent)] = folders.get(str(Path(p).parent), 0) + 1
    drift = [f for f in packet["findings"] if f["signal"] == "contract-drift" and f["facts"].get("callers_untouched")]
    return {
        "largest_folder": max(folders.items(), key=lambda kv: kv[1]),
        "folders": folders,
        "duplicate_groups": len(by("duplicate-group")),
        "silent_contract_changes": len(drift),
        "boundary_edges": len(by("boundary-edge")),
        "findings_by_signal": {s: len(by(s)) for s in sorted({f["signal"] for f in rec["findings"]})},
    }


def coach_messages(transcript):
    """Count the structure findings that the coach showed, from its session record."""
    import tempfile
    session = None
    for line in Path(transcript).read_text().splitlines():
        if '"session_id"' in line:
            session = json.loads(line).get("session_id")
            if session:
                break
    rec = Path(tempfile.gettempdir()) / f"cobuilder-coach-{session}.json"
    keys = json.loads(rec.read_text()) if rec.exists() else []
    keys = keys.get("keys", keys) if isinstance(keys, dict) else keys
    return {"session": session, "structure_advice_keys": list(keys)}


def main():
    cond, n = sys.argv[1], int(sys.argv[2])
    n_slices = int(sys.argv[sys.argv.index("--slices") + 1]) if "--slices" in sys.argv else len(SLICES)
    run_dir = HERE / "runs" / f"{cond}-{n}"
    if run_dir.exists():
        shutil.rmtree(run_dir)
    run_dir.mkdir(parents=True)
    repo = run_dir / "repo"
    sh(HERE, "python3", str(HERE / "make_seed.py"), str(repo), cond)
    seed = sh(repo, "git", "rev-parse", "HEAD").stdout.strip()
    result = {"cond": cond, "run": n, "seed": seed, "slices": []}
    for i, (spec, test) in enumerate(SLICES[:n_slices], 1):
        (repo / f"tests/test_task_{i}.py").write_text(test)
        sh(repo, "git", "add", "-A")
        sh(repo, "git", "commit", "-qm", f"RED {i}")
        out = run_dir / f"green-{i}.jsonl"
        info = claude(repo, GREEN_PROMPT.format(n=i, spec=spec), out, agent="implement:green")
        ok, tail = pytest_ok(repo, ["tests"])
        info.update({"slice": i, "tests_pass": ok, "pytest": tail, **coach_messages(out)})
        result["slices"].append(info)
        sh(repo, "git", "add", "-A")
        sh(repo, "git", "commit", "-qm", f"GREEN {i}", check=False)
    result["measures"] = measures(repo, seed, run_dir)
    result["follow_ons"] = []
    if "--no-follow" not in sys.argv:
        for j, (spec, test) in enumerate(FOLLOW_ONS, 1):
            work = run_dir / f"follow-{j}"
            sh(run_dir, "git", "clone", "-q", str(repo), str(work))
            info = claude(work, FOLLOW_PROMPT.format(spec=spec), run_dir / f"follow-{j}.jsonl")
            hidden = work / f"tests/test_follow_{j}.py"
            hidden.write_text(test)
            keep = [f"tests/test_task_{i}.py" for i in range(1, n_slices + 1) if not (j == 2 and i == 4)]
            ok, tail = pytest_ok(work, [str(hidden.relative_to(work)), *keep])
            info.update({"follow_on": j, "pass": ok, "pytest": tail})
            result["follow_ons"].append(info)
    (run_dir / "result.json").write_text(json.dumps(result, indent=1))
    print(json.dumps({k: result[k] for k in ("cond", "run")} | {"pass": [f["pass"] for f in result["follow_ons"]],
                                                                    "largest": result["measures"]["largest_folder"]}))


if __name__ == "__main__":
    main()
