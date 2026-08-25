"""Tests for shared/_manifest.py and dynamic plugin name resolution in shared/.

Verifies that shared/_manifest.py resolves plugin identity dynamically via
_bundle_meta.read_plugin_name() instead of hardcoding a specific plugin name.

Run with: uv run --with pytest pytest tests/ -v
"""
from __future__ import annotations

import ast
from pathlib import Path
from unittest.mock import patch

REPO_ROOT = Path(__file__).resolve().parent.parent
SHARED_DIR = REPO_ROOT / "shared"


def test_manifest_module_uses_read_plugin_name():
    """_manifest.py must import and call read_plugin_name()."""
    manifest_source = (SHARED_DIR / "_manifest.py").read_text()
    tree = ast.parse(manifest_source)

    # Verify no top-level hardcoded PLUGIN_NAME constant assignment
    for node in tree.body:
        if isinstance(node, ast.Assign):
            for target in node.targets:
                if isinstance(target, ast.Name) and target.id == "PLUGIN_NAME":
                    pytest.fail("_manifest.py still defines a top-level PLUGIN_NAME constant")

    assert "read_plugin_name" in manifest_source, (
        "_manifest.py must reference read_plugin_name"
    )


def test_rewrite_manifest_passes_dynamic_plugin_name(tmp_path: Path):
    """rewrite_manifest passes the result of read_plugin_name() to require_compatible()."""
    import sys

    # Ensure shared is on sys.path
    if str(SHARED_DIR) not in sys.path:
        sys.path.insert(0, str(SHARED_DIR))

    import _manifest

    bundle_dir = tmp_path / "bundle"
    data_dir = bundle_dir / "data"
    data_dir.mkdir(parents=True)
    manifest_path = data_dir / "manifest.js"

    recorded_plugins: list[str] = []

    def mock_require_compatible(bdir, plugin):
        recorded_plugins.append(plugin)

    with (
        patch("_manifest.read_plugin_name", return_value="custom-test-plugin"),
        patch("_manifest.require_compatible", side_effect=mock_require_compatible),
    ):
        _manifest.rewrite_manifest(bundle_dir, manifest_path)

    assert recorded_plugins == ["custom-test-plugin"], (
        f"rewrite_manifest should pass dynamically resolved plugin name, got {recorded_plugins}"
    )
    assert manifest_path.exists(), "manifest.js should be written"


def test_shared_python_files_do_not_hardcode_plugin_name_constants():
    """No Python file in shared/ should define a static PLUGIN_NAME constant."""
    for py_file in SHARED_DIR.glob("*.py"):
        tree = ast.parse(py_file.read_text())
        for node in tree.body:
            if isinstance(node, ast.Assign):
                for target in node.targets:
                    if isinstance(target, ast.Name) and target.id == "PLUGIN_NAME":
                        raise AssertionError(
                            f"{py_file.name} defines a hardcoded PLUGIN_NAME constant"
                        )


def test_rewrite_manifest_discovers_webp_hero_assets(tmp_path: Path):
    """rewrite_manifest must list .webp hero assets, not .png."""
    import sys

    if str(SHARED_DIR) not in sys.path:
        sys.path.insert(0, str(SHARED_DIR))

    import _manifest
    import json as _json

    bundle_dir = tmp_path / "bundle"
    data_dir = bundle_dir / "data"
    data_dir.mkdir(parents=True)
    manifest_path = data_dir / "manifest.js"

    pr_dir = bundle_dir / "assets" / "pr-7"
    pr_dir.mkdir(parents=True)
    (pr_dir / "level-1.webp").write_bytes(b"fake-webp-bytes")
    (pr_dir / "level-2.webp").write_bytes(b"fake-webp-bytes")
    (pr_dir / "level-1.png").write_bytes(b"stale-png-should-be-ignored")

    with patch("_manifest.require_compatible"):
        _manifest.rewrite_manifest(bundle_dir, manifest_path)

    text = manifest_path.read_text()
    prefix = "window.ODYSSEY = "
    payload = _json.loads(text[len(prefix):text.rindex(";")])

    assert payload["hero"] == ["pr-7/level-1.webp", "pr-7/level-2.webp"]
