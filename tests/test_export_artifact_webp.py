"""export_artifact.py must discover and compress .webp hero assets.

Run with: uv run --with pytest --with pillow pytest tests/test_export_artifact_webp.py -v
"""
from __future__ import annotations

import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
SCRIPTS_DIR = REPO_ROOT / "plugins" / "cobuilder-artifact" / "scripts"

if str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))

import export_artifact  # noqa: E402


def test_discover_hero_pngs_finds_webp_files(tmp_path: Path):
    bundle_dir = tmp_path / "bundle"
    pr_dir = bundle_dir / "assets" / "pr-3"
    pr_dir.mkdir(parents=True)
    (pr_dir / "level-2.webp").write_bytes(b"x")
    (pr_dir / "level-1.webp").write_bytes(b"x")
    (pr_dir / "level-1.png").write_bytes(b"stale, must be ignored")

    found = export_artifact.discover_hero_pngs(bundle_dir, 3)

    assert [p.name for p in found] == ["level-1.webp", "level-2.webp"]


def test_compress_webp_to_jpeg_round_trips(tmp_path: Path):
    from PIL import Image

    webp_path = tmp_path / "level-1.webp"
    Image.new("RGB", (20, 20), (1, 2, 3)).save(webp_path, "WEBP", quality=90)

    jpeg_bytes = export_artifact.compress_png_to_jpeg(webp_path, width=10, quality=70)

    out = Image.open(__import__("io").BytesIO(jpeg_bytes))
    assert out.format == "JPEG"
    assert out.width == 10
