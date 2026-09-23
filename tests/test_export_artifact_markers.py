"""export_artifact.py must match the built viewer by named marker, not by literal.

Slice 1 of cobuilder-viewer/E1. The exporter rewrites the viewer by string
substitution and stops when a substituted literal has moved. This file pins
the slice's replacement: a named marker list held as data, one entry per
marker the exporter rewrites.

The claims pinned here are the slice's C2 and C3:

1. the exporter exposes a named marker list as data
2. every name in that list appears in the built viewer
3. a missing marker stops the exporter, names it, and writes no output file
4. a present marker set lets the exporter run

Run with: uv run --with pytest pytest tests/test_export_artifact_markers.py -v
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent
SCRIPTS_DIR = REPO_ROOT / "plugins" / "artifact" / "scripts"
VIEWER_PATH = REPO_ROOT / "plugins" / "artifact" / "viewer" / "index.html"

if str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))

import export_artifact  # noqa: E402


# ---- helpers ----

def marker_names() -> list[str]:
    """Return the exporter's marker names, read as data.

    The slice's contract is one named entry per marker the exporter
    rewrites. An entry may be a plain name, or a record that carries one.
    Nothing in this file reads export_artifact.py's source text.
    """
    markers = getattr(export_artifact, "MARKERS", None)
    assert markers is not None, (
        "export_artifact has no MARKERS. Slice 1 requires a named marker list "
        "held as module data, one entry per marker the exporter rewrites."
    )
    names: list[str] = []
    for entry in markers:
        if isinstance(entry, str):
            names.append(entry)
        elif isinstance(entry, dict):
            names.append(entry["name"])
        else:
            names.append(entry.name)
    return names


def first_marker_name() -> str:
    names = marker_names()
    assert names, "the exporter's marker list is empty"
    return names[0]


def write_minimal_bundle(tmp_path: Path, viewer_html: str) -> tuple[Path, Path]:
    """A bundle holding only the two files the export path needs.

    No bundle.json, so the compatibility gate stays silent. No hero PNGs,
    so the image path never runs and Pillow is never imported.
    """
    bundle = tmp_path / "bundle"
    (bundle / "viewer").mkdir(parents=True)
    (bundle / "viewer" / "index.html").write_text(viewer_html)
    (bundle / "data").mkdir(parents=True)
    story = {"meta": {"repo": "fixture"}, "timeline": [{"pr": 1, "title": "fixture"}]}
    (bundle / "data" / "story.json").write_text(json.dumps(story))
    # Inside the bundle, like the default --out-dir: the exporter reports each
    # export path relative to the bundle dir.
    return bundle, bundle / "exports"


def run_exporter(bundle: Path, out_dir: Path, monkeypatch) -> int | None:
    """Run main() against this bundle. Returns the exit code, or None on a clean run."""
    monkeypatch.setattr(
        sys,
        "argv",
        [
            "export_artifact.py",
            "--bundle-dir",
            str(bundle),
            "--out-dir",
            str(out_dir),
            "--prs",
            "1",
        ],
    )
    try:
        export_artifact.main()
    except SystemExit as exc:
        return exc.code if exc.code is not None else 0
    return None


def build(viewer_html: str) -> str:
    """Call build_html through its own viewer seam, with empty data."""
    return export_artifact.build_html(
        viewer_html,
        {},  # story_obj
        {},  # manifest_obj
        None,  # diffs_js
        {},  # adrs_obj
        {},  # diagrams_obj
        {},  # designs_obj
        {},  # assets_map
        {},  # audio_map
        "fixture page",  # page_title
        None,  # inline_mermaid_js
    )


# ---- 1. the exporter exposes a named marker list as data ----

def test_exporter_exposes_a_named_marker_list_as_data():
    markers = export_artifact.MARKERS
    assert not isinstance(markers, str), (
        "the marker list must be data the caller can read, not a blob of source text"
    )
    assert len(list(markers)) > 0, "the exporter rewrites the viewer, so its marker list is not empty"


def test_marker_entries_carry_unique_non_empty_names():
    names = marker_names()
    assert names, "the marker list carries no names"
    for name in names:
        assert isinstance(name, str) and name.strip(), f"marker name {name!r} is empty"
    assert len(names) == len(set(names)), f"marker names repeat: {names}"


# ---- 2. every name appears in the built viewer (C3) ----

def test_every_marker_name_appears_in_the_built_viewer():
    viewer = VIEWER_PATH.read_text()
    missing = [name for name in marker_names() if name not in viewer]
    assert missing == [], (
        f"the built viewer lacks these marker names, so no publish can run: {missing}"
    )


# ---- 3. a missing marker stops the exporter (C2) ----

def test_renaming_one_marker_in_the_viewer_stops_the_export(tmp_path, monkeypatch, capsys):
    name = first_marker_name()
    viewer = VIEWER_PATH.read_text()
    assert name in viewer, f"this test renames {name!r}, so the viewer must carry it"
    renamed = viewer.replace(name, f"renamed-{name}")
    marker = next(m for m in export_artifact.MARKERS if m["name"] == name)
    assert marker["begin"] not in renamed and marker["end"] not in renamed, (
        "the rename must remove the marker pair, or the exporter has nothing to stop on"
    )

    bundle, out_dir = write_minimal_bundle(tmp_path, renamed)
    code = run_exporter(bundle, out_dir, monkeypatch)
    captured = capsys.readouterr()
    said = captured.err + captured.out

    assert code not in (0, None), f"the export must stop on a missing marker, got exit {code!r}"
    assert name in said, (
        f"the message must name the missing marker {name!r}.\nmessage was: {said}"
    )
    assert not (out_dir / "pr-1.html").exists(), "no half-rewritten file may reach disk"


def test_build_html_stops_on_a_missing_marker(capsys):
    name = first_marker_name()
    viewer = VIEWER_PATH.read_text()
    assert name in viewer, f"this test renames {name!r}, so the viewer must carry it"
    renamed = viewer.replace(name, f"renamed-{name}")

    with pytest.raises((SystemExit, Exception)) as excinfo:
        build(renamed)

    captured = capsys.readouterr()
    said = captured.err + captured.out + str(excinfo.value)
    assert name in said, f"the message must name the missing marker {name!r}.\nmessage was: {said}"


# ---- 4. a present marker set lets the exporter run ----

def test_the_unmodified_viewer_exports_without_error(tmp_path, monkeypatch, capsys):
    bundle, out_dir = write_minimal_bundle(tmp_path, VIEWER_PATH.read_text())

    code = run_exporter(bundle, out_dir, monkeypatch)
    captured = capsys.readouterr()

    assert code is None, (
        f"the exporter must run against the unmodified viewer.\n"
        f"exit={code!r}\nstderr={captured.err}"
    )
    out_path = out_dir / "pr-1.html"
    assert out_path.exists(), "the export must write its page"
    assert "window.STORY" in out_path.read_text(), "the rewrite must reach the page"


def test_a_data_change_inside_a_marker_region_does_not_stop_the_export(tmp_path, monkeypatch, capsys):
    """C2's real point: the exporter matches a name, not a literal between markers.

    The hero `<img>` src is data the exporter rewrites, so a marker must span
    it. A change to the data inside that span must not stop the export.
    """
    viewer = VIEWER_PATH.read_text()
    old_hero = 'src="../assets/pr-${prNum}/level-${levelIdx}.webp"'
    assert old_hero in viewer, "this test mutates the hero <img> src, so the viewer must carry it"
    mutated = viewer.replace(old_hero, 'src="../assets/pr-${prNum}/level-${levelIdx}.png"')

    bundle, out_dir = write_minimal_bundle(tmp_path, mutated)
    code = run_exporter(bundle, out_dir, monkeypatch)
    captured = capsys.readouterr()

    assert code is None, (
        f"a change inside a marker's data must not stop the export.\n"
        f"exit={code!r}\nstderr={captured.err}"
    )
    assert (out_dir / "pr-1.html").exists()
