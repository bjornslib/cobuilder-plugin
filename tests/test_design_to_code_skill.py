"""Proof that the vendored `design-to-code` skill survived its trim to three steps.

The skill was forked from another repository and cut from five steps to three.
This test reads the skill tree from disk. It needs no network and no model. A
later edit that restores a removed step, a deleted file, or the old product
vocabulary fails here rather than in a session.

Test 6 couples `templates/interaction-design.md` to the gate checker at
`plugins/implement/scripts/verify_gate.py`. The checker reads the same eight
headings at Gate 4c. A change to either side fails a test instead of a gate.

Run with: uv run --with pytest pytest tests/ -v
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

import yaml

REPO_ROOT = Path(__file__).resolve().parent.parent

# The vendored skill under test.
SKILL_DIR = REPO_ROOT / "plugins" / "implement" / "skills" / "design-to-code"

sys.path.insert(0, str(REPO_ROOT / "plugins" / "implement" / "scripts"))

import verify_gate as vg  # noqa: E402

# A backtick-quoted span that names a file inside the skill directory ends
# with one of these suffixes.
CITED_PATH_SUFFIXES = (".md", ".jsonc", ".css", ".tsx")

# A span that starts with one of these prefixes names a path in the target
# project, a URL, or a command. It is not a path inside the skill directory.
CITATION_SKIP_PREFIXES = (
    "docs/",
    "app/",
    "styles/",
    "components/",
    "_components/",
    "http",
    "@/",
    "npx",
    "mcp__",
)

# A span that holds one of these characters is a placeholder, a glob, or
# prose. It is not a literal path inside the skill directory.
CITATION_SKIP_CHARS = ("<", ">", "{", "}", "*", " ")


def _all_skill_files() -> list[Path]:
    """Return every file in the skill tree, in a stable order."""
    return sorted(path for path in SKILL_DIR.rglob("*") if path.is_file())


def _read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def _cited_paths_in(markdown_path: Path) -> list[str]:
    """Extract the backtick-quoted skill paths cited in one markdown file.

    Each line is scanned on its own. A whole-file scan would pair a fenced
    code block's opening fence with the next backtick anywhere below it and
    swallow the prose between the two, so the citations inside that prose
    would never be seen.
    """
    pattern = re.compile(r"`([^`]+)`")
    found: list[str] = []
    for line in _read(markdown_path).splitlines():
        for match in pattern.finditer(line):
            candidate = match.group(1)
            if not _looks_like_cited_skill_path(candidate):
                continue
            found.append(candidate)
    return found


def _looks_like_cited_skill_path(candidate: str) -> bool:
    """Decide whether one backtick span names a file inside the skill directory."""
    if "/" not in candidate:
        return False
    if not candidate.endswith(CITED_PATH_SUFFIXES):
        return False
    if candidate.startswith(CITATION_SKIP_PREFIXES):
        return False
    return not any(char in candidate for char in CITATION_SKIP_CHARS)


def _section_body(markdown_text: str, heading: str) -> str:
    """Return the text of one level-two section, excluding the heading line."""
    lines = markdown_text.splitlines()
    start = next(index for index, line in enumerate(lines) if line.strip() == heading)
    body: list[str] = []
    for line in lines[start + 1 :]:
        if line.startswith("## ") and line.strip() != heading:
            break
        body.append(line)
    return "\n".join(body)


def test_skill_frontmatter_parses() -> None:
    """The frontmatter carries every field, and the title and description fit."""
    text = _read(SKILL_DIR / "SKILL.md")
    frontmatter_blocks = text.split("---")
    frontmatter = yaml.safe_load(frontmatter_blocks[1])

    assert isinstance(frontmatter, dict), "the frontmatter must parse as a mapping"
    for field in ("title", "description", "status", "type", "last_verified"):
        assert field in frontmatter, f"the frontmatter is missing the field: {field}"

    assert frontmatter["title"] == "design-to-code"
    # A session must tell this skill apart from `architect:design`, which means
    # "interview an engineer and write intent.json". The front end phrase is
    # the part that separates the two.
    assert "front end" in frontmatter["description"].lower(), (
        "the description must name a front end, so a session can tell this "
        "skill from architect:design"
    )


def test_overview_names_three_steps() -> None:
    """The skill holds three step headings, and the overview names all three."""
    text = _read(SKILL_DIR / "SKILL.md")
    step_headings = [line for line in text.splitlines() if line.startswith("## Step")]

    assert len(step_headings) == 3, f"expected three step headings, found: {step_headings}"
    numbers = [int(re.search(r"^## Step (\d+)", heading).group(1)) for heading in step_headings]
    assert numbers == [1, 2, 3], f"the step numbers must run 1, 2, 3 in order, found: {numbers}"
    assert not any(line.startswith("## Step 4") for line in text.splitlines()), (
        "a fourth step heading must not return"
    )

    overview = _section_body(text, "## Workflow Overview")
    for step in ("Step 1:", "Step 2:", "Step 3:"):
        assert step in overview, (
            f"the Workflow Overview block must name {step}, so the prose "
            "overview and the real headings agree"
        )


def test_every_relative_path_cited_resolves() -> None:
    """Every literal skill path cited in prose exists on disk."""
    cited = [
        (markdown_path.name, candidate)
        for markdown_path in sorted(SKILL_DIR.rglob("*.md"))
        for candidate in _cited_paths_in(markdown_path)
    ]
    missing = [
        f"{source} cites {candidate}"
        for source, candidate in cited
        if not (SKILL_DIR / candidate).exists()
    ]

    assert not missing, f"cited skill paths that do not resolve: {missing}"
    # Without this floor the test passes in silence when the extractor finds
    # nothing at all.
    assert len(cited) >= 6, (
        f"the extractor resolved only {len(cited)} cited paths, so this test "
        "cannot trust its own coverage"
    )


def test_deleted_files_are_not_cited() -> None:
    """The three trimmed product-document files are gone, and nothing cites them."""
    removed_strings = ("brief-template", "templates/prd.md", "workflow-matrix-prd")
    for path in _all_skill_files():
        text = _read(path)
        for removed in removed_strings:
            assert removed not in text, f"{path.relative_to(SKILL_DIR)} still cites {removed}"

    removed_files = (
        SKILL_DIR / "templates" / "brief-template.md",
        SKILL_DIR / "templates" / "prd.md",
        SKILL_DIR / "examples" / "workflow-matrix-prd.md",
    )
    for removed_file in removed_files:
        assert not removed_file.exists(), (
            f"{removed_file.relative_to(SKILL_DIR)} must not travel with the skill"
        )


def test_terminology_is_epic_based() -> None:
    """The skill uses the CoBuilder words, not the old product-document words."""
    for path in _all_skill_files():
        text = _read(path).lower()
        assert "prd" not in text, f"{path.relative_to(SKILL_DIR)} still uses the word PRD"
        assert "brief" not in text, f"{path.relative_to(SKILL_DIR)} still uses the word brief"


def test_required_headings_are_present() -> None:
    """The template holds all eight headings the Gate 4c checker requires."""
    template = _read(SKILL_DIR / "templates" / "interaction-design.md")
    missing = [heading for heading in vg.REQUIRED_INTERACTION_SECTIONS if heading not in template]
    assert not missing, (
        f"templates/interaction-design.md is missing these headings: {missing}. "
        "A missing heading fails the Gate 4c check at "
        "plugins/implement/scripts/verify_gate.py."
    )
