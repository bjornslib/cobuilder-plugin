"""Shared helpers for the whole-repository record tests, slice 13 of structure-coaching (E6).

A case builds a git repo in tmp_path with dated commits. It runs the real script with its cwd
set to that repo. Then it reads the record that the script writes. Each helper asserts on its
own step, so a missing script or module fails on an assertion, never on an import error.
"""
from __future__ import annotations

import importlib
import json
import os
import subprocess
import sys
import time
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parent.parent
SHARED = REPO_ROOT / "shared"
EVIDENCE_PATH = SHARED / "structure_evidence.py"
REPO_PATH = SHARED / "structure" / "repo.py"
COMMIT_OPTIONS = ("-c", "user.name=t", "-c", "user.email=t@t", "-c", "commit.gpgsign=false")
DAY = 86400
RECORD_KEYS = ("schema", "commit", "since", "window_days", "findings", "folders", "not_analysed")
FINDING_KEYS = ("key", "signal", "path", "folder", "facts", "changes")
FOLDER_KEYS = ("folder", "n", "internal", "out", "in", "cf", "instability", "groups", "test_share")
FIRST, SECOND = "left/feature_core.py", "right/feature_view.py"
TEST = "tests/test_feature_core.py"
LIB_BEFORE = "def fetch(key):\n    if not key:\n        raise ValueError('empty key')\n    return key\n"
LIB_AFTER = LIB_BEFORE.replace("ValueError", "KeyError")
CALLER = "from lib import fetch\n\n\ndef load():\n    return fetch('a')\n"
PAGE = "export default function Page() {\n  return null;\n}\n"
# Eight lines of one function body. Three product files each copy it.
BLOCK = (
    "    subtotal = sum(line.price * line.quantity for line in lines)\n"
    "    discount = subtotal * customer_rate(customer)\n"
    "    taxable = subtotal - discount\n"
    "    tax = taxable * region_tax_rate(region)\n"
    "    total = round(taxable + tax, 2)\n"
    "    audit_trail.append(('total', total))\n"
    "    notify_listeners(total, region)\n"
    "    return total\n"
)


def git(repo: Path, *args: str, env: dict[str, str] | None = None) -> str:
    """Return the output of one git command run in repo."""
    result = subprocess.run(
        ["git", "-C", str(repo), *args], check=True, capture_output=True, text=True, env=env
    )
    return result.stdout.strip()


def new_repo(tmp_path: Path) -> Path:
    """Return an empty repo whose branch is main."""
    repo = (tmp_path / "repo").resolve()
    repo.mkdir()
    git(repo, "init", "-q")
    git(repo, "symbolic-ref", "HEAD", "refs/heads/main")
    return repo


def commit(repo: Path, files: dict[str, str], days_ago: int, message: str = "commit") -> str:
    """Write each file, commit the changes dated days_ago in the past, and return the sha."""
    for rel, text in files.items():
        (repo / rel).parent.mkdir(parents=True, exist_ok=True)
        (repo / rel).write_text(text, encoding="utf-8")
    stamp = f"{int(time.time()) - days_ago * DAY} +0000"
    env = {**os.environ, "GIT_AUTHOR_DATE": stamp, "GIT_COMMITTER_DATE": stamp}
    git(repo, "add", "-A")
    git(repo, *COMMIT_OPTIONS, "commit", "-q", "-m", message, env=env)
    return git(repo, "rev-parse", "HEAD")


def parts(folder: str, count: int) -> dict[str, str]:
    """Return count one-line Python files named part_NN in one folder."""
    return {f"{folder}/part_{index:02d}.py": f"VALUE_{index} = {index}\n" for index in range(count)}


def pair_commit(
    repo: Path, first: str, second: str, index: int, days_ago: int,
    extra: dict[str, str] | None = None,
) -> None:
    """Commit a change to both files, plus any extra files, dated days_ago in the past."""
    files = {first: f"VALUE = {index}\n", second: f"VIEW = {index}\n", **(extra or {})}
    commit(repo, files, days_ago, f"pair change {index}")


def drift_repo(tmp_path: Path) -> tuple[Path, str]:
    """Return a repo whose fetch raise changed after the base commit, and the base sha."""
    repo = new_repo(tmp_path)
    base = commit(repo, {"lib.py": LIB_BEFORE, "caller.py": CALLER}, 30, "base")
    commit(repo, {"lib.py": LIB_AFTER}, 2, "raise a KeyError")
    return repo, base


