"""Shared helpers for the tracker port read tests. Not a test module.

The helpers put the script and shared dirs on sys.path, build temp repo
layouts, compute gate and builds-view results the way the goldens were
captured, and record file opens during a call.
"""
from __future__ import annotations

import dataclasses
import json
import os
import shutil
import subprocess
import sys
from contextlib import contextmanager
from pathlib import Path
from typing import Any
from unittest import mock

REPO_ROOT = Path(__file__).resolve().parent.parent
for _dir in ("shared", "plugins/implement/scripts", "plugins/artifact/scripts"):
    sys.path.insert(0, str(REPO_ROOT / _dir))

SHARED_DIR = REPO_ROOT / "shared"
TESTS_DIR = REPO_ROOT / "tests"
FIXTURES = TESTS_DIR / "fixtures" / "tracker"
PLANS_DIR = FIXTURES / "plans"
EXPECTED_INDEX = FIXTURES / "expected-index.json"
GOLDEN = FIXTURES / "golden"
CORPUS = FIXTURES / "corpus"
CORPUS_LIVE = FIXTURES / "corpus-live"
PLAN_GROUPS = ("plans", "plans-index", "plans-real")


def load_golden(name: str) -> dict[str, Any]:
    return json.loads((GOLDEN / name).read_text(encoding="utf-8"))


def all_records(adapter: Any) -> list[Any]:
    """Return programs, epics, slices, and pull requests, in that order."""
    return [
        *adapter.list_programs(),
        *adapter.list_epics(),
        *adapter.list_slices(),
        *adapter.list_pull_requests(),
    ]


def fixture_plans() -> dict[str, Path]:
    """Map each golden key, such as 'plans-real/blocked-close', to its fixture dir."""
    found: dict[str, Path] = {}
    for group in PLAN_GROUPS:
        for directory in sorted((FIXTURES / group).iterdir()):
            if directory.is_dir():
                found[f"{group}/{directory.name}"] = directory
    return found


def plain(value: Any, base: Path | None = None) -> Any:
    """Turn a result into JSON-ready types. Strip the base dir from absolute paths."""
    if dataclasses.is_dataclass(value):
        return plain(dataclasses.asdict(value), base)
    if isinstance(value, dict):
        return {str(key): plain(item, base) for key, item in value.items()}
    if isinstance(value, (list, tuple)):
        return [plain(item, base) for item in value]
    if isinstance(value, set):
        return sorted(plain(item, base) for item in value)
    if isinstance(value, Path):
        return str(value)
    if base is not None and isinstance(value, str) and value.startswith(str(base) + "/"):
        return value[len(str(base)) + 1 :]
    return value


def files_tracker() -> str:
    return "adapter: files\nplans_dir: docs/plans\n"


def fake_tracker() -> str:
    return f"adapter: fake\ncorpus: {CORPUS}\n"


def fake_live_tracker() -> str:
    return f"adapter: fake\ncorpus: {CORPUS_LIVE}\n"


def make_repo(tmp_path: Path, slug: str, plan_src: Path | None, tracker: str | None) -> Path:
    """Build <tmp>/repo with docs/plans/<slug>, and .cobuilder/tracker.yaml when given.

    plan_src is copied into the slug dir. None makes an empty plan dir.
    """
    repo = tmp_path / "repo"
    plan = repo / "docs" / "plans" / slug
    if plan_src is not None:
        shutil.copytree(plan_src, plan)
    else:
        plan.mkdir(parents=True)
    if tracker is not None:
        (repo / ".cobuilder").mkdir(parents=True, exist_ok=True)
        (repo / ".cobuilder" / "tracker.yaml").write_text(tracker, encoding="utf-8")
    return repo


def make_designs(tmp_path: Path, slug: str) -> Path:
    """Write the designs dir the golden capture used: one goal.json for the slug."""
    designs = tmp_path / "designs"
    (designs / slug).mkdir(parents=True)
    goal = {
        "name": slug,
        "adrs": ["ADR-0001"],
        "epics": [{"id": "E1", "note": "first", "state": "in-progress", "branch": "e1"}],
    }
    (designs / slug / "goal.json").write_text(json.dumps(goal), encoding="utf-8")
    return designs


def gate_result(plan_dir: Path) -> dict[str, Any]:
    """Run check_4a and check_4b the way the golden capture did."""
    import verify_gate as vg

    try:
        results, slices = vg.check_4a(plan_dir)
    except SystemExit as exit_:
        return {"check_4a": {"exit": exit_.code}}
    status_path = plan_dir / "00-status.md"
    status_text = status_path.read_text(encoding="utf-8") if status_path.is_file() else ""
    try:
        results_4b = vg.check_4b(plan_dir, slices, status_text)
    except SystemExit as exit_:
        results_4b = {"exit": exit_.code}
    return {"check_4a": plain(results), "check_4b": plain(results_4b, plan_dir)}


def view_result(plan_dir: Path, designs: Path, rubrics: Path) -> dict[str, Any]:
    """Run read_epics and read_plan the way the golden capture did."""
    import build_builds_view as bbv

    slices_path = plan_dir / "04-slices.md"
    slices_md = slices_path.read_text(encoding="utf-8") if slices_path.is_file() else ""
    epics = bbv.read_epics(designs, slices_md)
    try:
        plan = bbv.read_plan(plan_dir, designs, rubrics)
    except SystemExit as exit_:
        plan = {"exit": exit_.code}
    return {"read_epics": plain(epics, plan_dir), "read_plan": plain(plan, plan_dir)}


@contextmanager
def record_file_opens():
    """Record every path opened with open(), Path.read_text, or Path.read_bytes."""
    opened: list[str] = []
    real_open = open
    real_read_text = Path.read_text
    real_read_bytes = Path.read_bytes

    def spy_open(file, *args, **kwargs):
        if isinstance(file, (str, os.PathLike)):
            opened.append(os.fspath(file))
        return real_open(file, *args, **kwargs)

    def spy_read_text(self, *args, **kwargs):
        opened.append(str(self))
        return real_read_text(self, *args, **kwargs)

    def spy_read_bytes(self, *args, **kwargs):
        opened.append(str(self))
        return real_read_bytes(self, *args, **kwargs)

    with mock.patch("builtins.open", spy_open), \
            mock.patch.object(Path, "read_text", spy_read_text), \
            mock.patch.object(Path, "read_bytes", spy_read_bytes):
        yield opened


def init_git_repo(repo: Path) -> None:
    """Make repo a git repo with one commit, so tools that read git state work."""
    for args in (["init", "-q"], ["config", "user.email", "test@example.com"], ["config", "user.name", "Test"]):
        subprocess.run(["git", *args], cwd=repo, check=True)
    (repo / "README.md").write_text("placeholder\n")
    subprocess.run(["git", "add", "."], cwd=repo, check=True)
    subprocess.run(["git", "commit", "-q", "-m", "init"], cwd=repo, check=True)
