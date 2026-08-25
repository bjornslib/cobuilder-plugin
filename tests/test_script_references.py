"""Every runnable command line naming a scripts/*.py file must name a file
that exists in scripts/. A deleted script left behind in a runnable command
breaks the procedure that reaches it. See slice-8 criterion C4.

This test scopes to command lines, not every mention of a filename, so a
historical record (an ADR, a PR description, a plan) does not fail the
build for naming a script that used to exist.

Run with: uv run --with pytest pytest tests/ -v
"""
from __future__ import annotations

import re
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent
SHARED_DIR = REPO_ROOT / "shared"
PLUGINS_DIR = REPO_ROOT / "plugins"

# A runnable command line: `uv run ... scripts/<name>.py` or
# `uv run "${CLAUDE_PLUGIN_ROOT}/scripts/<name>.py"`, or the vendored
# `.../shared/<name>.py` form, inside a fenced ```bash block or as an
# inline `uv run ...` code span.
COMMAND_RE = re.compile(
    r"uv run[^\n`]*?(?:scripts|shared)/([A-Za-z0-9_]+\.py)"
)


def plugin_dirs() -> list[Path]:
    return sorted(p for p in PLUGINS_DIR.iterdir() if p.is_dir())


def markdown_files() -> list[Path]:
    """Every markdown file under a plugin's own skills/ and commands/ dirs.

    Slice 6 gave each plugin its own root, so this scans every plugin
    rather than one shared skills/ and commands/ directory.
    """
    files: list[Path] = []
    for plugin_dir in plugin_dirs():
        for sub in ("skills", "commands"):
            root = plugin_dir / sub
            if root.exists():
                files.extend(sorted(root.rglob("*.md")))
    return files


def existing_scripts_for(md_path: Path) -> set[str]:
    """A script named by md_path's own plugin, or by shared/, may be run.

    A cross-plugin script reference (naming another plugin's scripts/) is
    not resolvable at runtime and is deliberately excluded here.
    """
    plugin_dir = md_path
    while plugin_dir != PLUGINS_DIR and plugin_dir.parent != PLUGINS_DIR:
        plugin_dir = plugin_dir.parent
    own_scripts = {p.name for p in (plugin_dir / "scripts").glob("*.py")}
    shared_scripts = {p.name for p in SHARED_DIR.glob("*.py")}
    return own_scripts | shared_scripts


@pytest.mark.parametrize("md_path", markdown_files(), ids=lambda p: str(p.relative_to(REPO_ROOT)))
def test_runnable_commands_name_existing_scripts(md_path: Path) -> None:
    text = md_path.read_text()
    existing = existing_scripts_for(md_path)
    missing = sorted(set(COMMAND_RE.findall(text)) - existing)
    assert not missing, (
        f"{md_path.relative_to(REPO_ROOT)} runs a command naming a script "
        f"that its own plugin does not ship and that shared/ does not "
        f"ship: {missing}"
    )
