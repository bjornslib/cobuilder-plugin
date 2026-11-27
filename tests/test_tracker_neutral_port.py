"""The neutral port files name no bd concept. Only the beads modules map to bd (ADR-0040, ADR-0044)."""

from __future__ import annotations

import re
from pathlib import Path

PORT = Path(__file__).resolve().parent.parent / "shared" / "tracker_port"
BEADS_FILES = {p.name for p in PORT.glob("beads*.py")} | {"bd_runner.py"}
NEUTRAL = sorted(p for p in PORT.glob("*.py") if p.name not in BEADS_FILES and p.name != "config.py")
BD_WORDS = re.compile(r"\b(?:bd_title|TITLE_RULE|BD_TYPE|CB_LABEL|types\.custom|BdRunner)\b|--labels|issue_type")
BEADS_IMPORT = re.compile(r"^\s*(?:from \.(?:beads\w*|bd_runner)|import .*beads)", re.M)


def test_no_neutral_module_names_a_bd_concept() -> None:
    hits = [p.name for p in NEUTRAL if BD_WORDS.search(p.read_text(encoding="utf-8"))]
    assert hits == [], f"neutral modules that name a bd concept: {hits}"


def test_no_neutral_module_imports_a_beads_module() -> None:
    hits = [p.name for p in NEUTRAL if BEADS_IMPORT.search(p.read_text(encoding="utf-8"))]
    assert hits == [], f"neutral modules that import a beads module: {hits}"


def test_the_migration_operation_is_not_part_of_the_base_port() -> None:
    from tracker_port import port

    assert "migrate_mapping" not in vars(port.TrackerPort)
    assert "migrate_mapping" in vars(port.MappingMigrationPort)
