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
# - RED and GREEN forbid the rubric directory that VALIDATE and slice-loop.js
#   read from.
# - GREEN contains "Do NOT modify any test file".
# - RED states tests must fail on assertions.
# - VALIDATE's pass threshold and evidence file pattern equal the values
#   slice-loop.js uses, and VALIDATE contains the three score levels 1.0/0.5/0.0.
# - Each agent body contains the placeholders <slug> and <N>; red/green also
#   <test_command>.
# - slice-loop.md names implement:red, implement:green, implement:validate
#   and "subagent_type".
# - slice-loop.js contains agentType: 'implement:red'/'implement:green'/
#   'implement:validate' (either quote style).
# - If node is on PATH, `node --check` on slice-loop.js succeeds.
# ---------------------------------------------------------------------------

SKILL_ROOT = REPO_ROOT / "plugins" / "implement" / "skills" / "build"
SLICE_LOOP_MD = SKILL_ROOT / "references" / "slice-loop.md"
SLICE_LOOP_JS = SKILL_ROOT / "workflows" / "slice-loop.js"

def _agent_body(role):
    path = AGENTS_DIR / f"{role}.md"
    text = path.read_text(encoding="utf-8")
    match = FRONTMATTER_RE.match(text)
    assert match is not None, f"{path}: expected frontmatter to parse"
    return text[match.end():]


def _js_source():
    return SLICE_LOOP_JS.read_text(encoding="utf-8")


def _js_rubric_dir():
    """Return the rubric directory slice-loop.js reads, with ${slug} as <slug>."""
    match = re.search(r"const rubrics = `([^`]*)`", _js_source())
    assert match is not None, f"{SLICE_LOOP_JS}: expected a 'const rubrics' template"
    return match.group(1).replace("${slug}", "<slug>")


