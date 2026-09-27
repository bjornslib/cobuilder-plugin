"""Slice 2 (E2 tracer bullet): plugins/implement/agents/{red,green,validate}.md

Contract under test (docs/plans/slice-agents-and-vocabulary/epic-E2-design.md,
Types & Signatures table, and 04-slices.md slice 2 row):

- The three agent files exist under plugins/implement/agents/.
- Each file starts with YAML frontmatter that parses.
- `name` equals the file stem.
- `description` is a non-empty string.
- No file under plugins/implement/agents/ (glob *.md) carries any of
  hooks, mcpServers, permissionMode, initialPrompt.
- RED and GREEN carry `model: sonnet` and `tools` exactly
  Read, Grep, Glob, Write, Edit, Bash (order-insensitive; tools may be a
  comma-separated string or a YAML list).
- VALIDATE has no `model` key, and its tools exclude Edit.
"""

import re
from pathlib import Path

import pytest
import yaml

REPO_ROOT = Path(__file__).resolve().parent.parent
AGENTS_DIR = REPO_ROOT / "plugins" / "implement" / "agents"

ROLES = ["red", "green", "validate"]

IGNORED_KEYS = ["hooks", "mcpServers", "permissionMode", "initialPrompt"]

EXPECTED_TOOLS = {"Read", "Grep", "Glob", "Write", "Edit", "Bash"}

FRONTMATTER_RE = re.compile(r"\A---\s*\n(.*?\n)---\s*\n?", re.DOTALL)


def _parse_frontmatter(path: Path):
    """Return the parsed YAML frontmatter dict for an agent file.

    Fails the calling test with a clear assertion if the file is missing,
    has no frontmatter fence, or the frontmatter does not parse as YAML.
    """
    assert path.exists(), f"expected agent file to exist: {path}"
    text = path.read_text(encoding="utf-8")
    match = FRONTMATTER_RE.match(text)
    assert match is not None, (
        f"{path} does not start with a '---' delimited YAML frontmatter block"
    )
    try:
        data = yaml.safe_load(match.group(1))
    except yaml.YAMLError as exc:
        pytest.fail(f"{path} frontmatter is not valid YAML: {exc}")
    assert isinstance(data, dict), f"{path} frontmatter did not parse to a mapping"
    return data


def _normalize_tools(tools_value):
    """Accept both a comma-separated string and a YAML list for `tools`."""
    if isinstance(tools_value, str):
        return {t.strip() for t in tools_value.split(",") if t.strip()}
    if isinstance(tools_value, list):
        return {str(t).strip() for t in tools_value}
    pytest.fail(f"tools value has unexpected type: {type(tools_value)!r}")


@pytest.mark.parametrize("role", ROLES)
def test_agent_file_exists_and_frontmatter_parses(role):
    path = AGENTS_DIR / f"{role}.md"
    _parse_frontmatter(path)


@pytest.mark.parametrize("role", ROLES)
def test_name_equals_file_stem(role):
    path = AGENTS_DIR / f"{role}.md"
    data = _parse_frontmatter(path)
    assert data.get("name") == role, (
        f"{path}: expected name == {role!r}, got {data.get('name')!r}"
    )


@pytest.mark.parametrize("role", ROLES)
def test_description_is_non_empty(role):
    path = AGENTS_DIR / f"{role}.md"
    data = _parse_frontmatter(path)
    description = data.get("description")
    assert isinstance(description, str) and description.strip() != "", (
        f"{path}: description must be a non-empty string, got {description!r}"
    )


def test_no_agent_file_carries_ignored_keys():
    """Glob the whole agents/ directory, not just the three known roles.

    This must fail (not pass vacuously) when the directory has no .md files,
    since a missing directory means the ignored-key contract is unverified.
    """
    assert AGENTS_DIR.is_dir(), f"expected agents directory to exist: {AGENTS_DIR}"
    md_files = sorted(AGENTS_DIR.glob("*.md"))
    assert md_files, f"expected at least one agent .md file under {AGENTS_DIR}"

    for path in md_files:
        data = _parse_frontmatter(path)
        for key in IGNORED_KEYS:
            assert key not in data, (
                f"{path}: must not carry ignored key {key!r}, "
                f"Claude Code ignores it for plugin agents"
            )


@pytest.mark.parametrize("role", ["red", "green"])
def test_red_and_green_carry_model_sonnet(role):
    path = AGENTS_DIR / f"{role}.md"
    data = _parse_frontmatter(path)
    assert data.get("model") == "sonnet", (
        f"{path}: expected model == 'sonnet', got {data.get('model')!r}"
    )


@pytest.mark.parametrize("role", ["red", "green"])
def test_red_and_green_tools_are_exact_set(role):
    path = AGENTS_DIR / f"{role}.md"
    data = _parse_frontmatter(path)
    assert "tools" in data, f"{path}: missing tools key"
    tools = _normalize_tools(data["tools"])
    assert tools == EXPECTED_TOOLS, (
        f"{path}: expected tools {EXPECTED_TOOLS}, got {tools}"
    )


def test_validate_has_no_model_key():
    path = AGENTS_DIR / "validate.md"
    data = _parse_frontmatter(path)
    assert "model" not in data, (
        f"{path}: validate must inherit the model, so it must carry no model key, "
        f"got model={data.get('model')!r}"
    )


def test_validate_tools_exclude_edit():
    path = AGENTS_DIR / "validate.md"
    data = _parse_frontmatter(path)
    assert "tools" in data, f"{path}: missing tools key"
    tools = _normalize_tools(data["tools"])
    assert "Edit" not in tools, (
        f"{path}: validate's tools must exclude Edit, got {tools}"
    )
