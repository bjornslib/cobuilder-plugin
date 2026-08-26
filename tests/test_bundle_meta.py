"""Tests for scripts/_bundle_meta.py: the ADR-0017 compatibility gate.

Run with: uv run --with pytest pytest tests/ -v
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "shared"))

import _bundle_meta  # noqa: E402
from _bundle_meta import (  # noqa: E402
    BundleIncompatible,
    require_compatible,
    stamp_generator,
)


def write_bundle_json(bundle_dir: Path, data: dict) -> None:
    (bundle_dir / "bundle.json").write_text(json.dumps(data))


# --- C1: a bundle demanding a newer reader schema raises ---


def test_newer_min_reader_schema_raises(tmp_path):
    write_bundle_json(tmp_path, {"min_reader_schema": "1.99"})
    with pytest.raises(BundleIncompatible) as excinfo:
        require_compatible(tmp_path, "pr")
    message = str(excinfo.value)
    assert "1.99" in message
    assert _bundle_meta.SCHEMA_VERSION in message


def test_equal_min_reader_schema_passes(tmp_path):
    write_bundle_json(tmp_path, {"min_reader_schema": _bundle_meta.SCHEMA_VERSION})
    require_compatible(tmp_path, "pr")


def test_version_comparison_is_numeric_not_string(tmp_path, monkeypatch):
    """"1.10" must compare newer than "1.9", which a string comparison gets wrong."""
    monkeypatch.setattr(_bundle_meta, "SCHEMA_VERSION", "1.9")
    write_bundle_json(tmp_path, {"min_reader_schema": "1.10"})
    with pytest.raises(BundleIncompatible):
        require_compatible(tmp_path, "pr")


def test_version_comparison_older_dotted_passes(tmp_path, monkeypatch):
    monkeypatch.setattr(_bundle_meta, "SCHEMA_VERSION", "1.10")
    write_bundle_json(tmp_path, {"min_reader_schema": "1.9"})
    require_compatible(tmp_path, "pr")


# --- C2: a newer bundle_format is refused ---


def test_newer_bundle_format_raises(tmp_path):
    write_bundle_json(
        tmp_path, {"bundle_format": _bundle_meta.CURRENT_BUNDLE_FORMAT + 1}
    )
    with pytest.raises(BundleIncompatible) as excinfo:
        require_compatible(tmp_path, "pr")
    message = str(excinfo.value)
    assert str(_bundle_meta.CURRENT_BUNDLE_FORMAT + 1) in message
    assert str(_bundle_meta.CURRENT_BUNDLE_FORMAT) in message


def test_equal_bundle_format_passes(tmp_path):
    write_bundle_json(
        tmp_path, {"bundle_format": _bundle_meta.CURRENT_BUNDLE_FORMAT}
    )
    require_compatible(tmp_path, "pr")


# --- C3: a missing bundle.json is a new bundle, and passes ---


def test_missing_bundle_json_passes_silently(tmp_path):
    assert not (tmp_path / "bundle.json").exists()
    require_compatible(tmp_path, "pr")


# --- C4: stamping one plugin preserves another plugin's entry ---


def test_stamp_generator_preserves_other_plugin(tmp_path):
    write_bundle_json(
        tmp_path, {"generators": {"artifact": "0.5.0"}}
    )
    stamp_generator(tmp_path, "pr", "0.6.0")

    bundle_meta = json.loads((tmp_path / "bundle.json").read_text())
    assert bundle_meta["generators"] == {
        "artifact": "0.5.0",
        "pr": "0.6.0",
    }


def test_stamp_generator_overwrites_own_prior_entry(tmp_path):
    write_bundle_json(tmp_path, {"generators": {"pr": "0.1.0"}})
    stamp_generator(tmp_path, "pr", "0.2.0")

    bundle_meta = json.loads((tmp_path / "bundle.json").read_text())
    assert bundle_meta["generators"] == {"pr": "0.2.0"}


def test_stamp_generator_keeps_old_scalar_field(tmp_path):
    """An old bundle.json may still hold the scalar generator_version field
    instead of a generators map. Stamping must not discard it."""
    write_bundle_json(tmp_path, {"generator_version": "0.3.0"})
    stamp_generator(tmp_path, "pr", "0.6.0")

    bundle_meta = json.loads((tmp_path / "bundle.json").read_text())
    assert bundle_meta["generator_version"] == "0.3.0"
    assert bundle_meta["generators"] == {"pr": "0.6.0"}


def test_stamp_generator_creates_bundle_json_when_missing(tmp_path):
    assert not (tmp_path / "bundle.json").exists()
    stamp_generator(tmp_path, "pr", "0.6.0")

    bundle_meta = json.loads((tmp_path / "bundle.json").read_text())
    assert bundle_meta["generators"] == {"pr": "0.6.0"}
