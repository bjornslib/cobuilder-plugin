"""Tests for plugins/*/commands/*.md: every command must dispatch to a mode
a skill declares, and no two commands in the same plugin may dispatch to the
identical skill and mode.

Slice 6 split one `commands/` directory into one per plugin. The rename
collision from slice 4 (`commands/odyssey-review.md`) is undone: each of
`cobuilder-architect` and `cobuilder-pr` now ships its own `commands/review.md`
in its own directory, so the two no longer collide on disk.

Run with: uv run --with pytest pytest tests/ -v
"""
from __future__ import annotations

import re
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent
PLUGINS_DIR = REPO_ROOT / "plugins"

DISPATCH_RE = re.compile(r'Skill\(\s*"([\w-]+)"\s*,\s*args\s*=\s*"(\S+)')
MODE_HEADING_RE = re.compile(r'^#{1,6}\s+(\S+)\s+[Mm]ode\b')


def plugin_dirs() -> list[Path]:
    return sorted(p for p in PLUGINS_DIR.iterdir() if p.is_dir())


def command_files() -> list[Path]:
    files: list[Path] = []
    for plugin_dir in plugin_dirs():
        commands_dir = plugin_dir / "commands"
        if commands_dir.exists():
            files.extend(sorted(commands_dir.glob("*.md")))
    return files


def extract_dispatch(command_path: Path) -> tuple[str, str]:
    """Read a command file and return (skill, mode) from its Skill(...) call.

    Fails the test with a clear message if no dispatch line is found.
    """
    text = command_path.read_text()
    match = DISPATCH_RE.search(text)
    assert match is not None, f"{command_path.name} has no Skill(...) dispatch line"
    skill_name, mode_token = match.group(1), match.group(2)
    return skill_name, mode_token


def _skill_dir(plugin_dir: Path, skill_name: str) -> Path:
    direct = plugin_dir / "skills" / skill_name
    if direct.exists():
        return direct
    matches = list(plugin_dir.glob(f"skills/*/{skill_name}"))
    return direct


def declared_modes_for_command(command_path: Path, skill_name: str) -> set[str]:
    """Return the mode names the command's own plugin's skill declares."""
    plugin_dir = command_path.resolve().parent.parent
    skill_md = _skill_dir(plugin_dir, skill_name) / "SKILL.md"
    assert skill_md.exists(), (
        f"No SKILL.md found for skill '{skill_name}' under {plugin_dir.name}"
    )
    modes = set()
    for line in skill_md.read_text().splitlines():
        match = MODE_HEADING_RE.match(line.strip())
        if match:
            modes.add(match.group(1).lower())
    return modes


# --- C1: every command dispatches to a mode its own plugin's skill declares ---


@pytest.mark.parametrize(
    "command_path", command_files(),
    ids=lambda p: f"{p.parent.parent.name}/{p.name}",
)
def test_command_dispatches_to_a_declared_mode(command_path):
    skill_name, mode_token = extract_dispatch(command_path)
    modes = declared_modes_for_command(command_path, skill_name)
    assert mode_token in modes, (
        f"{command_path.name} dispatches Skill(\"{skill_name}\", "
        f"args=\"{mode_token} ...\"), but skill '{skill_name}' declares "
        f"modes {sorted(modes)}, which does not include '{mode_token}'"
    )


# --- C2: the duplicate command is gone from every plugin ---


def test_explore_design_command_does_not_exist():
    for plugin_dir in plugin_dirs():
        assert not (plugin_dir / "commands" / "explore-design.md").exists()


def test_odyssey_review_command_name_exists_nowhere():
    for plugin_dir in plugin_dirs():
        assert not (plugin_dir / "commands" / "odyssey-review.md").exists()


# --- C1 regression guard: no two commands in the same plugin share a
# skill+mode pair. Two plugins each shipping their own review.md is
# expected and is not a collision, since each carries its own commands/. ---


def test_no_two_commands_in_the_same_plugin_dispatch_identically():
    for plugin_dir in plugin_dirs():
        commands_dir = plugin_dir / "commands"
        if not commands_dir.exists():
            continue
        seen: dict[tuple[str, str], str] = {}
        for command_path in sorted(commands_dir.glob("*.md")):
            skill_name, mode_token = extract_dispatch(command_path)
            key = (skill_name, mode_token)
            assert key not in seen, (
                f"{command_path.name} and {seen[key]} in {plugin_dir.name} "
                f'both dispatch Skill("{skill_name}", args="{mode_token} ...")'
            )
            seen[key] = command_path.name


# --- Sanity: cobuilder-pr and cobuilder-architect each ship their own
# review.md, both resolving as separate commands (rubric C6) ---


def test_cobuilder_pr_ships_its_own_review_command():
    path = PLUGINS_DIR / "cobuilder-pr" / "commands" / "review.md"
    assert path.exists(), "cobuilder-pr must ship commands/review.md"
    skill_name, mode_token = extract_dispatch(path)
    assert (skill_name, mode_token) == ("odyssey", "review")


def test_cobuilder_architect_ships_its_own_review_command():
    path = PLUGINS_DIR / "cobuilder-architect" / "commands" / "review.md"
    assert path.exists(), "cobuilder-architect must ship commands/review.md"
    skill_name, mode_token = extract_dispatch(path)
    assert (skill_name, mode_token) == ("architecture", "review")


def test_generate_command_dispatches_odyssey_generate_mode():
    path = PLUGINS_DIR / "cobuilder-pr" / "commands" / "generate.md"
    skill_name, mode_token = extract_dispatch(path)
    assert (skill_name, mode_token) == ("odyssey", "generate")


def test_architecture_skill_declares_exactly_six_modes():
    modes = declared_modes_for_command(
        PLUGINS_DIR / "cobuilder-architect" / "commands" / "review.md", "architecture"
    )
    assert modes == {
        "design",
        "review",
        "maintenance",
        "decisions",
        "describe",
        "debug",
    }


def test_odyssey_review_name_appears_nowhere_in_prose():
    """The temporary command name from slice 4 must be gone entirely,
    not just renamed on disk. See rubric slice-6 C6."""
    hits = []
    for md_path in REPO_ROOT.rglob("*.md"):
        if ".git" in md_path.parts or ".cobuilder-architect" in md_path.parts:
            continue
        rel = str(md_path.relative_to(REPO_ROOT))
        if rel.startswith("docs/plans") or rel.startswith(".cobuilder/rubrics"):
            continue  # historical record, not live prose
        text = md_path.read_text(errors="ignore")
        if "odyssey-review" in text:
            hits.append(str(md_path.relative_to(REPO_ROOT)))
    assert not hits, f"'odyssey-review' still appears in: {hits}"
