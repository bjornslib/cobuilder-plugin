"""Install creates .cobuilder/tracker.yaml, and the usage guide names its keys.

Structure checks only. The setup skill must name the file, name the adapter choices, ask before it
writes, and place this step before the backfill dry run. The usage guide must hold a short
Configuration section that names the file and each key.

Run with: uv run pytest tests/test_install_tracker_config.py -q
"""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SETUP_SKILL = ROOT / "plugins/cobuilder-full-lifecycle/skills/cobuilder-setup/SKILL.md"
INSTALL_COMMAND = ROOT / "plugins/cobuilder-full-lifecycle/commands/install.md"
USAGE = ROOT / "shared/tracker-usage.md"
CONFIG_FILE = ".cobuilder/tracker.yaml"
CONFIG_KEYS = ["adapter", "plans_dir", "corpus", "state_file", "bd"]


def _text(path: Path) -> str:
    assert path.is_file(), f"missing {path.relative_to(ROOT)}"
    return path.read_text(encoding="utf-8")


def _config_step() -> str:
    """The skill text from the first mention of the config file to the first backfill command."""
    text = _text(SETUP_SKILL)
    start = text.find(CONFIG_FILE)
    assert start != -1, f"SKILL.md never names {CONFIG_FILE}"
    end = text.find("seed-from-files", start)
    assert end != -1, "SKILL.md names no seed-from-files command after the config step"
    return text[start:end]


def test_setup_skill_names_the_config_file_before_the_backfill_dry_run() -> None:
    text = _text(SETUP_SKILL)
    first_name = text.find(CONFIG_FILE)
    first_seed = text.find("seed-from-files")

    assert first_name != -1, f"SKILL.md never names {CONFIG_FILE}"
    assert first_seed != -1, "SKILL.md names no seed-from-files command"
    assert first_name < first_seed, f"{CONFIG_FILE} first appears after the seed-from-files step"


def test_setup_skill_names_the_beads_and_files_choices() -> None:
    step = _config_step()

    assert re.search(r"`beads`|\bbeads\b", step), "the config step names no beads choice"
    assert re.search(r"`files`|\bfiles\b", step), "the config step names no files choice"


def test_setup_skill_does_not_offer_the_fake_adapter() -> None:
    step = _config_step()

    for line in step.splitlines():
        if "fake" in line:
            assert re.search(r"\b(not|never|no)\b", line), f"the config step offers fake: {line!r}"


def test_setup_skill_asks_which_adapter_before_it_names_the_beads_file_content() -> None:
    step = _config_step()
    ask = re.search(r"\bask", step, re.IGNORECASE)
    content = step.find("adapter: beads")

    assert ask is not None, "the config step never asks the engineer"
    assert content != -1, "the config step never says the file holds `adapter: beads`"
    assert ask.start() < content, "the config step names the file content before it asks which adapter"


def test_setup_skill_places_the_config_step_after_the_adapter_check_text_and_before_the_dry_run() -> None:
    text = _text(SETUP_SKILL)
    dry_run = text.find("--dry-run")
    last_name_before_dry_run = text.rfind(CONFIG_FILE, 0, dry_run)

    assert dry_run != -1, "SKILL.md names no --dry-run"
    assert last_name_before_dry_run != -1, f"{CONFIG_FILE} is not named before the --dry-run step"


def test_install_command_names_the_config_file() -> None:
    assert CONFIG_FILE in _text(INSTALL_COMMAND), f"install.md never names {CONFIG_FILE}"


def _configuration_section() -> str:
    text = _text(USAGE)
    match = re.search(r"^## Configuration[ \t]*\n(.*?)(?=^## |\Z)", text, re.M | re.S)
    assert match is not None, "shared/tracker-usage.md has no '## Configuration' section"
    return match.group(1)


def test_usage_guide_configuration_section_names_the_file() -> None:
    assert CONFIG_FILE in _configuration_section()


def test_usage_guide_configuration_section_names_each_key() -> None:
    section = _configuration_section()
    missing = [
        key
        for key in CONFIG_KEYS
        if not re.search(rf"`{key}`|^\s*{key}:", section, re.M)
    ]

    assert not missing, f"the Configuration section names no key {missing} (as `key` or a `key:` line)"
