"""Slice 5 of cobuilder-memory: design stage 1 and build Gate 1 ask project
memory through the consult tool, and the fixed H1 to H5 checkpoints are gone.

These are reference checks: a name in one file must resolve, and a removed
file must stay removed. They do not test the wording of the procedure.
"""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TOOL = "mcp__cobuilder-memory__consult"
DESIGN_MODE = ROOT / "plugins/architect/skills/architecture/references/design-mode.md"
BUILD_SKILL = ROOT / "plugins/implement/skills/build/SKILL.md"
BUILD_DIR = ROOT / "plugins/implement/skills/build"


def test_design_stage_1_and_gate_1_name_the_consult_tool():
    for path in (DESIGN_MODE, BUILD_SKILL):
        text = path.read_text()
        assert TOOL in text, f"{path.name} does not name {TOOL}"
        # Plugins meet at names, never at another plugin's path (principle 4)
        assert "plugins/cobuilder-memory" not in text, f"{path.name} names a cobuilder-memory path"


def test_the_consult_tool_registers_under_the_name_the_skills_use():
    register = (ROOT / "plugins/cobuilder-memory/hooks/register.ts").read_text()
    assert "const CONSULT = 'consult'" in register


def test_the_h1_to_h5_routine_is_removed_and_nothing_links_to_it():
    assert not (BUILD_DIR / "references/hindsight-routine.md").exists()
    for path in BUILD_DIR.rglob("*"):
        if path.is_file() and path.suffix in {".md", ".js"}:
            assert "hindsight-routine" not in path.read_text(), f"{path} still links to hindsight-routine.md"
