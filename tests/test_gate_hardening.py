"""Slice-3 hardening tests: malformed bundle.json inputs raise
BundleIncompatible instead of a stdlib error, and every writer script
calls require_compatible() before it writes into a bundle.

Run with: uv run --with pytest pytest tests/ -v
"""
from __future__ import annotations

import sys
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent
SHARED_DIR = REPO_ROOT / "shared"
sys.path.insert(0, str(SHARED_DIR))

from _bundle_meta import BundleIncompatible, require_compatible  # noqa: E402


def _find_script(filename: str) -> Path:
    """Find filename anywhere under shared/ or a plugin's scripts/ dir."""
    for candidate in [SHARED_DIR / filename, *REPO_ROOT.glob(f"plugins/*/scripts/{filename}")]:
        if candidate.exists():
            return candidate
    raise FileNotFoundError(f"{filename} not found under shared/ or plugins/*/scripts/")


# --- point 1: malformed inputs raise BundleIncompatible, not a stdlib error ---


def test_malformed_json_raises_bundle_incompatible(tmp_path):
    (tmp_path / "bundle.json").write_text("{not valid json")
    with pytest.raises(BundleIncompatible) as excinfo:
        require_compatible(tmp_path, "cobuilder-pr")
    assert "bundle.json" in str(excinfo.value)


def test_non_string_min_reader_schema_raises_bundle_incompatible(tmp_path):
    (tmp_path / "bundle.json").write_text('{"min_reader_schema": 1.3}')
    with pytest.raises(BundleIncompatible) as excinfo:
        require_compatible(tmp_path, "cobuilder-pr")
    assert "min_reader_schema" in str(excinfo.value)


def test_list_min_reader_schema_raises_bundle_incompatible(tmp_path):
    (tmp_path / "bundle.json").write_text('{"min_reader_schema": [1, 3]}')
    with pytest.raises(BundleIncompatible):
        require_compatible(tmp_path, "cobuilder-pr")


# --- point 3: a malformed `generators` value is preserved, not discarded ---


def test_stamp_generator_preserves_malformed_list(tmp_path):
    from _bundle_meta import stamp_generator
    import json

    (tmp_path / "bundle.json").write_text('{"generators": ["oops", "a list"]}')
    stamp_generator(tmp_path, "cobuilder-pr", "0.6.0")

    bundle_meta = json.loads((tmp_path / "bundle.json").read_text())
    assert bundle_meta["generators"]["cobuilder-pr"] == "0.6.0"
    assert bundle_meta["generators"]["_prior"] == ["oops", "a list"]


def test_stamp_generator_preserves_malformed_string(tmp_path):
    from _bundle_meta import stamp_generator
    import json

    (tmp_path / "bundle.json").write_text('{"generators": "not-a-map"}')
    stamp_generator(tmp_path, "cobuilder-pr", "0.6.0")

    bundle_meta = json.loads((tmp_path / "bundle.json").read_text())
    assert bundle_meta["generators"]["cobuilder-pr"] == "0.6.0"
    assert bundle_meta["generators"]["_prior"] == "not-a-map"


# --- point 2: every writer calls require_compatible() before it writes ---

# Every script that writes content into a bundle directory. A script here
# must contain a `require_compatible(` call. This is deliberately a crude
# source scan, not a behavioral test: it exists to catch a writer added (or
# edited) later that forgets to wire the gate, not to verify the gate's
# logic (see test_bundle_meta.py and test_gate_hardening.py's other cases
# for that).
WRITER_SCRIPTS = [
    "extract_story.py",
    "extract_diffs.py",
    "generate_prompts.py",
    "generate_audio.py",
    "export_artifact.py",
    "export_index.py",
    "record_publish.py",
    "build_index.py",
    "build_diagrams.py",
    "_manifest.py",
]


@pytest.mark.parametrize("filename", WRITER_SCRIPTS)
def test_writer_calls_require_compatible(filename):
    source = _find_script(filename).read_text()
    assert "require_compatible(" in source, (
        f"{filename} writes into a bundle but never calls require_compatible(). "
        "Add the gate call as the first statement after argument parsing."
    )
    assert "from _bundle_meta import" in source or "import _bundle_meta" in source
