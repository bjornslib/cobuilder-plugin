"""Slice tables for test_viewer_habit_clean.py.

SLICES lists the files that a slice names. SLICE_GLOBS lists globs for files
that the slice may add next to them. Both use repo-relative paths. A later
slice adds one key to each table.
"""
from __future__ import annotations

VIEWER = "plugins/artifact/viewer"
SHELL = f"{VIEWER}/src/shell"


def _globs(*folders: str) -> list[str]:
    return [f"{folder}/**/*{ext}" for folder in folders for ext in (".ts", ".tsx")]


SLICES: dict[int, list[str]] = {
    1: [
        f"{VIEWER}/src/data/bundle.ts",
        f"{VIEWER}/src/data/joins.ts",
        f"{VIEWER}/src/data/types.ts",
        f"{VIEWER}/src/data/works.ts",
        f"{VIEWER}/src/shell/model.ts",
    ],
    2: [
        f"{SHELL}/atoms.tsx",
        f"{SHELL}/sections.tsx",
        f"{SHELL}/panels/Architecture.tsx",
        f"{SHELL}/panels/Intent.tsx",
        f"{SHELL}/panels/ProblemSolution.tsx",
    ],
}
SLICE_GLOBS: dict[int, list[str]] = {
    1: _globs(f"{VIEWER}/src/data", f"{SHELL}/model"),
    2: _globs(f"{SHELL}/atoms", f"{SHELL}/sections", f"{SHELL}/panels"),
}
