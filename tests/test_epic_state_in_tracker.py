"""E4 slice 16: epic branch, pr, and state live in the tracker.

Contract (a): the files adapter reads each epic's `branch`, `pr`, and `state` from the
matching design's goal.json while those keys still exist, and puts them in the epic
envelope. A seed with refresh_envelope carries them into a tracker.
Contract (b): build_index takes the epic's branch, pr, and state from the tracker's epic
records, and never from goal.json.

Assumed layout for (a): the adapter over <repo>/docs/plans reads
<repo>/docs/architecture/designs/<plan>/goal.json. The plan name is the design name.

Fixtures: tests/fixtures/tracker/epic-state/. Every test writes only under tmp_path.
Run with: uv run pytest tests/test_epic_state_in_tracker.py -q
"""
from __future__ import annotations

import json
import os
import shutil
import stat
import subprocess
import sys
from pathlib import Path

import _tracker_port_support as support  # noqa: E402

SHARED_DIR = support.SHARED_DIR

FIXTURE = Path(__file__).resolve().parent / "fixtures" / "tracker" / "epic-state"
BUILD_SCRIPT = SHARED_DIR / "build_index.py"
STATE_KEYS = ("branch", "pr", "state")
EPIC_IDS = ["estate/E1", "estate/E2", "estate/E3"]


def make_repo(tmp_path: Path, corpus: str | None = None) -> Path:
    repo = tmp_path / "repo"
    shutil.copytree(FIXTURE / "repo", repo)
    support.init_git_repo(repo)
    if corpus is not None:
        corpus_dir = tmp_path / "corpus"
        shutil.copytree(FIXTURE / corpus, corpus_dir)
        config = repo / ".cobuilder"
        config.mkdir()
        (config / "tracker.yaml").write_text(
            f"adapter: fake\ncorpus: {json.dumps(str(corpus_dir))}\n", encoding="utf-8"
        )
    return repo


def build(repo: Path, tmp_path: Path) -> dict:
    # A stub gh answers with no pull request, so the build never reaches the network.
    bin_dir = tmp_path / "bin"
    bin_dir.mkdir(exist_ok=True)
    gh = bin_dir / "gh"
    gh.write_text("#!/bin/sh\necho '[]'\n")
    gh.chmod(gh.stat().st_mode | stat.S_IEXEC)
    env = {**os.environ, "PATH": f"{bin_dir}{os.pathsep}{os.environ['PATH']}"}
    result = subprocess.run(
        [sys.executable, str(BUILD_SCRIPT), "--repo", str(repo)],
        capture_output=True, text=True, check=False, env=env,
    )
    assert result.returncode == 0, result.stderr
    index = json.loads((repo / ".cobuilder-architect" / "self" / "data" / "index.json").read_text(encoding="utf-8"))
    return {epic["id"]: epic for epic in index["entities"]["epic"]}


def epic_envelopes(plans_dir: Path) -> dict:
    from tracker_port.files import FilesAdapter

    return {r.id: r.envelope for r in FilesAdapter(plans_dir).all_records() if r.kind == "epic"}


# --- (a) the files adapter epic envelope ---


def test_files_adapter_epic_envelope_carries_goal_branch_pr_state(tmp_path: Path) -> None:
    repo = make_repo(tmp_path)
    envelopes = epic_envelopes(repo / "docs" / "plans")
    assert envelopes["estate/E1"]["branch"] == "design/estate/first"
    assert envelopes["estate/E1"]["pr"] == 7
    assert envelopes["estate/E1"]["state"] == "merged"
    assert envelopes["estate/E2"]["branch"] == "design/estate/second"
    assert "pr" not in envelopes["estate/E2"] and "state" not in envelopes["estate/E2"]
    assert envelopes["estate/E1"]["epic_id"] == "E1"


def test_files_adapter_epic_envelope_is_bare_once_goal_drops_the_keys(tmp_path: Path) -> None:
    repo = make_repo(tmp_path)
    goal = repo / "docs" / "architecture" / "designs" / "estate" / "goal.json"
    shutil.copy(FIXTURE / "goal-after.json", goal)
    envelopes = epic_envelopes(repo / "docs" / "plans")
    for epic_id in ("estate/E1", "estate/E2"):
        assert not any(key in envelopes[epic_id] for key in STATE_KEYS)


def test_seed_refresh_carries_goal_state_into_the_tracker(tmp_path: Path) -> None:
    # The backfill runs before the migration drops the keys. Nothing is lost.
    from tracker_port.fake import FakeAdapter

    repo = make_repo(tmp_path)
    corpus = tmp_path / "corpus"
    shutil.copytree(FIXTURE / "corpus-bare", corpus)
    adapter = FakeAdapter(corpus)
    adapter.seed_from_files(repo / "docs" / "plans", refresh_envelope=True)
    held = {r.id: r.envelope for r in adapter.list_epics()}
    assert held["estate/E1"]["branch"] == "design/estate/first"
    assert held["estate/E1"]["pr"] == 7
    assert held["estate/E1"]["state"] == "merged"
    assert held["estate/E2"]["branch"] == "design/estate/second"


# --- (b) the build_index joins ---


