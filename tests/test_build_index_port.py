"""Slice 10 tests: the bundle index reads slice entities through the tracker port.

The golden holds the slice entities that today's collect_plans returns for a
miniature plan tree. Slice 10 must keep that output byte for byte.

Run with: uv run pytest tests/test_build_index_port.py -q
"""
from __future__ import annotations

import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

import _tracker_port_support as support  # noqa: E402

import build_index  # noqa: E402
from tracker_port import projector  # noqa: E402
from tracker_port.files import FilesAdapter  # noqa: E402

SHARED_DIR = support.SHARED_DIR
TESTS_DIR = support.TESTS_DIR
FIXTURES = TESTS_DIR / "fixtures" / "tracker"
GOLDEN = FIXTURES / "golden" / "build_index_entities.json"
MINI_PLANS = FIXTURES / "plans" / "beads-storage-mini"
CHECKBOX_PLANS = FIXTURES / "plans-index" / "checkbox-vs-table"
CORPUS = FIXTURES / "corpus"
BUILD_SCRIPT = SHARED_DIR / "build_index.py"

PLANS_SUBDIR = Path("docs") / "plans"
SELF_DATA = Path(".cobuilder-architect") / "self" / "data"

# The fake corpus for test 4. Each slice envelope carries the fields the index reads.
FAKE_SLICES = [
    {
        "id": "demo-E1-s1",
        "kind": "slice",
        "parent": "demo-E1",
        "blocked_by": [],
        "lifecycle": "closed",
        "assignee": None,
        "envelope": {
            "feature": "fake-feature",
            "n": 1,
            "title": "Fake slice one",
            "ends_with": "Fake one done",
            "score": 0.92,
            "attempts": 1,
        },
        "external_ref": None,
    },
    {
        "id": "demo-E1-s2",
        "kind": "slice",
        "parent": "demo-E1",
        "blocked_by": ["demo-E1-s1"],
        "lifecycle": "in_progress",
        "assignee": "agent-1",
        "envelope": {
            "feature": "fake-feature",
            "n": 2,
            "title": "Fake slice two",
            "ends_with": "Fake two done",
        },
        "external_ref": None,
    },
    {
        "id": "demo-E1-s3",
        "kind": "slice",
        "parent": "demo-E1",
        "blocked_by": ["demo-E1-s1"],
        "lifecycle": "open",
        "assignee": None,
        "envelope": {
            "feature": "fake-feature",
            "n": 3,
            "title": "Fake slice three",
            "ends_with": "Fake three done",
        },
        "external_ref": None,
    },
]

FAKE_EXPECTED = [
    {
        "attempts": 1,
        "ends_with": "Fake one done",
        "feature": "fake-feature",
        "id": "demo-E1-s1",
        "n": 1,
        "score": "0.92",
        "state": "completed",
        "title": "Fake slice one",
    },
    {
        "attempts": 0,
        "ends_with": "Fake two done",
        "feature": "fake-feature",
        "id": "demo-E1-s2",
        "n": 2,
        "score": "—",
        "state": "in_progress",
        "title": "Fake slice two",
    },
    {
        "attempts": 0,
        "ends_with": "Fake three done",
        "feature": "fake-feature",
        "id": "demo-E1-s3",
        "n": 3,
        "score": "—",
        "state": "planned",
        "title": "Fake slice three",
    },
]


init_repo = support.init_git_repo


def make_repo(tmp_path: Path, plan_sources: list[Path]) -> Path:
    # Copy each plan folder into a temp repo. Every test writes only under tmp_path.
    repo = tmp_path / "repo"
    repo.mkdir()
    init_repo(repo)
    plans = repo / PLANS_SUBDIR
    plans.mkdir(parents=True)
    for source in plan_sources:
        shutil.copytree(source, plans / source.name)
    return repo


def run_build(repo: Path) -> None:
    # Run the real build entry as a separate process, the way a user runs it.
    result = subprocess.run(
        [sys.executable, str(BUILD_SCRIPT), "--repo", str(repo)],
        capture_output=True,
        text=True,
        check=False,
    )
    assert result.returncode == 0, result.stderr


def read_index_slices(repo: Path) -> list[dict]:
    index = json.loads((repo / SELF_DATA / "index.json").read_text(encoding="utf-8"))
    return index["entities"]["slice"]


def load_golden() -> list[dict]:
    return json.loads(GOLDEN.read_text(encoding="utf-8"))


def test_entities_match_golden(tmp_path):
    repo = make_repo(tmp_path, [MINI_PLANS, CHECKBOX_PLANS])
    run_build(repo)
    assert read_index_slices(repo) == load_golden()


def test_writes_both_index_paths(tmp_path):
    # The two index files, index.json and index.js, sit side by side in the self bundle.
    repo = make_repo(tmp_path, [MINI_PLANS, CHECKBOX_PLANS])
    run_build(repo)
    index_json = repo / SELF_DATA / "index.json"
    index_js = repo / SELF_DATA / "index.js"
    assert index_json.is_file()
    assert index_js.is_file()
    assert index_js.read_text(encoding="utf-8").startswith("window.INDEX = ")


def test_slice_entities_from_records(tmp_path):
    repo = make_repo(tmp_path, [MINI_PLANS, CHECKBOX_PLANS])
    records = FilesAdapter(repo / PLANS_SUBDIR).all_records()
    assert projector.slice_entities(records) == load_golden()
    # The file-reading collector is gone. The port feeds the index now.
    assert not hasattr(build_index, "collect_plans")


def test_fake_adapter_feeds_the_index(tmp_path):
    # The plan tree stays in place, so the index must come from the adapter, not the plans.
    repo = make_repo(tmp_path, [MINI_PLANS])
    corpus = tmp_path / "corpus"
    shutil.copytree(CORPUS, corpus)
    (corpus / "slices.json").write_text(json.dumps(FAKE_SLICES), encoding="utf-8")
    config_dir = repo / ".cobuilder"
    config_dir.mkdir()
    (config_dir / "tracker.yaml").write_text(
        f"adapter: fake\ncorpus: {json.dumps(str(corpus))}\n", encoding="utf-8"
    )
    run_build(repo)
    slices = read_index_slices(repo)
    assert slices == FAKE_EXPECTED
    assert not any(entity["id"].startswith("beads-storage-mini/") for entity in slices)


def test_does_not_read_live_plans():
    # The test file must not name the live plan tree. Temp trees use Path parts instead.
    text = Path(__file__).read_text(encoding="utf-8")
    assert re.search(r"""["']docs[/\\]plans""", text) is None
