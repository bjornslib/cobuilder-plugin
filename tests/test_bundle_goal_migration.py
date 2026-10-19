"""E4 slice 16: the bundle migration drops branch, pr, and state from goal.json epics[].

The fixture is a repo copy with an old goal.json. The bundle sits at
<repo>/.cobuilder-architect/self, as in a real self bundle. Every test writes only under tmp_path.
Run with: uv run pytest tests/test_bundle_goal_migration.py -q
"""
from __future__ import annotations

import json
import shutil
import subprocess
import sys
from pathlib import Path

import pytest

REPO = Path(__file__).resolve().parent.parent
SHARED_DIR = REPO / "shared"
sys.path.insert(0, str(SHARED_DIR))
sys.path.insert(0, str(Path(__file__).resolve().parent))
import _tracker_port_support as support  # noqa: E402

import _bundle_meta  # noqa: E402
import migrate_bundle as mb  # noqa: E402

FIXTURE = Path(__file__).resolve().parent / "fixtures" / "tracker" / "epic-state"
STATE_KEYS = ("branch", "pr", "state")
OLD_FORMAT = 4
DESIGN = Path("docs") / "architecture" / "designs" / "estate"
STORY = {
    "meta": {"schema_version": "1.3", "title": "Authored title", "description": "Authored description"},
    "world": {"districts": [{"id": "d1", "label": "Authored label", "kind": "core", "blurb": "Authored blurb"}]},
    "timeline": [
        {
            "pr": 1, "status": "merged", "tagline": "Authored tagline", "depth": 2,
            "levels": {"intent": {"narration": "Authored narration", "voice": "Authored voice"}},
        }
    ],
}


def make_bundle_repo(tmp_path: Path) -> tuple[Path, Path]:
    repo = tmp_path / "repo"
    shutil.copytree(FIXTURE / "repo", repo)
    (repo / DESIGN / "intent.json").write_text(
        json.dumps({"problem": "Authored problem", "approach": "Authored approach"}), encoding="utf-8"
    )
    support.init_git_repo(repo)
    bundle = repo / ".cobuilder-architect" / "self"
    (bundle / "data").mkdir(parents=True)
    (bundle / "data" / "story.json").write_text(json.dumps(STORY, indent=2) + "\n", encoding="utf-8")
    (bundle / "bundle.json").write_text(
        json.dumps({
            "bundle_format": OLD_FORMAT, "schema_version": "1.3", "min_reader_schema": "1.3",
            "generators": {"cobuilder-architect": "0.0.1"},
        }),
        encoding="utf-8",
    )
    (bundle / "feedback-ledger.jsonl").touch()
    return repo, bundle


def migrate(bundle: Path, *flags: str) -> subprocess.CompletedProcess:
    return subprocess.run(
        [sys.executable, str(SHARED_DIR / "migrate_bundle.py"), "--bundle-dir", str(bundle), *flags],
        capture_output=True, text=True, check=False,
    )


def build_epic_ids(repo: Path) -> list[str]:
    result = subprocess.run(
        [sys.executable, str(SHARED_DIR / "build_index.py"), "--repo", str(repo)],
        capture_output=True, text=True, check=False,
    )
    assert result.returncode == 0, result.stderr
    index = json.loads((repo / ".cobuilder-architect" / "self" / "data" / "index.json").read_text(encoding="utf-8"))
    return [epic["id"] for epic in index["entities"]["epic"]]


def read_goal(repo: Path) -> dict:
    return json.loads((repo / DESIGN / "goal.json").read_text(encoding="utf-8"))


def test_old_fixture_holds_the_state_keys(tmp_path: Path) -> None:
    # A guard on the fixture: the tests below start from an old goal.json.
    repo, _ = make_bundle_repo(tmp_path)
    assert any(key in epic for epic in read_goal(repo)["epics"] for key in STATE_KEYS)


def test_drops_epic_state(tmp_path: Path) -> None:
    repo, bundle = make_bundle_repo(tmp_path)
    result = migrate(bundle)
    assert result.returncode == 0, result.stderr
    for epic in read_goal(repo)["epics"]:
        assert not any(key in epic for key in STATE_KEYS), epic


