#!/usr/bin/env python3
"""Single source of truth for rewriting <bundle-dir>/data/manifest.js.

Imported (never executed) by the scripts that regenerate manifest.js after
touching bundle contents: extract_story.py, extract_diffs.py,
generate_prompts.py. Keeping this in one stdlib-only module means the three
callers can't drift out of sync on what window.ODYSSEY contains.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

from _bundle_meta import SCHEMA_VERSION


def rewrite_manifest(bundle_dir: Path, manifest_path: Path) -> None:
    data_dir = bundle_dir / "data"
    assets_dir = bundle_dir / "assets"

    excluded_prs = []
    if manifest_path.exists():
        try:
            text = manifest_path.read_text()
            prefix = "window.ODYSSEY = "
            start = text.index(prefix) + len(prefix)
            end = text.rindex(";")
            existing = json.loads(text[start:end])
            excluded_prs = existing.get("excluded_prs", [])
        except Exception as e:
            print(
                f"warning: could not read excluded_prs from {manifest_path}: {e}\n"
                "The manifest will be rewritten with an empty excluded_prs list. "
                "If you hand-edited that field, re-apply it after this run.",
                file=sys.stderr,
            )
            excluded_prs = []

    def pr_num_from_dirname(name: str) -> int:
        m = re.match(r"pr-(\d+)$", name)
        return int(m.group(1)) if m else 0

    def level_num_from_filename(name: str) -> int:
        m = re.match(r"level-(\d+)\.png$", name)
        return int(m.group(1)) if m else 0

    def pr_level_from_diagram_filename(name: str) -> tuple[int, int]:
        m = re.match(r"pr(\d+)-level(\d+)\.mmd$", name)
        return (int(m.group(1)), int(m.group(2))) if m else (0, 0)

    hero = []
    if assets_dir.exists():
        for pr_dir in sorted(assets_dir.glob("pr-*"), key=lambda p: pr_num_from_dirname(p.name)):
            if not pr_dir.is_dir():
                continue
            for png in sorted(pr_dir.glob("level-*.png"), key=lambda p: level_num_from_filename(p.name)):
                hero.append(f"{pr_dir.name}/{png.name}")

    diff_prs = []
    if data_dir.exists():
        for diff_file in data_dir.glob("diffs-pr*.js"):
            m = re.match(r"diffs-pr(\d+)\.js", diff_file.name)
            if m:
                diff_prs.append(int(m.group(1)))
    diff_prs.sort()

    diagrams_dir = data_dir / "diagrams"
    diagrams = []
    if diagrams_dir.exists():
        for mmd in sorted(diagrams_dir.glob("pr*-level*.mmd"), key=lambda p: pr_level_from_diagram_filename(p.name)):
            diagrams.append(mmd.name)

    manifest = {
        "schema_version": SCHEMA_VERSION,
        "excluded_prs": excluded_prs,
        "hero": hero,
        "diff_prs": diff_prs,
        "diagrams": diagrams,
    }
    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    manifest_path.write_text(f"window.ODYSSEY = {json.dumps(manifest, ensure_ascii=False)};\n")