def test_blind_rule_forbids_the_rubric_directory():
    """RED and GREEN forbid a directory. It must cover the rubric directory that
    VALIDATE and slice-loop.js read from."""
    forbidden = {}
    for role in ["red", "green"]:
        match = re.search(r"Do not read anything under (\S+)", _agent_body(role))
        assert match is not None, f"plugins/implement/agents/{role}.md: no blind rule found"
        forbidden[role] = match.group(1)

    validate_dirs = set(re.findall(r"\.cobuilder/rubrics/<slug>", _agent_body("validate")))
    assert validate_dirs, "plugins/implement/agents/validate.md: no rubric directory found"
    loop_dir = _js_rubric_dir()
    assert loop_dir, f"{SLICE_LOOP_JS}: rubric directory is empty"

    assert validate_dirs == {loop_dir}, (
        f"validate.md reads rubrics from {validate_dirs}, slice-loop.js from {loop_dir!r}"
    )
    for role, path in forbidden.items():
        assert loop_dir.startswith(path), (
            f"plugins/implement/agents/{role}.md forbids {path!r}, which does not "
            f"cover the rubric directory {loop_dir!r}"
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


def test_validate_pass_threshold_matches_slice_loop():
    prose = re.findall(r"overall_score\s*>=\s*(\d+\.\d+)", _agent_body("validate"))
    assert prose, "plugins/implement/agents/validate.md: no 'overall_score >= <number>' pass rule"
    match = re.search(
        r"const ACCEPT\s*=\s*args\?\.accept\s*\?\?\s*(\d+\.\d+)", _js_source()
    )
    assert match is not None, f"{SLICE_LOOP_JS}: expected 'const ACCEPT = args?.accept ?? <number>'"
    assert {float(p) for p in prose} == {float(match.group(1))}, (
        f"validate.md pass threshold {prose} differs from slice-loop.js ACCEPT {match.group(1)}"
    )


def test_validate_body_contains_score_levels():
    body = _agent_body("validate")
    for level in ["1.0", "0.5", "0.0"]:
        assert level in body, (
            f"plugins/implement/agents/validate.md: expected body to "
            f"contain score level {level!r}"
        )


def test_validate_evidence_pattern_matches_slice_loop():
    prose = set(re.findall(
        r"\.cobuilder/rubrics/<slug>/evidence/slice-<\w+>-attempt-<\w+>\.md",
        _agent_body("validate"),
    ))
    assert prose, "plugins/implement/agents/validate.md: no evidence file pattern found"

    evidence_match = re.search(r"const evidence = `\$\{rubrics\}([^`]*)`", _js_source())
    assert evidence_match is not None, f"{SLICE_LOOP_JS}: expected a 'const evidence' template"
    evidence_dir = _js_rubric_dir() + evidence_match.group(1)

    loop = set()
    for name in re.findall(r"\$\{evidence\}/(slice-\$\{s\.id\}-attempt-\$\{attempt\}\.md)", _js_source()):
        normalized = name.replace("${s.id}", "<N>").replace("${attempt}", "<M>")
        loop.add(f"{evidence_dir}/{normalized}")
    assert loop, f"{SLICE_LOOP_JS}: no evidence file path built"

    assert prose == loop, (
        f"validate.md evidence pattern {prose} differs from slice-loop.js {loop}"
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


# ---------------------------------------------------------------------------
# Slice 7 (E4 real content): the vocabulary agent, the loop step, and design
# mode.
#
# Contract under test (docs/plans/slice-agents-and-vocabulary/epic-E4-design.md,
# Test Plan, slice 7 row):
#
# - plugins/implement/agents/vocabulary.md exists, frontmatter parses,
#   name == "vocabulary", no "model" key, tools exclude "Edit", description
#   non-empty. (The whole-directory ignored-key test above already covers
#   this file for hooks/mcpServers/permissionMode/initialPrompt.)
# - Its body names DDD-VOCABULARY.md and appends via Bash (">>").
# - slice-loop.md states the vocabulary verdict is not part of the score.
# - slice-loop.js spawns agentType 'implement:vocabulary' and calls
#   parallel(); node --check passes.
# - design-mode.md's Stage 1 section names DDD-VOCABULARY.md, and the stage
#   heading count is unchanged (Stage 0 through Stage 7, each exactly once).
# ---------------------------------------------------------------------------

VOCAB_AGENT_PATH = AGENTS_DIR / "vocabulary.md"

DESIGN_MODE_MD = (
    REPO_ROOT
    / "plugins"
    / "architect"
    / "skills"
    / "architecture"
    / "references"
    / "design-mode.md"
)


def test_vocabulary_agent_file_exists_and_frontmatter_parses():
    _parse_frontmatter(VOCAB_AGENT_PATH)


def test_vocabulary_agent_name_equals_vocabulary():
    data = _parse_frontmatter(VOCAB_AGENT_PATH)
    assert data.get("name") == "vocabulary", (
        f"{VOCAB_AGENT_PATH}: expected name == 'vocabulary', got {data.get('name')!r}"
    )


def test_vocabulary_agent_description_is_non_empty():
    data = _parse_frontmatter(VOCAB_AGENT_PATH)
    description = data.get("description")
    assert isinstance(description, str) and description.strip() != "", (
        f"{VOCAB_AGENT_PATH}: description must be a non-empty string, got {description!r}"
    )


def test_vocabulary_agent_has_no_model_key():
    data = _parse_frontmatter(VOCAB_AGENT_PATH)
    assert "model" not in data, (
        f"{VOCAB_AGENT_PATH}: vocabulary must inherit the model, so it must "
        f"carry no model key, got model={data.get('model')!r}"
    )


def test_vocabulary_agent_tools_exclude_edit():
    data = _parse_frontmatter(VOCAB_AGENT_PATH)
    assert "tools" in data, f"{VOCAB_AGENT_PATH}: missing tools key"
    tools = _normalize_tools(data["tools"])
    assert "Edit" not in tools, (
        f"{VOCAB_AGENT_PATH}: vocabulary's tools must exclude Edit, got {tools}"
    )


def _vocabulary_agent_body():
    text = VOCAB_AGENT_PATH.read_text(encoding="utf-8")
    match = FRONTMATTER_RE.match(text)
    assert match is not None, f"{VOCAB_AGENT_PATH}: expected frontmatter to parse"
    return text[match.end():]


def test_vocabulary_agent_body_names_the_vocabulary_file():
    body = _vocabulary_agent_body()
    assert "DDD-VOCABULARY.md" in body, (
        f"{VOCAB_AGENT_PATH}: expected body to name 'DDD-VOCABULARY.md'"
    )


def test_vocabulary_agent_body_appends_via_bash_redirect():
    body = _vocabulary_agent_body()
    assert ">>" in body, (
        f"{VOCAB_AGENT_PATH}: expected body to show an append-via-Bash example "
        f"containing '>>', since the agent has no Write/Edit tool"
    )


def test_slice_loop_md_vocabulary_verdict_is_not_part_of_score():
    text = SLICE_LOOP_MD.read_text(encoding="utf-8")
    assert "not part of the score" in text or "separate axis" in text, (
        f"{SLICE_LOOP_MD}: expected it to state the vocabulary verdict is not "
        f"part of the score (phrase 'not part of the score' or 'separate axis')"
    )


def test_slice_loop_js_spawns_vocabulary_agent():
    text = SLICE_LOOP_JS.read_text(encoding="utf-8")
    assert re.search(r"agentType\s*:\s*['\"]implement:vocabulary['\"]", text), (
        f"{SLICE_LOOP_JS}: expected it to spawn agentType "
        f"'implement:vocabulary' (either quote style)"
    )


def test_slice_loop_js_calls_parallel():
    text = SLICE_LOOP_JS.read_text(encoding="utf-8")
    assert re.search(r"\bparallel\s*\(", text), (
        f"{SLICE_LOOP_JS}: expected a `parallel(` call"
    )


def test_slice_loop_js_uses_the_runtime_parallel():
    text = SLICE_LOOP_JS.read_text(encoding="utf-8")
    assert not re.search(r"(function\s+parallel\b|(const|let|var)\s+parallel\s*=)", text), (
        f"{SLICE_LOOP_JS}: must not declare a local `parallel`, "
        "which shadows the Workflow runtime's built-in parallel() global"
    )


STAGE_HEADING_RE = re.compile(r"^## \d+\. (Stage \d+)\b.*$", re.MULTILINE)


def _design_mode_section(text, heading_prefix):
    """Return the text of the '## N. <heading_prefix>...' section, from its
    heading line up to (excluding) the next '## ' heading line."""
    lines = text.splitlines()
    start = None
    for i, line in enumerate(lines):
        if line.startswith("## ") and heading_prefix in line:
            start = i
            break
    assert start is not None, f"no '## ' heading containing {heading_prefix!r} found"
    end = len(lines)
    for i in range(start + 1, len(lines)):
        if lines[i].startswith("## "):
            end = i
            break
    return "\n".join(lines[start:end])


def test_design_mode_stage_1_section_names_the_vocabulary_file():
    text = DESIGN_MODE_MD.read_text(encoding="utf-8")
    section = _design_mode_section(text, "Stage 1")
    assert "DDD-VOCABULARY.md" in section, (
        f"{DESIGN_MODE_MD}: expected the Stage 1 section to name "
        f"'DDD-VOCABULARY.md'"
    )


def test_design_mode_stage_headings_unchanged():
    text = DESIGN_MODE_MD.read_text(encoding="utf-8")
    found = STAGE_HEADING_RE.findall(text)
    expected = [f"Stage {n}" for n in range(8)]
    assert sorted(found) == sorted(expected), (
        f"{DESIGN_MODE_MD}: expected exactly the stage headings "
        f"{expected}, found {found}"
    )
