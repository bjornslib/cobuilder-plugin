"""Slices 6 and 7 may change comments in the viewer. They may not change code.

tests/fixtures/viewer_code_hashes.json maps each viewer code file to the
sha256 of its esbuild-minified output from before slice 6. Minified output
holds no comment, so a comment edit keeps the hash and a code edit changes it.
The guard passes now and must keep passing.
"""
from __future__ import annotations

import json
import shutil
import subprocess
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
VIEWER = ROOT / "plugins/artifact/viewer"
HASHER = Path(__file__).parent / "support/viewer_code_hash.mjs"
BASELINE = json.loads((Path(__file__).parent / "fixtures/viewer_code_hashes.json").read_text())

pytestmark = pytest.mark.skipif(
    not (VIEWER / "node_modules").exists() or shutil.which("node") is None,
    reason="the viewer node_modules or node is missing",
)


def minified_hashes(viewer: Path) -> dict[str, str]:
    run = subprocess.run(
        ["node", str(HASHER), str(viewer)], capture_output=True, text=True, timeout=120, check=True
    )
    return json.loads(run.stdout)


def differences(baseline: dict[str, str], now: dict[str, str]) -> list[str]:
    changed = [f"changed: {p}" for p in sorted(baseline.keys() & now.keys()) if baseline[p] != now[p]]
    added = [f"added: {p}" for p in sorted(now.keys() - baseline.keys())]
    deleted = [f"deleted: {p}" for p in sorted(baseline.keys() - now.keys())]
    return changed + added + deleted


def scratch_viewer(tmp_path: Path, files: dict[str, str]) -> Path:
    viewer = tmp_path / "viewer"
    viewer.mkdir(parents=True)
    (viewer / "package.json").write_text("{}")
    (viewer / "node_modules").symlink_to(VIEWER / "node_modules")
    for rel, text in files.items():
        target = viewer / rel
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(text)
    return viewer


def test_viewer_code_is_unchanged_by_comment_work():
    problems = differences(BASELINE, minified_hashes(VIEWER))
    assert not problems, "viewer code changed, and only comments may change:\n" + "\n".join(problems)


def test_hash_ignores_comments_and_keeps_code(tmp_path):
    code = "export const a = 1;\nexport function f(x: number) {\n  return x + a;\n}\n"
    commented = "// the first constant\n" + code.replace("return", "/* sum */ return")
    changed = code.replace("x + a", "x - a")
    base = minified_hashes(scratch_viewer(tmp_path / "base", {"src/a.ts": code}))
    note = minified_hashes(scratch_viewer(tmp_path / "note", {"src/a.ts": commented}))
    edit = minified_hashes(scratch_viewer(tmp_path / "edit", {"src/a.ts": changed}))
    assert differences(base, note) == []
    assert differences(base, edit) == ["changed: src/a.ts"]


def test_hash_reports_added_and_deleted_files(tmp_path):
    base = minified_hashes(scratch_viewer(tmp_path / "base", {"src/a.ts": "export const a = 1;"}))
    other = minified_hashes(scratch_viewer(tmp_path / "other", {"src/b.tsx": "export const b = 1;"}))
    assert differences(base, other) == ["added: src/b.tsx", "deleted: src/a.ts"]
