"""Tests for scripts/migrate_bundle.py at bundle_format 3 / schema 1.3.

Run with: uv run --with pytest pytest tests/ -v
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "shared"))

import migrate_bundle as mb  # noqa: E402
import _bundle_meta  # noqa: E402


def make_bundle(tmp_path: Path, bundle_meta: dict, story: dict) -> Path:
    bundle_dir = tmp_path / "bundle"
    (bundle_dir / "data").mkdir(parents=True)
    (bundle_dir / "bundle.json").write_text(json.dumps(bundle_meta))
    (bundle_dir / "data" / "story.json").write_text(json.dumps(story))
    return bundle_dir


def minimal_story(schema_version: str) -> dict:
    return {"meta": {"schema_version": schema_version}, "world": {"districts": []}, "timeline": []}


# --- C3: scalar generator_version becomes a map, old value preserved ---


def test_build_generators_map_preserves_old_scalar():
    old_meta = {"generator_version": "0.3.0"}
    generators = mb.build_generators_map(old_meta, "0.5.0")
    assert generators == {"cobuilder-architect": "0.3.0"}


def test_build_generators_map_keeps_existing_map_entries():
    old_meta = {"generators": {"cobuilder-artifact": "0.4.0"}}
    generators = mb.build_generators_map(old_meta, "0.5.0")
    assert generators["cobuilder-artifact"] == "0.4.0"
    assert generators["cobuilder-architect"] == "0.5.0"


def test_full_migration_turns_scalar_into_map(tmp_path):
    bundle_dir = make_bundle(
        tmp_path,
        {"bundle_format": 2, "schema_version": "1.2", "generator_version": "0.3.0"},
        minimal_story("1.2"),
    )
    story = mb.read_story(bundle_dir)
    bundle_meta = mb.read_bundle_json(bundle_dir)
    result_story, _, violations = mb.run_data_ladder(story, "1.2")
    assert not violations
    final_format, _ = mb.run_layout_ladder(bundle_dir, 2, dry_run=False)
    mb.write_bundle_json(bundle_dir, final_format, result_story["meta"]["schema_version"], bundle_meta)

    new_meta = json.loads((bundle_dir / "bundle.json").read_text())
    assert new_meta["bundle_format"] == 4
    assert new_meta["generators"]["cobuilder-architect"] == "0.3.0"
    assert "generator_version" not in new_meta or new_meta.get("generator_version") == "0.3.0"


# --- C4: a migration touching an undeclared authored field stops before writing ---


def test_guard_rejects_undeclared_authored_field_change():
    story = {
        "meta": {"schema_version": "1.2", "title": "Untouched Title"},
        "world": {"districts": []},
        "timeline": [],
    }

    def bad_migration(s: dict) -> dict:
        s["meta"]["title"] = "Silently Changed"
        s["meta"]["schema_version"] = "1.3"
        return s

    result, violations = mb.run_guard(story, bad_migration, touches=set())
    assert violations == ["meta.title"]


def test_data_ladder_stops_before_later_steps_on_violation(monkeypatch):
    def bad_migration(s: dict) -> dict:
        s["meta"]["title"] = "Corrupted"
        s["meta"]["schema_version"] = "1.2"
        return s

    fake_ladder = [("1.0", "1.2", bad_migration, set(), "deliberately bad step")]
    monkeypatch.setattr(mb, "SCHEMA_MIGRATIONS", fake_ladder)

    story = {"meta": {"schema_version": "1.0", "title": "Original"}, "world": {"districts": []}, "timeline": []}
    result, steps, violations = mb.run_data_ladder(story, "1.0")

    assert violations == ["meta.title"]
    assert steps == []  # nothing was applied


def test_main_writes_nothing_on_guard_violation(tmp_path, monkeypatch, capsys):
    def bad_migration(s: dict) -> dict:
        s.setdefault("meta", {})["title"] = "Corrupted"
        s["meta"]["schema_version"] = "1.3"
        return s

    fake_ladder = [("1.2", "1.3", bad_migration, set(), "deliberately bad step")]
    monkeypatch.setattr(mb, "SCHEMA_MIGRATIONS", fake_ladder)

    story = {
        "meta": {"schema_version": "1.2", "title": "Original"},
        "world": {"districts": []},
        "timeline": [],
    }
    bundle_dir = make_bundle(tmp_path, {"bundle_format": 3, "schema_version": "1.2"}, story)

    story_before = (bundle_dir / "data" / "story.json").read_text()
    bundle_before = (bundle_dir / "bundle.json").read_text()

    monkeypatch.setattr(sys, "argv", ["migrate_bundle.py", "--bundle-dir", str(bundle_dir)])
    with pytest.raises(SystemExit) as excinfo:
        mb.main()
    assert excinfo.value.code == 1

    assert (bundle_dir / "data" / "story.json").read_text() == story_before
    assert (bundle_dir / "bundle.json").read_text() == bundle_before
    assert not (bundle_dir / ".migration-backup").exists()


# --- C2: a backup is written before the new story.json ---


def test_backup_written_before_new_story(tmp_path):
    bundle_dir = make_bundle(
        tmp_path,
        {"bundle_format": 2, "schema_version": "1.2", "generator_version": "0.3.0"},
        minimal_story("1.2"),
    )
    (bundle_dir / "viewer").mkdir(parents=True)
    (bundle_dir / "viewer" / "index.html").write_text("stale viewer")

    sys.argv = ["migrate_bundle.py", "--bundle-dir", str(bundle_dir)]
    mb.main()

    backup_dir = bundle_dir / ".migration-backup"
    assert backup_dir.exists()
    backups = list(backup_dir.glob("*schema-1.2.json"))
    assert len(backups) == 1
    backed_up = json.loads(backups[0].read_text())
    assert backed_up["meta"]["schema_version"] == "1.2"

    new_story = json.loads((bundle_dir / "data" / "story.json").read_text())
    assert new_story["meta"]["schema_version"] == "1.3"


# --- C5: the viewer refresh is unconditional ---


def test_viewer_refreshes_even_at_current_version(tmp_path):
    bundle_dir = make_bundle(
        tmp_path,
        {
            "bundle_format": _bundle_meta.CURRENT_BUNDLE_FORMAT,
            "schema_version": _bundle_meta.SCHEMA_VERSION,
            "min_reader_schema": _bundle_meta.SCHEMA_VERSION,
            "generators": {"cobuilder-architect": "9.9.9"},
        },
        minimal_story(_bundle_meta.SCHEMA_VERSION),
    )
    (bundle_dir / "viewer").mkdir(parents=True)
    (bundle_dir / "viewer" / "index.html").write_text("this is stale content, not the real viewer")

    # Only artifact ships viewer/index.html. In an installed
    # cache, shared/migrate_bundle.py sits at <plugin>/shared/, so
    # PLUGIN_ROOT resolves to <plugin>/. Point it at artifact
    # here, the one plugin whose root actually holds a viewer/.
    artifact_plugin_root = Path(__file__).resolve().parent.parent / "plugins" / "artifact"
    original_plugin_root = mb.PLUGIN_ROOT
    mb.PLUGIN_ROOT = artifact_plugin_root
    try:
        real_viewer = (mb.PLUGIN_ROOT / "viewer" / "index.html").read_text()

        sys.argv = ["migrate_bundle.py", "--bundle-dir", str(bundle_dir)]
        mb.main()
    finally:
        mb.PLUGIN_ROOT = original_plugin_root

    assert (bundle_dir / "viewer" / "index.html").read_text() == real_viewer


def test_viewer_refresh_is_not_version_gated_in_source():
    """Regression guard: refresh_viewer() must run unconditionally in
    main(), never behind a bundle_format or schema_version comparison."""
    source = (Path(mb.__file__)).read_text()
    call_line_idx = source.index('report["viewer"] = refresh_viewer(')
    # The 400 characters before the call must not contain a version-gating
    # `if` on current_format or current_schema wrapping the call.
    preceding = source[:call_line_idx]
    last_lines = preceding.splitlines()[-6:]
    assert not any(
        "current_format ==" in line or "current_schema ==" in line
        for line in last_lines
    )