def test_index_epic_state_comes_from_tracker_not_goal(tmp_path: Path) -> None:
    # goal.json still holds old values here. The tracker values must win.
    repo = make_repo(tmp_path, corpus="corpus-with-state")
    epics = build(repo, tmp_path)
    assert list(epics) == EPIC_IDS
    assert (epics["estate/E1"]["branch"], epics["estate/E1"]["pr"], epics["estate/E1"]["state"]) == (
        "tracker/first", 9, "open",
    )
    assert epics["estate/E2"]["branch"] == "tracker/second"


def test_index_epic_state_is_null_when_tracker_envelope_lacks_it(tmp_path: Path) -> None:
    # goal.json holds values, the tracker envelope does not. Branch and pr read null.
    # State comes from the held record lifecycle, so the held epics read open.
    repo = make_repo(tmp_path, corpus="corpus-bare")
    epics = build(repo, tmp_path)
    assert list(epics) == EPIC_IDS
    for epic_id in ("estate/E1", "estate/E2"):
        assert epics[epic_id]["branch"] is None and epics[epic_id]["pr"] is None
        assert epics[epic_id]["state"] == "open"
    assert all(epics["estate/E3"][key] is None for key in STATE_KEYS)  # no tracker record for E3


def test_index_epic_state_is_the_held_record_lifecycle(tmp_path: Path) -> None:
    # E1 carries a stale envelope state of merged and lifecycle in_progress. The lifecycle wins.
    repo = make_repo(tmp_path, corpus="corpus-lifecycle")
    epics = build(repo, tmp_path)
    assert epics["estate/E1"]["state"] == "in_progress"
    assert epics["estate/E2"]["state"] == "closed"
    assert epics["estate/E3"]["state"] is None  # no held record
    assert (epics["estate/E1"]["branch"], epics["estate/E1"]["pr"]) == ("tracker/first", 9)
    assert epics["estate/E2"]["branch"] == "tracker/second"


def test_index_epic_state_after_migration_comes_from_tracker(tmp_path: Path) -> None:
    repo = make_repo(tmp_path, corpus="corpus-with-state")
    shutil.copy(FIXTURE / "goal-after.json", repo / "docs" / "architecture" / "designs" / "estate" / "goal.json")
    epics = build(repo, tmp_path)
    assert list(epics) == EPIC_IDS
    assert epics["estate/E1"]["state"] == "open"
    assert epics["estate/E3"]["branch"] is None  # no tracker record for E3


def test_index_without_tracker_config_reads_state_through_the_files_adapter(tmp_path: Path) -> None:
    repo = make_repo(tmp_path)
    epics = build(repo, tmp_path)
    assert list(epics) == EPIC_IDS
    assert epics["estate/E1"]["branch"] == "design/estate/first"
    assert epics["estate/E1"]["pr"] == 7
    assert epics["estate/E1"]["state"] == "open"  # the files adapter epic lifecycle; the envelope state merged no longer matters


def test_index_epic_status_follows_the_tracker_lifecycle_after_the_pr_join(tmp_path: Path) -> None:
    # E1 holds a PR (placeholder open) at in_progress. E4 holds a PR at closed. E2 is closed with no PR.
    # E5 is held open with a PR. E3 has no held record.
    repo = make_repo(tmp_path, corpus="corpus-join")
    goal_path = repo / "docs" / "architecture" / "designs" / "estate" / "goal.json"
    goal = json.loads(goal_path.read_text(encoding="utf-8"))
    goal["epics"] += [
        {"id": "E4", "slug": "fourth", "outcome": "The fourth epic ships."},
        {"id": "E5", "slug": "fifth", "outcome": "The fifth epic ships."},
    ]
    goal_path.write_text(json.dumps(goal), encoding="utf-8")
    epics = build(repo, tmp_path)
    index = json.loads((repo / ".cobuilder-architect" / "self" / "data" / "index.json").read_text(encoding="utf-8"))
    status = index["joins"]["epic_status"]
    assert index["joins"]["epic_to_pull_request"]["estate/E1"] == 9
    assert status["estate/E1"] == "in_progress"
    assert status["estate/E4"] == "completed"
    assert status["estate/E2"] == "completed"  # closed wins over no-pull-request
    assert status["estate/E5"] == "open"  # lifecycle open leaves the PR-join placeholder
    assert status["estate/E3"] == "unstarted"  # no held record
    # The epic entity state stays the lifecycle word.
    assert epics["estate/E1"]["state"] == "in_progress"
    assert epics["estate/E4"]["state"] == "closed"
    assert epics["estate/E5"]["state"] == "open"


def test_epic_fields_hold_no_state_keys() -> None:
    import build_index

    assert not set(STATE_KEYS) & set(build_index.EPIC_FIELDS)


def test_epic_envelope_follows_the_design_named_by_the_epic_id_not_the_plan_folder() -> None:
    # Plan folder 'family-plan' holds epics of design 'plugin-split'. A decoy goal.json sits at
    # the design named like the plan folder. The envelope must come from the epic id prefix.
    envelopes = epic_envelopes(FIXTURE / "family" / "docs" / "plans")
    assert list(envelopes) == ["plugin-split/E1"]
    envelope = envelopes["plugin-split/E1"]
    assert envelope["branch"] == "design/plugin-split/e1"
    assert envelope["pr"] == 17
    assert envelope["state"] == "merged"
