"""Reference tests for slice 15 (structure-coaching/E9): a backlog design from debt.

Review Mode step 12 and references/structure-review.md tell the review to
propose docs/architecture/designs/<name>/goal.json with stage "backlog" and
one planned epic for each group of debt findings. The structural tests check
that each named key, value, path, and command is present. No code span may
name a build operation. They never check the wording of the prose. The blind
review pass covers the behavior. The effect test runs the design loader of
shared/build_index.py on a minimal backlog goal.json.

Run with: uv run pytest tests/test_structure_backlog_refs.py -q
"""
from __future__ import annotations

import json
import re
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
SKILL_MD = REPO_ROOT / "plugins" / "architect" / "skills" / "architecture" / "SKILL.md"
STRUCTURE_REVIEW = SKILL_MD.parent / "references" / "structure-review.md"
REFERENCE_NAME = "references/structure-review.md"
DESIGN_PATH_RE = re.compile(r"docs/architecture/designs/<[\w.-]+>/goal\.json")
HEADING_RE = re.compile(r"^(#{1,6}) (.*)$")
CODE_SPAN_RE = re.compile(r"`([^`\n]+)`")
GOAL_TOKENS = ("stage", "epics", "findings", "backlog")
EPIC_TOKENS = ("id", "slug", "title", "outcome", "findings")
BUILD_OPERATIONS = ("seed-from-files", "claim-next", "claim-slice")
BACKLOG_NAME = "debt-follow-up"
BACKLOG_GOAL = {
    "name": BACKLOG_NAME,
    "title": "Follow up the structure debt",
    "outcome": "Each group of structure debt has one planned epic.",
    "done_when": [],
    "abort_if": [],
    "stage": "backlog",
    "epics": [
        {
            "id": "E1",
            "slug": "split-billing-folder",
            "title": "Split the billing folder",
            "outcome": "Billing code sits in folders with one reason to change each.",
            "findings": ["crowded-folder|src/billing"],
        },
        {
            "id": "E2",
            "slug": "replace-generic-utils",
            "title": "Replace the generic utils module",
            "outcome": "No module gathers unrelated code under one generic name.",
            "findings": ["generic-name|src/common|utils"],
        },
    ],
}


def _text(path: Path) -> str:
    assert path.is_file(), f"{path} does not exist"
    return path.read_text(encoding="utf-8")


def _heading_blocks(text: str, word: str) -> str:
    """Return each block whose heading names the word, in any case.

    A block runs from its heading to the next heading of the same level or
    higher. A line inside a code fence never starts or ends a block.
    """
    kept: list[str] = []
    depth: int | None = None
    fenced = False
    for line in text.splitlines():
        if line.lstrip().startswith("```"):
            fenced = not fenced
        match = None if fenced else HEADING_RE.match(line)
        if match and depth is not None and len(match.group(1)) <= depth:
            depth = None
        if match and depth is None and word.lower() in match.group(2).lower():
            depth = len(match.group(1))
        if depth is not None:
            kept.append(line)
    return "\n".join(kept)


def _has_code_token(text: str, token: str) -> bool:
    """Return True when a code span names the token as a whole word."""
    pattern = re.compile(rf"(?<![\w-]){re.escape(token)}(?![\w-])")
    return any(pattern.search(span) for span in CODE_SPAN_RE.findall(text))


def _backlog_section() -> str:
    return _heading_blocks(_text(STRUCTURE_REVIEW), "backlog")


def _missing_code_tokens(section: str, tokens: tuple[str, ...]) -> list[str]:
    return [token for token in tokens if not _has_code_token(section, token)]


def _step_block(text: str, number: int) -> str:
    """Return numbered item `number` and its indented lines, up to the next unindented text."""
    lines = text.splitlines()
    start = next((i for i, line in enumerate(lines) if line.startswith(f"{number}. ")), None)
    assert start is not None, f"Review Mode has no step {number}"
    end = start + 1
    while end < len(lines) and (not lines[end].strip() or lines[end].startswith(" ")):
        end += 1
    return "\n".join(lines[start:end])