def test_touches_only_the_three_epic_keys(tmp_path: Path) -> None:
    repo, bundle = make_bundle_repo(tmp_path)
    assert migrate(bundle).returncode == 0
    assert read_goal(repo) == json.loads((FIXTURE / "goal-after.json").read_text(encoding="utf-8"))


def test_format_bump(tmp_path: Path) -> None:
    assert _bundle_meta.CURRENT_BUNDLE_FORMAT == OLD_FORMAT + 1
    assert any(step[0] == OLD_FORMAT and step[1] == OLD_FORMAT + 1 for step in mb.LAYOUT_MIGRATIONS)
    repo, bundle = make_bundle_repo(tmp_path)
    assert migrate(bundle).returncode == 0
    stamped = json.loads((bundle / "bundle.json").read_text(encoding="utf-8"))
    assert stamped["bundle_format"] == OLD_FORMAT + 1


def test_epic_ids_in_index_unchanged(tmp_path: Path) -> None:
    repo, bundle = make_bundle_repo(tmp_path)
    before = build_epic_ids(repo)
    assert before == ["estate/E1", "estate/E2", "estate/E3"]
    assert migrate(bundle).returncode == 0
    assert build_epic_ids(repo) == before


def test_authored_fields_untouched(tmp_path: Path) -> None:
    repo, bundle = make_bundle_repo(tmp_path)
    story_before = (bundle / "data" / "story.json").read_bytes()
    intent_before = (repo / DESIGN / "intent.json").read_bytes()
    assert migrate(bundle).returncode == 0
    assert (bundle / "data" / "story.json").read_bytes() == story_before
    assert (repo / DESIGN / "intent.json").read_bytes() == intent_before
    assert mb.harvest_authored(json.loads((bundle / "data" / "story.json").read_text())) == mb.harvest_authored(STORY)
    # Plan files and the other goal.json keys stay as they were.
    goal = read_goal(repo)
    assert goal["name"] == "estate" and goal["stage"] == "decided"
    assert [e["id"] for e in goal["epics"]] == ["E1", "E2", "E3"]
    assert goal["epics"][0]["note"] == "kept by the migration"


def test_dry_run_writes_nothing(tmp_path: Path) -> None:
    repo, bundle = make_bundle_repo(tmp_path)
    goal_before = (repo / DESIGN / "goal.json").read_bytes()
    bundle_before = (bundle / "bundle.json").read_bytes()
    assert migrate(bundle, "--dry-run").returncode == 0
    assert (repo / DESIGN / "goal.json").read_bytes() == goal_before
    assert (bundle / "bundle.json").read_bytes() == bundle_before


def test_second_run_changes_nothing(tmp_path: Path) -> None:
    repo, bundle = make_bundle_repo(tmp_path)
    assert migrate(bundle).returncode == 0
    after_first = (repo / DESIGN / "goal.json").read_bytes()
    assert migrate(bundle).returncode == 0
    assert (repo / DESIGN / "goal.json").read_bytes() == after_first


def test_migration_never_calls_extract_story(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    repo, bundle = make_bundle_repo(tmp_path)
    calls: list[object] = []

    def spy(*args, **kwargs):
        calls.append(args[0] if args else kwargs)
        raise AssertionError(f"a subprocess ran during the migration: {args!r}")

    for name in ("run", "call", "check_call", "check_output", "Popen"):
        monkeypatch.setattr(subprocess, name, spy)
    monkeypatch.setitem(sys.modules, "extract_story", None)  # an import of it raises
    monkeypatch.setattr(sys, "argv", ["migrate_bundle.py", "--bundle-dir", str(bundle)])
    mb.main()
    assert calls == []
    for epic in read_goal(repo)["epics"]:
        assert not any(key in epic for key in STATE_KEYS)


def test_artifact_versions_match() -> None:
    plugin = json.loads((REPO / "plugins" / "artifact" / ".claude-plugin" / "plugin.json").read_text(encoding="utf-8"))
    market = json.loads((REPO / ".claude-plugin" / "marketplace.json").read_text(encoding="utf-8"))
    entry = next(p for p in market["plugins"] if p["name"] == "artifact")
    assert plugin["version"] == entry["version"]
