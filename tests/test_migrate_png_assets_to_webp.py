"""migrate_png_assets_to_webp.py converts a bundle's PNG hero assets to WebP.

Run with: uv run --with pytest --with pillow pytest tests/test_migrate_png_assets_to_webp.py -v
"""
from __future__ import annotations

import sys
from pathlib import Path
from unittest.mock import patch

REPO_ROOT = Path(__file__).resolve().parent.parent
SHARED_DIR = REPO_ROOT / "shared"

if str(SHARED_DIR) not in sys.path:
    sys.path.insert(0, str(SHARED_DIR))


def test_convert_bundle_assets_replaces_png_with_webp(tmp_path: Path):
    from PIL import Image
    import migrate_png_assets_to_webp as migrate

    bundle_dir = tmp_path / "bundle"
    pr_dir = bundle_dir / "assets" / "pr-2"
    pr_dir.mkdir(parents=True)
    for i in (1, 2, 3):
        Image.new("RGB", (8, 8), (i, i, i)).save(pr_dir / f"level-{i}.png", "PNG")

    with patch("migrate_png_assets_to_webp.rewrite_manifest") as mock_rewrite:
        written = migrate.convert_bundle_assets(bundle_dir, quality=90)

    assert sorted(p.name for p in written) == ["level-1.webp", "level-2.webp", "level-3.webp"]
    for i in (1, 2, 3):
        assert not (pr_dir / f"level-{i}.png").exists()
        assert (pr_dir / f"level-{i}.webp").exists()
        out = Image.open(pr_dir / f"level-{i}.webp")
        assert out.format == "WEBP"
    mock_rewrite.assert_called_once_with(bundle_dir, bundle_dir / "data" / "manifest.js")


def test_convert_bundle_assets_no_assets_dir_is_a_noop(tmp_path: Path):
    import migrate_png_assets_to_webp as migrate

    bundle_dir = tmp_path / "empty-bundle"
    with patch("migrate_png_assets_to_webp.rewrite_manifest") as mock_rewrite:
        written = migrate.convert_bundle_assets(bundle_dir, quality=90)

    assert written == []
    mock_rewrite.assert_not_called()
