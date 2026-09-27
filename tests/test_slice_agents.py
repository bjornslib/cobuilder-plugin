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
import shutil
import subprocess
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


# ---------------------------------------------------------------------------
# Slice 3 (E2 real content): the prompts move, and both loop paths spawn by
# name.
#
# Contract under test (docs/plans/slice-agents-and-vocabulary/epic-E2-design.md,
# Test Plan, slice 3 row):
#
# - RED and GREEN bodies contain "Do not read anything under .cobuilder/".
# - GREEN contains "Do NOT modify any test file".
# - RED states tests must fail on assertions.
# - VALIDATE contains PASS, FAIL, ESCALATION, 0.90, the three score levels
#   1.0/0.5/0.0, and the evidence file pattern slice-<N>-attempt-<M>.md.
# - Each agent body contains the placeholders <slug> and <N>; red/green also
#   <test_command>.
# - slice-loop.md names implement:red, implement:green, implement:validate
#   and "subagent_type", and no longer contains the old inline "You are the
#   ROLE" prompt blocks.
# - slice-loop.md still contains its "## Handling the verdict" and
#   "## Anti-patterns" sections.
# - slice-loop.js contains agentType: 'implement:red'/'implement:green'/
#   'implement:validate' (either quote style), and no longer contains the
#   old inline "You are the ROLE" prompt blocks.
# - If node is on PATH, `node --check` on slice-loop.js succeeds.
# ---------------------------------------------------------------------------

SKILL_ROOT = REPO_ROOT / "plugins" / "implement" / "skills" / "build"
SLICE_LOOP_MD = SKILL_ROOT / "references" / "slice-loop.md"
SLICE_LOOP_JS = SKILL_ROOT / "workflows" / "slice-loop.js"

BLIND_LINE = "Do not read anything under .cobuilder/"

OLD_INLINE_PROMPT_HEADERS = [
    "You are the RED role",
    "You are the GREEN role",
    "You are the VALIDATOR",
]


def _agent_body(role):
    path = AGENTS_DIR / f"{role}.md"
    text = path.read_text(encoding="utf-8")
    match = FRONTMATTER_RE.match(text)
    assert match is not None, f"{path}: expected frontmatter to parse"
    return text[match.end():]


def _strip_backticks(text):
    """Normalise `.cobuilder/`-style backtick-quoting before matching."""
    return text.replace("`", "")


@pytest.mark.parametrize("role", ["red", "green"])
def test_red_and_green_body_contains_blind_rule(role):
    body = _strip_backticks(_agent_body(role))
    assert BLIND_LINE in body, (
        f"plugins/implement/agents/{role}.md: expected body to contain "
        f"{BLIND_LINE!r} (backticks stripped before matching)"
    )


def test_green_body_forbids_modifying_test_files():
    body = _agent_body("green")
    assert "Do NOT modify any test file" in body, (
        "plugins/implement/agents/green.md: expected body to contain "
        "'Do NOT modify any test file'"
    )


def test_red_body_requires_failures_to_be_assertions():
    body = _agent_body("red").lower()
    assert "assertion" in body, (
        "plugins/implement/agents/red.md: expected body to state that tests "
        "must fail on assertions (missing the word 'assertion')"
    )


def test_validate_body_contains_verdicts_and_threshold():
    body = _agent_body("validate")
    for token in ["PASS", "FAIL", "ESCALATION", "0.90"]:
        assert token in body, (
            f"plugins/implement/agents/validate.md: expected body to "
            f"contain {token!r}"
        )


def test_validate_body_contains_score_levels():
    body = _agent_body("validate")
    for level in ["1.0", "0.5", "0.0"]:
        assert level in body, (
            f"plugins/implement/agents/validate.md: expected body to "
            f"contain score level {level!r}"
        )


def test_validate_body_contains_evidence_file_pattern():
    body = _agent_body("validate")
    assert "slice-<N>-attempt-<M>.md" in body, (
        "plugins/implement/agents/validate.md: expected body to contain "
        "the evidence file pattern 'slice-<N>-attempt-<M>.md'"
    )


@pytest.mark.parametrize("role", ROLES)
def test_agent_body_contains_slug_and_n_placeholders(role):
    body = _agent_body(role)
    assert "<slug>" in body, (
        f"plugins/implement/agents/{role}.md: expected body to contain the "
        f"<slug> placeholder"
    )
    assert "<N>" in body, (
        f"plugins/implement/agents/{role}.md: expected body to contain the "
        f"<N> placeholder"
    )


@pytest.mark.parametrize("role", ["red", "green"])
def test_red_and_green_body_contains_test_command_placeholder(role):
    body = _agent_body(role)
    assert "<test_command>" in body, (
        f"plugins/implement/agents/{role}.md: expected body to contain the "
        f"<test_command> placeholder"
    )


def test_slice_loop_md_names_the_three_agents_by_type():
    text = SLICE_LOOP_MD.read_text(encoding="utf-8")
    for agent_name in ["implement:red", "implement:green", "implement:validate"]:
        assert agent_name in text, (
            f"{SLICE_LOOP_MD}: expected it to name the agent {agent_name!r}"
        )
    assert "subagent_type" in text, (
        f"{SLICE_LOOP_MD}: expected it to mention 'subagent_type'"
    )


def test_slice_loop_md_no_longer_contains_inline_prompts():
    text = SLICE_LOOP_MD.read_text(encoding="utf-8")
    for header in OLD_INLINE_PROMPT_HEADERS:
        assert header not in text, (
            f"{SLICE_LOOP_MD}: expected the inline prompt header {header!r} "
            f"to have moved into plugins/implement/agents/, but it is still "
            f"present"
        )


def test_slice_loop_md_still_has_handling_and_anti_patterns_sections():
    text = SLICE_LOOP_MD.read_text(encoding="utf-8")
    assert "## Handling the verdict" in text, (
        f"{SLICE_LOOP_MD}: expected the '## Handling the verdict' section "
        f"to still be present"
    )
    assert "## Anti-patterns" in text, (
        f"{SLICE_LOOP_MD}: expected the '## Anti-patterns' section to "
        f"still be present"
    )


AGENT_TYPE_RE = re.compile(
    r"agentType\s*:\s*['\"]implement:(red|green|validate)['\"]"
)


def test_slice_loop_js_spawns_the_three_agents_by_type():
    text = SLICE_LOOP_JS.read_text(encoding="utf-8")
    found = {m.group(1) for m in AGENT_TYPE_RE.finditer(text)}
    assert found == {"red", "green", "validate"}, (
        f"{SLICE_LOOP_JS}: expected agentType: 'implement:red'/'implement:green'/"
        f"'implement:validate' (either quote style), found roles {found}"
    )


def test_slice_loop_js_no_longer_contains_inline_prompts():
    text = SLICE_LOOP_JS.read_text(encoding="utf-8")
    for header in OLD_INLINE_PROMPT_HEADERS:
        assert header not in text, (
            f"{SLICE_LOOP_JS}: expected the inline prompt header {header!r} "
            f"to have moved into plugins/implement/agents/, but it is still "
            f"present"
        )


def test_slice_loop_js_is_syntactically_valid_node():
    if shutil.which("node") is None:
        pytest.skip("node is not on PATH; skipping node --check on slice-loop.js")
    result = subprocess.run(
        ["node", "--check", str(SLICE_LOOP_JS)],
        capture_output=True,
        text=True,
    )
    assert result.returncode == 0, (
        f"node --check {SLICE_LOOP_JS} failed:\n{result.stdout}\n{result.stderr}"
    )