def test_backlog_section_names_the_goal_keys_and_the_stage_value():
    missing = _missing_code_tokens(_backlog_section(), GOAL_TOKENS)
    assert not missing, f"the backlog section does not name these as code tokens: {missing}"


def test_backlog_section_names_the_epic_keys():
    missing = _missing_code_tokens(_backlog_section(), EPIC_TOKENS)
    assert not missing, f"the backlog section does not name these epic keys as code tokens: {missing}"


def test_backlog_section_moves_the_stage_through_the_tracker():
    paragraphs = [p for p in re.split(r"\n\s*\n", _backlog_section()) if p.strip()]
    runs_set_stage = any(
        re.search(r'tracker\.py"?\s+set-program-stage', p) and re.search(r"\bbacklog\b", p)
        for p in paragraphs
    )
    assert runs_set_stage, "the backlog section does not run tracker.py set-program-stage with backlog"
    names_exit_2 = any(
        re.search(r"\bexit\w*\b[^\n]{0,40}?\b2\b", p, re.IGNORECASE) and re.search(r"\bstage\b", p)
        for p in paragraphs
    )
    assert names_exit_2, "the backlog section does not say that exit 2 writes stage into goal.json"


def test_review_step_12_names_the_backlog_design_path():
    step = _step_block(_heading_blocks(_text(SKILL_MD), "architect review mode"), 12)
    assert REFERENCE_NAME in step, f"Review Mode step 12 does not name {REFERENCE_NAME}"
    assert DESIGN_PATH_RE.search(step), (
        "Review Mode step 12 does not name docs/architecture/designs/<name>/goal.json"
    )


def test_backlog_section_groups_only_the_debt_findings():
    assert _has_code_token(_backlog_section(), "debt"), (
        "the backlog section does not name the `debt` judgment as the source of the epics"
    )


def test_backlog_section_waits_for_the_engineer_before_it_writes():
    assert _has_code_token(_backlog_section(), "AskUserQuestion"), (
        "the backlog section does not name AskUserQuestion for the engineer's confirmation"
    )


def test_backlog_section_starts_no_build():
    """A build operation counts only in a code span, so a plain-word mention passes."""
    section = _backlog_section()
    assert section, "structure-review.md has no heading that names the backlog design"
    named = [op for op in BUILD_OPERATIONS if _has_code_token(section, op)]
    assert not named, f"the backlog section names build operations: {named}"


def test_backlog_goal_passes_the_design_loader_of_build_index(tmp_path: Path) -> None:
    """Effect test. It may pass before the reference exists, because it checks the loader alone."""
    import _tracker_port_support  # noqa: F401  (puts shared/ on sys.path)
    import build_index
    from tracker_port import reader

    repo = tmp_path / "repo"
    design = repo / "docs" / "architecture" / "designs" / BACKLOG_NAME
    design.mkdir(parents=True)
    (design / "goal.json").write_text(json.dumps(BACKLOG_GOAL), encoding="utf-8")

    designs, epics, viewer, failures = build_index.collect_designs(repo, reader.snapshot(repo), [])

    assert failures == [], failures
    by_id = {entity["id"]: entity for entity in designs}
    assert BACKLOG_NAME in by_id, designs
    assert (by_id[BACKLOG_NAME]["stage"], by_id[BACKLOG_NAME]["stage_source"]) == ("backlog", "goal")
    assert [epic["id"] for epic in epics] == [f"{BACKLOG_NAME}/E1", f"{BACKLOG_NAME}/E2"], epics
    record = viewer.get(BACKLOG_NAME, {})
    cited = [epic.get("findings") for epic in record.get("goal", {}).get("epics", [])]
    assert cited == [epic["findings"] for epic in BACKLOG_GOAL["epics"]], cited
