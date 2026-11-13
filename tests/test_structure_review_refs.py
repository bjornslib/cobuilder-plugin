"""Reference tests for slice 14 (structure-coaching/E6): the architecture skill and the record.

Review Mode and Maintenance Mode each run structure_evidence.py, read
structure-findings.json, and judge or tag each finding through
references/structure-review.md. The tests check that each named file, option,
path, and label is present. They never check the wording of the prose. The
blind review pass covers the prose.

Run with: uv run pytest tests/test_structure_review_refs.py -q
"""
from __future__ import annotations

import re
import subprocess
from functools import cache
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
ARCHITECT_DIR = REPO_ROOT / "plugins" / "architect"
SKILL_MD = ARCHITECT_DIR / "skills" / "architecture" / "SKILL.md"
STRUCTURE_REVIEW = SKILL_MD.parent / "references" / "structure-review.md"
EVIDENCE_SCRIPT = REPO_ROOT / "shared" / "structure_evidence.py"
SCRIPT_NAME = "structure_evidence.py"
RECORD_FILE = "structure-findings.json"
REFERENCE_NAME = "references/structure-review.md"
REVIEW_HEADING = "### Review Mode"
MAINTENANCE_HEADING = "### Maintenance Mode"
JUDGMENT_LABELS = ("debt", "accepted", "false")
TREND_TAGS = ("new", "worse", "unchanged", "fixed")

PLUGIN_PATH_RE = re.compile(r"\$\{CLAUDE_PLUGIN_ROOT\}/(shared/[\w./-]+)")
OTHER_PLUGIN_RE = re.compile(r"(?<![\w.-])plugins/([\w.-]+)/")
HEADING_RE = re.compile(r"^#{1,3} ")
FENCE = "```"


def _text(path: Path) -> str:
    assert path.is_file(), f"{path} does not exist"
    return path.read_text(encoding="utf-8")


def _has_token(text: str, token: str) -> bool:
    """Return True when the token stands alone, so --out does not match --output."""
    return re.search(rf"(?<![\w-]){re.escape(token)}(?![\w-])", text) is not None


def _section(text: str, heading: str) -> str:
    """Return the lines from a heading to the next heading of level one to three.

    A line inside a code fence never ends a section.
    """
    lines = text.splitlines()
    start: int | None = None
    fenced = False
    for index, line in enumerate(lines):
        if line.lstrip().startswith(FENCE):
            fenced = not fenced
        elif fenced:
            continue
        elif start is None and line.strip() == heading:
            start = index
        elif start is not None and HEADING_RE.match(line):
            return "\n".join(lines[start:index])
    assert start is not None, f"SKILL.md has no '{heading}' heading"
    return "\n".join(lines[start:])


def _blocks_naming_script(section: str) -> list[str]:
    """Return the blocks of a section, split at blank lines, that name the script."""
    return [block for block in re.split(r"\n\s*\n", section) if SCRIPT_NAME in block]


@cache
def _script_help() -> str:
    """Run the evidence script with --help and return its standard output."""
    result = subprocess.run(
        ["uv", "run", str(EVIDENCE_SCRIPT), "--help"],
        capture_output=True,
        text=True,
        check=False,
        timeout=180,
    )
    assert result.returncode == 0, f"--help exited {result.returncode}: {result.stderr}"
    return result.stdout


def test_review_mode_runs_the_script_with_repo_and_out():
    blocks = _blocks_naming_script(_section(_text(SKILL_MD), REVIEW_HEADING))
    assert blocks, f"Review Mode does not name {SCRIPT_NAME}"
    assert any(_has_token(block, "--repo") and _has_token(block, "--out") for block in blocks), (
        f"no paragraph of Review Mode names {SCRIPT_NAME} with --repo and --out"
    )
    for option in ("--repo", "--out"):
        assert _has_token(_script_help(), option), f"{SCRIPT_NAME} --help does not list {option}"


def test_maintenance_mode_runs_the_script_with_since():
    blocks = _blocks_naming_script(_section(_text(SKILL_MD), MAINTENANCE_HEADING))
    assert blocks, f"Maintenance Mode does not name {SCRIPT_NAME}"
    assert any(_has_token(block, "--since") for block in blocks), (
        f"no paragraph of Maintenance Mode names {SCRIPT_NAME} with --since"
    )
    assert _has_token(_script_help(), "--since"), f"{SCRIPT_NAME} --help does not list --since"


def test_both_steps_name_the_record_file():
    text = _text(SKILL_MD)
    for heading in (REVIEW_HEADING, MAINTENANCE_HEADING):
        assert RECORD_FILE in _section(text, heading), f"{heading} does not name {RECORD_FILE}"


def test_skill_names_the_structure_review_reference():
    assert REFERENCE_NAME in _text(SKILL_MD), f"SKILL.md does not name {REFERENCE_NAME}"
    assert STRUCTURE_REVIEW.is_file(), f"{STRUCTURE_REVIEW} does not exist"


def test_both_steps_reach_the_script_through_the_plugin_root():
    text = _text(SKILL_MD)
    for heading in (REVIEW_HEADING, MAINTENANCE_HEADING):
        paths = {match.rstrip(".") for match in PLUGIN_PATH_RE.findall(_section(text, heading))}
        assert f"shared/{SCRIPT_NAME}" in paths, (
            f"{heading} does not name ${{CLAUDE_PLUGIN_ROOT}}/shared/{SCRIPT_NAME}"
        )
        for rel in sorted(paths):
            assert (ARCHITECT_DIR / rel).is_file(), f"{heading} names {rel}, which does not resolve"


def test_changed_files_name_no_other_plugin_path():
    for path in (SKILL_MD, STRUCTURE_REVIEW):
        other = {name for name in OTHER_PLUGIN_RE.findall(_text(path)) if name != "architect"}
        assert not other, f"{path.name} names another plugin: {sorted(other)}"


def test_the_reference_names_each_judgment_and_trend_label():
    text = _text(STRUCTURE_REVIEW)
    for label in JUDGMENT_LABELS + TREND_TAGS:
        assert _has_token(text, label), f"structure-review.md does not name the label {label!r}"
