"""Reference guards for the slice loop text (structure-coaching/E3, slice 7).

Slice 7 changes prose that steers the main agent. The repo rule is to test
effects, structure, and references, never wording. So each test here checks
that a name in the loop text resolves to a real file, operation, or option:

- slice-loop.md names verify_gate.py with --slice, and the script defines it.
- The build SKILL.md names verify_gate.py with --slice.
- slice-loop.md names set-slice-state, and tracker.py lists it.
- slice-loop.md names implement:red, implement:green, and implement:validate.
  Each one resolves to an agent file whose front matter name matches.

Run this file alone with: uv run pytest tests/test_slice_loop_refs.py -q
"""
from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path

import pytest
import yaml

REPO_ROOT = Path(__file__).resolve().parent.parent
IMPLEMENT_DIR = REPO_ROOT / "plugins" / "implement"
BUILD_DIR = IMPLEMENT_DIR / "skills" / "build"
SLICE_LOOP_MD = BUILD_DIR / "references" / "slice-loop.md"
BUILD_SKILL_MD = BUILD_DIR / "SKILL.md"
AGENTS_DIR = IMPLEMENT_DIR / "agents"
VERIFY_GATE = IMPLEMENT_DIR / "scripts" / "verify_gate.py"
TRACKER = REPO_ROOT / "shared" / "tracker.py"

ROLES = ["red", "green", "validate"]

# A long option such as --slice. A word character before the dashes means
# the text is not an option, so the lookbehind skips it.
OPTION_RE = re.compile(r"(?<![\w-])--([a-z][a-z0-9-]*)")
FRONTMATTER_RE = re.compile(r"\A---\s*\n(.*?\n)---\s*\n?", re.DOTALL)


def _logical_lines(text: str) -> list[str]:
    """Join each line that ends in a backslash to the line after it."""
    lines: list[str] = []
    joined = ""
    for raw in text.splitlines():
        if raw.rstrip().endswith("\\"):
            joined += raw.rstrip()[:-1] + " "
            continue
        lines.append(joined + raw)
        joined = ""
    if joined:
        lines.append(joined)
    return lines


def _options_on_verify_gate_lines(text: str) -> set[str]:
    """Return the long options on each line that names verify_gate.py."""
    named: set[str] = set()
    for line in _logical_lines(text):
        if "verify_gate.py" in line:
            named.update(OPTION_RE.findall(line))
    return named


def _help_text(script: Path) -> str:
    """Run a script with --help and return its standard output."""
    result = subprocess.run(
        [sys.executable, str(script), "--help"],
        capture_output=True,
        text=True,
        check=False,
    )
    assert result.returncode == 0, (
        f"{script} --help exited {result.returncode}: {result.stderr}"
    )
    return result.stdout


def _front_matter(path: Path) -> dict:
    """Return the parsed YAML front matter of an agent file."""
    assert path.is_file(), f"expected agent file to exist: {path}"
    match = FRONTMATTER_RE.match(path.read_text(encoding="utf-8"))
    assert match is not None, f"{path} has no YAML front matter block"
    data = yaml.safe_load(match.group(1))
    assert isinstance(data, dict), f"{path} front matter is not a mapping"
    return data


def test_slice_loop_names_verify_gate_with_the_slice_option():
    named = _options_on_verify_gate_lines(SLICE_LOOP_MD.read_text(encoding="utf-8"))
    assert "slice" in named, (
        f"{SLICE_LOOP_MD}: no line names verify_gate.py with --slice "
        f"(options on verify_gate.py lines: {sorted(named)})"
    )
    listed = set(re.findall(r"(?m)^\s+--([a-z][a-z0-9-]*)\b", _help_text(VERIFY_GATE)))
    assert "slice" in listed, f"{VERIFY_GATE}: --help does not list --slice"


def test_build_skill_names_verify_gate_with_the_slice_option():
    named = _options_on_verify_gate_lines(BUILD_SKILL_MD.read_text(encoding="utf-8"))
    assert "slice" in named, (
        f"{BUILD_SKILL_MD}: no line names verify_gate.py with --slice "
        f"(options on verify_gate.py lines: {sorted(named)})"
    )


def test_slice_loop_names_set_slice_state_and_tracker_lists_it():
    text = SLICE_LOOP_MD.read_text(encoding="utf-8")
    assert re.search(r"(?<![\w-])set-slice-state(?![\w-])", text), (
        f"{SLICE_LOOP_MD}: does not name the tracker operation set-slice-state"
    )
    braces = re.search(r"\{([a-z][a-z0-9,-]+)\}", _help_text(TRACKER))
    assert braces is not None, "tracker.py --help lists no operations in braces"
    assert "set-slice-state" in braces.group(1).split(","), (
        "tracker.py --help does not list set-slice-state"
    )


@pytest.mark.parametrize("role", ROLES)
def test_slice_loop_agent_type_resolves_to_agent_file(role):
    text = SLICE_LOOP_MD.read_text(encoding="utf-8")
    assert re.search(rf"(?<![\w-])implement:{role}(?![\w-])", text), (
        f"{SLICE_LOOP_MD}: does not name the agent type implement:{role}"
    )
    path = AGENTS_DIR / f"{role}.md"
    assert _front_matter(path).get("name") == role, (
        f"{path}: front matter name must equal {role!r}"
    )
