"""Install runs `tracker.py prepare` for beads, after it asks, before the backfill dry run.

The checks read structure: the order of the commands in the setup skill, the question before the
command, and the operation name in the usage guide. They do not assert wording.

Run with: uv run pytest tests/test_install_prepare_step.py -q
"""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SETUP_SKILL = ROOT / "plugins/cobuilder-full-lifecycle/skills/cobuilder-setup/SKILL.md"
USAGE = ROOT / "shared/tracker-usage.md"
PREPARE = "tracker.py prepare"
BD_COMMAND = re.compile(r"`bd\b|\bbd[ \t]+(?:config|create|update|init|list|show|sync|close|dep|ready)\b")


def _text(path: Path) -> str:
    assert path.is_file(), f"missing {path.relative_to(ROOT)}"
    return path.read_text(encoding="utf-8")


def _prepare_step() -> str:
    """The skill line that runs `tracker.py prepare`."""
    text = _text(SETUP_SKILL)
    start = text.find(PREPARE)
    assert start != -1, f"the setup skill never runs `{PREPARE}`"
    begin = text.rfind("\n", 0, start) + 1
    end = text.find("\n", start)
    return text[begin : end if end != -1 else len(text)]


def test_setup_skill_runs_prepare_before_the_backfill_dry_run() -> None:
    text = _text(SETUP_SKILL)
    prepare = text.find(PREPARE)
    dry_run = text.find("tracker.py seed-from-files")

    assert prepare != -1, f"the setup skill never runs `{PREPARE}`"
    assert dry_run != -1, "the setup skill names no `tracker.py seed-from-files`"
    assert prepare < dry_run, "`tracker.py prepare` comes after the seed-from-files step"


def test_setup_skill_asks_the_engineer_before_it_runs_prepare() -> None:
    step = _prepare_step()
    ask = re.search(r"\bask", step, re.IGNORECASE)

    assert ask is not None, f"the prepare step never asks the engineer: {step!r}"
    assert ask.start() < step.find(PREPARE), "the prepare step runs the command before it asks"


def test_setup_skill_runs_prepare_only_for_the_beads_adapter() -> None:
    step = _prepare_step()

    assert re.search(r"\bbeads\b", step), f"the prepare step does not name the beads adapter: {step!r}"


def test_setup_skill_prepare_step_names_no_bd_command() -> None:
    match = BD_COMMAND.search(_prepare_step())

    assert match is None, f"the prepare step names a bd command: {match.group(0)!r}"


def test_usage_guide_names_the_prepare_operation() -> None:
    assert PREPARE in _text(USAGE), f"shared/tracker-usage.md never names `{PREPARE}`"
