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
    3: [
        f"{SHELL}/change/Diff.tsx",
        f"{SHELL}/change/Frame.tsx",
        f"{SHELL}/change/Sheets.tsx",
        f"{SHELL}/change/levels.ts",
        f"{SHELL}/change/sections.tsx",
        f"{SHELL}/DiagramTiles.tsx",
        f"{SHELL}/Pager.tsx",
    ],
    4: [
        f"{VIEWER}/src/App.tsx",
        f"{VIEWER}/src/components/work/DesignCard.tsx",
        f"{VIEWER}/src/components/work/StageBadge.tsx",
        f"{VIEWER}/src/components/work/WorkBoard.tsx",
        f"{VIEWER}/src/hooks/use-mobile.ts",
        f"{SHELL}/App.tsx",
        f"{SHELL}/InShort.tsx",
        f"{SHELL}/Rail.tsx",
        f"{SHELL}/Sheet.tsx",
        f"{SHELL}/TopBar.tsx",
        f"{SHELL}/WorkDrawer.tsx",
        f"{SHELL}/jump.tsx",
        f"{SHELL}/markdown.tsx",
        f"{SHELL}/hooks.ts",
        f"{SHELL}/readiness.ts",
        f"{SHELL}/workDeck.ts",
        f"{VIEWER}/vite.config.ts",
    ],
}
SLICE_GLOBS: dict[int, list[str]] = {
    1: _globs(f"{VIEWER}/src/data", f"{SHELL}/model"),
    2: _globs(f"{SHELL}/atoms", f"{SHELL}/sections", f"{SHELL}/panels"),
    3: _globs(f"{SHELL}/change", f"{SHELL}/diagramTiles", f"{SHELL}/pager"),
    4: [
        *_globs(SHELL, f"{VIEWER}/src/components/work", f"{VIEWER}/src/hooks"),
        f"{VIEWER}/src/*.tsx",
        f"{VIEWER}/vite.config.ts",
    ],
}