def context_records() -> dict[str, str]:
    """Return the boundary records of two synthetic contexts, alpha and beta, with no allowed rule."""
    return {
        f"docs/architecture/contexts/{name}/boundary.yaml": (
            f"id: {name}\npath: {name}\nname: \"{name}: a synthetic context\"\n"
            "allowed_dependencies: []\n"
        )
        for name in ("alpha", "beta")
    }


def run_record(repo: Path, out: Path, since: str | None = None) -> dict[str, Any]:
    """Run the script with --repo in repo, and return the record that it writes to out."""
    argv = [sys.executable, str(EVIDENCE_PATH), "--repo", "--out", str(out)]
    if since is not None:
        argv += ["--since", since]
    result = subprocess.run(
        argv, cwd=repo, capture_output=True, text=True, timeout=300, check=False
    )
    assert result.returncode == 0, f"the script exited {result.returncode}: {result.stderr}"
    assert out.is_file(), f"no record file at {out}"
    printed = [str(path) for path in (out, out.resolve()) if str(path) in result.stdout]
    assert printed, f"the record path is not printed: {result.stdout!r}"
    record = json.loads(out.read_text(encoding="utf-8"))
    assert isinstance(record, dict), "the record file holds no JSON object"
    return record


def field(item: dict[str, Any], key: str) -> Any:
    """Return one key of a dict. Assert that the key is there."""
    assert key in item, f"no {key!r} in {sorted(item)}"
    return item[key]


def field_list(item: dict[str, Any], key: str) -> list[Any]:
    """Return one list-valued key of a dict. Assert that the value is a list."""
    value = field(item, key)
    assert isinstance(value, list), f"{key!r} is not a list: {value!r}"
    return value


def facts_of(item: dict[str, Any]) -> dict[str, Any]:
    """Return the facts of one finding. Assert that they form a dict."""
    facts = field(item, "facts")
    assert isinstance(facts, dict), f"the facts are not a dict: {facts!r}"
    return facts


def finding_list(record: dict[str, Any]) -> list[dict[str, Any]]:
    """Return the findings of a record."""
    return field_list(record, "findings")


def with_prefix(findings: list[dict[str, Any]], prefix: str) -> list[dict[str, Any]]:
    """Return the findings whose key starts with prefix."""
    return [item for item in findings if str(item.get("key", "")).startswith(prefix)]


def with_signal(findings: list[dict[str, Any]], signal: str) -> list[dict[str, Any]]:
    """Return the findings of one signal."""
    return [item for item in findings if item.get("signal") == signal]


def one(findings: list[dict[str, Any]], key: str) -> dict[str, Any]:
    """Return the one finding with the key. Assert that exactly one has it."""
    matches = [item for item in findings if item.get("key") == key]
    keys = [item.get("key") for item in findings]
    assert len(matches) == 1, f"expected one finding {key!r}, got {keys}"
    return matches[0]


def folder_row(record: dict[str, Any], folder: str) -> dict[str, Any]:
    """Return the folder-table row of one folder. Assert that exactly one row has it."""
    rows = [row for row in field_list(record, "folders") if row.get("folder") == folder]
    assert len(rows) == 1, f"the folder table has no row for {folder!r}"
    return rows[0]


def record_of(findings: list[dict[str, Any]]) -> dict[str, Any]:
    """Return a record with the D5 keys, holding the given findings."""
    return {
        "schema": 1, "commit": "sha", "since": None, "window_days": 90,
        "findings": findings, "folders": [], "not_analysed": [],
    }


def make_finding(key: str, count: int) -> dict[str, Any]:
    """Return one finding in the D5 shape, with one count fact."""
    return {
        "key": key, "signal": key.split("|")[0], "path": "", "folder": "",
        "facts": {"count": count}, "changes": 0,
    }


def load_compare_findings() -> Any:
    """Return compare_findings from shared/structure/repo.py. Assert that the module exists."""
    assert REPO_PATH.is_file(), f"missing {REPO_PATH}: slice 13 creates this module"
    if str(SHARED) not in sys.path:
        sys.path.insert(0, str(SHARED))
    module = importlib.import_module("structure.repo")
    assert hasattr(module, "compare_findings"), "structure/repo.py has no compare_findings yet"
    return module.compare_findings
