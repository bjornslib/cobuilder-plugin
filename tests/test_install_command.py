"""Slice 6 of cobuilder-memory: one install command sets up the family, and the
cobuilder-setup skill names every Hindsight tool that the allow rules must list.

These are reference and structure checks: a file must exist, a section heading
must appear in order, a tool name in one file must appear in another. They do
not test the wording of the procedure.
"""

import re
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
UMBRELLA_INSTALL = ROOT / "plugins/cobuilder-full-lifecycle/commands/install.md"
SETUP_SKILL = ROOT / "plugins/cobuilder-full-lifecycle/skills/cobuilder-setup/SKILL.md"
IMPLEMENT_INSTALL = ROOT / "plugins/implement/commands/install.md"
BUILD_SKILL = ROOT / "plugins/implement/skills/build/SKILL.md"
SLICE_LOOP = ROOT / "plugins/implement/skills/build/references/slice-loop.md"
HINDSIGHT_HOOK = ROOT / "plugins/cobuilder-memory/hooks/hindsight.ts"

HOOK_CALL_RE = re.compile(r"call\(\$, '([a-z_]+)'")
ALLOW_RULE_TOOL_RE = re.compile(r"mcp__hindsight__([a-z_]+)")
OTHER_PLUGIN_PATH_RE = re.compile(r"plugins/(architect|pr|artifact|implement|cobuilder-memory)/")

SETUP_HEADINGS = [
    "## Habit-hooks setup",
    "## Glossary check",
    "## Hindsight allow rules",
    "## Report",
]
DOCS_NAMING_THE_UMBRELLA_INSTALL = [
    "README.md",
    "CLAUDE.md",
    "plugins/implement/commands/start.md",
    "plugins/implement/skills/build/SKILL.md",
]


def _read(path: Path) -> str:
    assert path.exists(), f"missing {path.relative_to(ROOT)}"
    return path.read_text()


def _setup_text() -> str:
    return _read(SETUP_SKILL)


def _hook_tools() -> list[str]:
    tools = sorted(set(HOOK_CALL_RE.findall(_read(HINDSIGHT_HOOK))))
    assert len(tools) >= 4, f"expected at least 4 call($, '<tool>') names, found {tools!r}"
    return tools


def _frontmatter_name(text: str) -> str | None:
    assert text.startswith("---\n"), "SKILL.md has no frontmatter block at the top"
    end = text.find("\n---", 4)
    assert end != -1, "SKILL.md frontmatter block never closes"
    match = re.search(r"^name:\s*(\S+)\s*$", text[:end], re.MULTILINE)
    assert match is not None, "SKILL.md frontmatter has no name field"
    return match.group(1)


def _hindsight_section() -> str:
    text = _setup_text()
    start = text.find("## Hindsight allow rules")
    assert start != -1, "cobuilder-setup SKILL.md has no '## Hindsight allow rules' heading"
    end = text.find("## Report", start)
    assert end != -1, "cobuilder-setup SKILL.md has no '## Report' heading after the allow rules"
    return text[start:end]


# ---------------------------------------------------------------------------
# The umbrella command and the setup skill
# ---------------------------------------------------------------------------


def test_umbrella_install_command_exists_and_calls_the_setup_skill():
    assert 'Skill("cobuilder-setup", args="install $ARGUMENTS")' in _read(UMBRELLA_INSTALL)


def test_setup_skill_exists_and_its_frontmatter_name_is_cobuilder_setup():
    assert _frontmatter_name(_setup_text()) == "cobuilder-setup"


def test_setup_skill_calls_the_coach_check_mode_of_implement_build():
    assert 'Skill("build", args="coach-check")' in _setup_text()


def test_setup_skill_headings_appear_in_the_stated_order():
    text = _setup_text()
    positions = []
    for heading in SETUP_HEADINGS:
        match = re.search(rf"^{re.escape(heading)}$", text, re.MULTILINE)
        assert match is not None, f"cobuilder-setup SKILL.md has no line {heading!r}"
        positions.append(match.start())
    assert positions == sorted(positions), (
        f"setup skill headings are out of order: {SETUP_HEADINGS!r}"
    )


def test_setup_skill_names_no_other_plugin_path():
    hits = OTHER_PLUGIN_PATH_RE.findall(_setup_text())
    assert not hits, f"setup skill names another plugin's path: {hits!r}"


# ---------------------------------------------------------------------------
# Hindsight allow rules: drift against the tools the code calls
# ---------------------------------------------------------------------------


def test_hooks_file_names_at_least_four_hindsight_tools():
    assert len(_hook_tools()) >= 4


def test_allow_rules_name_every_tool_that_cobuilder_memory_calls():
    section = _hindsight_section()
    missing = [t for t in _hook_tools() if f"mcp__hindsight__{t}" not in section]
    assert not missing, f"Hindsight allow rules do not name these tools: {missing!r}"


def test_allow_rules_name_retain_and_every_hindsight_tool_slice_loop_names():
    names = sorted(set(ALLOW_RULE_TOOL_RE.findall(_read(SLICE_LOOP))))
    assert "retain" in names, "slice-loop.md no longer names mcp__hindsight__retain"
    section = _hindsight_section()
    missing = [n for n in names if f"mcp__hindsight__{n}" not in section]
    assert not missing, f"Hindsight allow rules do not name these tools: {missing!r}"


# ---------------------------------------------------------------------------
# Handover: the implement install command and the build skill's modes
# ---------------------------------------------------------------------------


def test_implement_install_hands_over_to_the_umbrella_setup_skill():
    assert 'Skill("cobuilder-setup", args="install $ARGUMENTS")' in _read(IMPLEMENT_INSTALL)


def test_implement_install_no_longer_runs_build_install_mode():
    assert 'Skill("build", args="install' not in _read(IMPLEMENT_INSTALL)


def test_build_skill_has_coach_check_mode_and_no_install_mode():
    text = _read(BUILD_SKILL)
    assert "## Coach-check mode" in text, "build SKILL.md has no '## Coach-check mode' heading"
    assert "## Install mode" not in text, "build SKILL.md still has '## Install mode'"


def test_build_skill_holds_no_habit_hooks_install_command():
    text = _read(BUILD_SKILL)
    lines = [
        f"line {i}: {line.strip()}"
        for i, line in enumerate(text.splitlines(), start=1)
        if 'uv tool install "habit-hooks' in line
    ]
    assert not lines, "build SKILL.md still runs the habit-hooks install: " + "; ".join(lines)


# ---------------------------------------------------------------------------
# Documents that name the umbrella install command
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("doc", DOCS_NAMING_THE_UMBRELLA_INSTALL)
def test_doc_names_the_umbrella_install_command(doc):
    assert "/cobuilder-full-lifecycle:install" in _read(ROOT / doc), (
        f"{doc} does not name /cobuilder-full-lifecycle:install"
    )
