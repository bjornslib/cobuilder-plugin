"""Reference tests for the slice 8 links between the evidence packet and its readers.

The tests check that a name in one file resolves in another file. The slice loop
names the script and its two options, and it records the slice base before RED
starts. VALIDATE names the script and the structure-judgment reference, and it
names no plugin path. The tests never check the wording of the prose. The blind
VALIDATE pass covers the prose.

Run with: uv run pytest tests/test_structure_evidence_refs.py -q
"""
from __future__ import annotations

import ast
import re
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
EVIDENCE_SCRIPT = REPO_ROOT / "shared" / "structure_evidence.py"
SCRIPT_NAME = "structure_evidence.py"
REFERENCES = REPO_ROOT / "plugins" / "implement" / "skills" / "build" / "references"
SLICE_LOOP = REFERENCES / "slice-loop.md"
STRUCTURE_JUDGMENT = REFERENCES / "structure-judgment.md"
VALIDATE_AGENT = REPO_ROOT / "plugins" / "implement" / "agents" / "validate.md"


def _text(path: Path) -> str:
    assert path.is_file(), f"missing {path}"
    return path.read_text(encoding="utf-8")


def _paragraphs(text: str) -> list[str]:
    """Return the blocks of text that a blank line separates."""
    return [block for block in re.split(r"\n\s*\n", text) if block.strip()]


def _string_arguments(source: str) -> set[str]:
    """Return each string literal that a call takes as an argument, such as an option name."""
    names: set[str] = set()
    for node in ast.walk(ast.parse(source)):
        if isinstance(node, ast.Call):
            names.update(
                arg.value
                for arg in node.args
                if isinstance(arg, ast.Constant) and isinstance(arg.value, str)
            )
    return names


def test_slice_loop_names_the_script_with_base_and_out():
    blocks = [block for block in _paragraphs(_text(SLICE_LOOP)) if SCRIPT_NAME in block]
    assert blocks, f"slice-loop.md does not name {SCRIPT_NAME}"
    assert any("--base" in block and "--out" in block for block in blocks), (
        f"no paragraph of slice-loop.md names {SCRIPT_NAME} with --base and --out"
    )


def test_the_script_defines_the_base_and_out_options():
    assert EVIDENCE_SCRIPT.is_file(), f"missing {EVIDENCE_SCRIPT}"
    options = _string_arguments(_text(EVIDENCE_SCRIPT))
    assert {"--base", "--out"} <= options, f"the script takes the arguments {sorted(options)}"


def test_validate_names_the_structure_judgment_reference():
    assert "structure-judgment.md" in _text(VALIDATE_AGENT), (
        "validate.md does not name structure-judgment.md"
    )
    assert STRUCTURE_JUDGMENT.is_file(), f"missing {STRUCTURE_JUDGMENT}"


def test_validate_names_the_evidence_script_and_no_plugin_path():
    text = _text(VALIDATE_AGENT)
    assert SCRIPT_NAME in text, f"validate.md does not name {SCRIPT_NAME}"
    assert EVIDENCE_SCRIPT.is_file(), f"missing {EVIDENCE_SCRIPT}"
    assert "plugins/" not in text, "validate.md names a plugin path"
    assert "CLAUDE_PLUGIN_ROOT" not in text, "validate.md names a plugin path"


def test_slice_loop_records_the_slice_base_before_red():
    text = _text(SLICE_LOOP)
    assert "rev-parse HEAD" in text, "slice-loop.md does not record the slice base"
    red_section = text.find("## Role 1")
    assert red_section != -1, "slice-loop.md has no RED section"
    assert text.find("rev-parse HEAD") < red_section, "the slice base is recorded after RED starts"
