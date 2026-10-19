"""E4 slice 16: structure of the two SKILL.md files that touched epic state.

The artifact skill takes epic state from `tracker.py list-epics`. The pr odyssey skill no longer
tells the reader to fill pr or state in goal.json. Checks names and links, not wording.
Run with: uv run pytest tests/test_artifact_epic_state_prose.py -q
"""
from __future__ import annotations

import re
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
ARTIFACT_SKILL = REPO / "plugins" / "artifact" / "skills" / "cobuilder-artifacts" / "SKILL.md"
ODYSSEY_SKILL = REPO / "plugins" / "pr" / "skills" / "odyssey" / "SKILL.md"
STATE_WORDS = re.compile(r"\b(pr|state|branch)\b")


def _sentences(text: str) -> list[str]:
    flat = re.sub(r"\s+", " ", text)
    return re.split(r"(?<=[.:!?])\s+", flat)


def test_artifact_skill_names_list_epics() -> None:
    assert "list-epics" in ARTIFACT_SKILL.read_text(encoding="utf-8")


def test_artifact_skill_links_tracker_usage() -> None:
    assert "shared/tracker-usage.md" in ARTIFACT_SKILL.read_text(encoding="utf-8")
    assert (REPO / "shared" / "tracker-usage.md").is_file()


def test_artifact_skill_reads_no_epic_state_from_goal_json() -> None:
    hits = [s for s in _sentences(ARTIFACT_SKILL.read_text(encoding="utf-8"))
            if "goal.json" in s and STATE_WORDS.search(s)]
    assert hits == []


def test_odyssey_skill_fills_no_pr_or_state_in_goal_json() -> None:
    # Sentences that name goal.json with the pr or state fields to fill. Reading a branch to find a design is fine.
    hits = [s for s in _sentences(ODYSSEY_SKILL.read_text(encoding="utf-8"))
            if "goal.json" in s and re.search(r"\b(pr|state)\b", s)]
    assert hits == []
