"""verify_bundle.py's per-PR asset check must look for .webp files.

Run with: uv run --with pytest pytest tests/test_verify_bundle_webp.py -v
"""
from __future__ import annotations

import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
SHARED_DIR = REPO_ROOT / "shared"

if str(SHARED_DIR) not in sys.path:
    sys.path.insert(0, str(SHARED_DIR))

import verify_bundle  # noqa: E402


def test_check_pr_finds_webp_assets(tmp_path: Path):
    bundle_dir = tmp_path / "bundle"
    pr_dir = bundle_dir / "assets" / "pr-9"
    pr_dir.mkdir(parents=True)
    for i in (1, 2, 3):
        (pr_dir / f"level-{i}.webp").write_bytes(b"x" * (verify_bundle.MIN_ASSET_BYTES + 1))

    story = {"timeline": [{"pr": 9, "levels": {}, "adrs": []}]}
    results = verify_bundle.check_pr(bundle_dir, story, adrs=None, pr_num=9)

    assert results["asset.level-1"] == "ok"
    assert results["asset.level-2"] == "ok"
    assert results["asset.level-3"] == "ok"


def test_check_pr_reports_missing_when_only_png_present(tmp_path: Path):
    """A stale .png left over from before the WebP switch must not count as present."""
    bundle_dir = tmp_path / "bundle"
    pr_dir = bundle_dir / "assets" / "pr-9"
    pr_dir.mkdir(parents=True)
    (pr_dir / "level-1.png").write_bytes(b"x" * (verify_bundle.MIN_ASSET_BYTES + 1))

    story = {"timeline": [{"pr": 9, "levels": {}, "adrs": []}]}
    results = verify_bundle.check_pr(bundle_dir, story, adrs=None, pr_num=9)

    assert results["asset.level-1"] == "missing"
