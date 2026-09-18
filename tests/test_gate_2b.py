"""Gate 2b wiring: the interaction-design gate line, the build section that
runs it, and the two downstream consumers that keep it from being paperwork.

Gate 2b is its own tracked line in a plan's ``00-status.md``. It sits between
Gate 2 (Architecture) and Gate 3 (Program Design). A feature with a front end
runs ``implement:design-to-code`` and writes two artifacts. A feature with no
front end records ``n/a``.

Run with: uv run --with pytest pytest tests/ -v
"""
from __future__ import annotations

import json
import re
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent

BUILD_SKILL = REPO_ROOT / "plugins" / "implement" / "skills" / "build" / "SKILL.md"
START_COMMAND = REPO_ROOT / "plugins" / "implement" / "commands" / "start.md"
PLUGIN_JSON = REPO_ROOT / "plugins" / "implement" / ".claude-plugin" / "plugin.json"
RUBRIC_AUTHORING = (
    REPO_ROOT / "plugins" / "implement" / "skills" / "build" / "references" / "rubric-authoring.md"
)
SLICE_LOOP = (
    REPO_ROOT / "plugins" / "implement" / "skills" / "build" / "references" / "slice-loop.md"
)

GATE_ORDER_RE = re.compile(r"^-\s+Gate\s+([0-9]+b?)\s+—", re.MULTILINE)


def _status_template_block() -> str:
    """Return the body of the ``00-status.md`` template block.

    The block is the fenced ``markdown`` region after the
    "Template for ``00-status.md``:" line in the build skill.
    """
    text = BUILD_SKILL.read_text()
    marker = "Template for `00-status.md`:"
    start = text.index(marker)
    fence_start = text.index("```markdown", start)
    body_start = fence_start + len("```markdown")
    fence_end = text.index("\n```", body_start)
    return text[body_start:fence_end]


def _gate_2b_section() -> str:
    """Return the body of the ``## Gate 2b`` section.

    The body stops at the next level-two heading.
    """
    text = BUILD_SKILL.read_text()
    heading = re.search(r"^## Gate 2b.*$", text, re.MULTILINE)
    assert heading is not None, f"no '## Gate 2b' heading in {BUILD_SKILL.name}"
    rest = text[heading.start():]
    next_heading = re.search(r"\n## ", rest)
    return rest if next_heading is None else rest[: next_heading.start()]


def test_2b_line_is_in_the_template_between_gate_2_and_gate_3() -> None:
    """The template lists the gate numbers in order: 1, 2, 2b, 3, 4.

    This is the load-bearing test. It proves the gate is visible in the right
    place to a session that reads the status file.
    """
    block = _status_template_block()
    order = GATE_ORDER_RE.findall(block)
    assert order == ["1", "2", "2b", "3", "4"], (
        "the 00-status.md template must list Gate 2b between Gate 2 and Gate 3, "
        f"but the gate order reads {order}"
    )


def test_gate_2b_section_exists() -> None:
    """The build skill carries the section and names all three paths."""
    text = BUILD_SKILL.read_text()
    assert re.search(r"^## Gate 2b", text, re.MULTILINE), (
        "the build skill must carry a '## Gate 2b' heading"
    )
    body = _gate_2b_section()
    for path_label in ("Path 1", "Path 2", "Path 3"):
        assert path_label in body, f"the Gate 2b section must name {path_label}"


def test_start_command_lists_both_artifacts() -> None:
    """The start command's 'What this writes' list names both artifacts."""
    text = START_COMMAND.read_text()
    assert "interaction-design.md" in text, "start.md must name interaction-design.md"
    assert "ui-spec.jsonc" in text, "start.md must name ui-spec.jsonc"


def test_plugin_version_is_0_2_0() -> None:
    """The plugin gains a skill, so the minor version moves to 0.2.0."""
    manifest = json.loads(PLUGIN_JSON.read_text())
    assert manifest["version"] == "0.2.0"


def test_rubric_authoring_names_both_artifacts() -> None:
    """The rubric author reads both artifacts as derivation sources."""
    text = RUBRIC_AUTHORING.read_text()
    assert "interaction-design.md" in text, "rubric-authoring.md must name interaction-design.md"
    assert "ui-spec.jsonc" in text, "rubric-authoring.md must name ui-spec.jsonc"


def test_slice_loop_names_the_browser_check() -> None:
    """The slice loop reads both artifacts and rejects a synthetic click."""
    text = SLICE_LOOP.read_text()
    assert "interaction-design.md" in text, "slice-loop.md must name interaction-design.md"
    assert "ui-spec.jsonc" in text, "slice-loop.md must name ui-spec.jsonc"
    assert ".click()" in text, "slice-loop.md must name the .click() shortcut"
    assert "not that check" in text, (
        "slice-loop.md must state that a component test calling .click() is not "
        "sufficient evidence"
    )
