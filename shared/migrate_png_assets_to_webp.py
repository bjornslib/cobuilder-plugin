#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = [
#     "pillow>=10.0.0,<13",
# ]
# ///
"""One-off migration: re-encode a bundle's PNG hero assets as WebP q90.

This is not part of the regular generation pipeline (generate_prompts.py
already writes WebP directly after the WebP-scene-art change). Run this
once per bundle that still carries PNGs left over from before that change:

    uv run migrate_png_assets_to_webp.py --bundle-dir <path>

It converts every assets/pr-*/level-*.png to level-*.webp at the given
quality (default 90), deletes the source PNG on success, and rewrites
manifest.js so the hero list matches the new filenames. It never touches
files that are not named level-<N>.png.
"""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _manifest import rewrite_manifest

LEVEL_PNG_RE = re.compile(r"level-(\d+)\.png$")


def convert_bundle_assets(bundle_dir: Path, quality: int = 90) -> list[Path]:
    """Convert every assets/pr-*/level-N.png under bundle_dir to WebP.

    Returns the list of .webp paths written. Deletes each source .png after
    a successful re-encode. Calls rewrite_manifest() once at the end if any
    file was converted, so manifest.js's hero list matches the new
    filenames. A bundle with no assets/ directory is a no-op.
    """
    from PIL import Image

    assets_dir = bundle_dir / "assets"
    written: list[Path] = []
    if not assets_dir.is_dir():
        return written

    for pr_dir in sorted(assets_dir.glob("pr-*")):
        if not pr_dir.is_dir():
            continue
        for png_path in sorted(pr_dir.glob("level-*.png")):
            if not LEVEL_PNG_RE.match(png_path.name):
                continue
            webp_path = png_path.with_suffix(".webp")
            image = Image.open(png_path)
            if image.mode not in ("RGB",):
                image = image.convert("RGB")
            image.save(webp_path, "WEBP", quality=quality)
            png_path.unlink()
            written.append(webp_path)
            print(f"converted {png_path.name} -> {webp_path.name} ({webp_path.stat().st_size} bytes)")

    if written:
        manifest_path = bundle_dir / "data" / "manifest.js"
        rewrite_manifest(bundle_dir, manifest_path)
        print(f"rewrote {manifest_path}")

    return written


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--bundle-dir", required=True, help="bundle directory to migrate, e.g. .cobuilder-architect/self")
    parser.add_argument("--quality", type=int, default=90, help="WebP quality (default: 90)")
    args = parser.parse_args()

    bundle_dir = Path(args.bundle_dir).resolve()
    if not bundle_dir.is_dir():
        print(f"error: {bundle_dir} is not a directory", file=sys.stderr)
        sys.exit(1)

    written = convert_bundle_assets(bundle_dir, quality=args.quality)
    print(f"Converted {len(written)} PNG asset(s) under {bundle_dir}.")


if __name__ == "__main__":
    main()
