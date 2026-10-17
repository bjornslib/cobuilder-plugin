"""Slice 5 of cobuilder-memory: design stage 1 and build Gate 1 ask project
memory through the consult tool, and the fixed H1 to H5 checkpoints are gone.

These are reference checks: a name in one file must resolve, and a removed
file must stay removed. They do not test the wording of the procedure.
"""

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TOOL = "mcp__cobuilder-memory__consult"
DESIGN_MODE = ROOT / "plugins/architect/skills/architecture/references/design-mode.md"
BUILD_SKILL = ROOT / "plugins/implement/skills/build/SKILL.md"
BUILD_DIR = ROOT / "plugins/implement/skills/build"
REGISTER = ROOT / "plugins/cobuilder-memory/hooks/register.ts"
# The first key of the consult input schema, as register.ts declares it
INPUT_KEY = re.compile(r"properties:\s*\{\s*([A-Za-z_]\w*)\s*:")


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


def test_the_pass_step_stores_a_slice_note_through_the_hindsight_retain_tool():
    slice_loop = (BUILD_DIR / "references/slice-loop.md").read_text()
    assert "mcp__hindsight__retain" in slice_loop
    # The status rows carry the note mark that the PASS step writes
    rows = [l for l in BUILD_SKILL.read_text().splitlines() if l.startswith("- [ ] Slice ")]
    assert rows and all("note:" in r for r in rows)


def test_the_consult_input_is_named_beside_the_tool_in_both_procedures():
    # Slice 8: the input name comes from register.ts, not from this file
    match = INPUT_KEY.search(REGISTER.read_text())
    assert match is not None, "register.ts declares no input key under properties"
    name = match.group(1)
    assert name == "focus", f"register.ts names the consult input {name}, not focus"
    for path in (DESIGN_MODE, BUILD_SKILL):
        paragraphs = path.read_text().split("\n\n")
        named = [p for p in paragraphs if TOOL in p and re.search(rf"\b{re.escape(name)}\b", p)]
        assert named, f"{path.name} does not name the {name} input in the same paragraph as {TOOL}"
