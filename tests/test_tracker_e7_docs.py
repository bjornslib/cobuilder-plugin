"""Structure checks (E7-8): the docs name the new mapping, the new operations, and the migration steps.

Every check reads a structure: an operation that `tracker.py --help` lists, a heading that carries a pointer
to ADR-0044, the order of three steps in a file, or a name that must appear in a top-level document. No check
reads the wording of a sentence.

Run with: uv run pytest tests/test_tracker_e7_docs.py -q
"""
from __future__ import annotations

import json
import re

import pytest
import test_tracker_skip_slice_docs as skip_docs  # the moment table readers; no test function is imported
import test_tracker_usage_doc as usage_doc  # the console block readers; no test function is imported
from _tracker_cli_support import REPO_ROOT, assert_prose_ops_exist, cli_ops

LIFECYCLE = REPO_ROOT / "plugins" / "cobuilder-full-lifecycle"
INSTALL_DOCS = [LIFECYCLE / "commands" / "install.md", LIFECYCLE / "skills" / "cobuilder-setup" / "SKILL.md"]
SLICE_LOOP = REPO_ROOT / "plugins" / "implement" / "skills" / "build" / "references" / "slice-loop.md"
NOTES = REPO_ROOT / "shared" / "tracker-adapter-beads.md"
USAGE = usage_doc.DOC
REMINDER = skip_docs.MENTIONS["reminder script"]
OPERATION_DOCS = [USAGE, SLICE_LOOP, REMINDER, *INSTALL_DOCS]
# The sync worker is a background process that a write starts. A person never runs it, so the guide shows no moment for it.
BACKGROUND_OPS = {"sync-worker"}
OBSOLETE_HEADINGS = ("Custom issue types", "Pull request issues")


def _text(path) -> str:
    return path.read_text(encoding="utf-8")


def _row_operations() -> set[str]:
    return set().union(*(skip_docs._row_ops(row) for row in skip_docs._moment_rows()))


def _console_operations() -> set[str]:
    subcommands = usage_doc._help_subcommands()
    blocks = usage_doc._parse_blocks(_text(USAGE))
    return {usage_doc._operation(cmd.args, subcommands) for block in blocks for cmd in block.commands} - {None}


def _sections(text: str) -> dict[str, str]:
    parts = re.split(r"(?m)^#{2,3} (.+)$", text)
    return {parts[i]: parts[i + 1] for i in range(1, len(parts), 2)}


def test_the_help_lists_both_new_operations() -> None:
    assert {"claim-next", "migrate-mapping"} <= cli_ops()


@pytest.mark.parametrize("path", OPERATION_DOCS, ids=lambda p: p.name)
def test_every_operation_a_doc_names_is_listed_by_help(path) -> None:
    assert_prose_ops_exist([path])


@pytest.mark.parametrize("path", OPERATION_DOCS, ids=lambda p: p.name)
def test_no_doc_that_names_operations_holds_a_bd_command(path) -> None:
    assert usage_doc.BD_COMMAND.search(_text(path)) is None


def test_the_moment_table_names_both_new_operations() -> None:
    assert {"claim-next", "migrate-mapping"} <= _row_operations()


def test_every_operation_has_a_console_section() -> None:
    missing = cli_ops() - BACKGROUND_OPS - _console_operations()
    assert not missing, f"the usage guide has no console example for {sorted(missing)}"


def test_the_usage_guide_lists_mapping_and_native_ready_for_doctor() -> None:
    text = _text(USAGE)
    assert "native_ready" in text
    assert {"legacy", "native"} <= set(re.findall(r"mapping: (\w+)", text)), "doctor values of `mapping` are not listed"


def test_slice_loop_takes_the_next_slice_with_claim_next_and_rebuilds_the_index() -> None:
    text = _text(SLICE_LOOP)
    assert "claim-next" in text
    assert "build_index.py" in text


@pytest.mark.parametrize("path", INSTALL_DOCS, ids=lambda p: p.parent.name)
def test_an_existing_tracker_gets_a_snapshot_then_a_dry_run_then_the_run(path) -> None:
    text = _text(path)
    snapshot = text.lower().find("snapshot")
    dry = text.find("migrate-mapping --dry-run")
    runs = [m.start() for m in re.finditer(r"migrate-mapping(?! --dry-run)", text)]
    assert 0 <= snapshot < dry, "a snapshot step must come before the dry run"
    assert any(start > dry for start in runs), "the run must come after the dry run"


@pytest.mark.parametrize("path", INSTALL_DOCS, ids=lambda p: p.parent.name)
def test_the_word_consent_comes_after_the_first_dry_run(path) -> None:
    text = _text(path)
    assert 0 <= text.find("--dry-run") < text.lower().find("consent")


@pytest.mark.parametrize("path", [USAGE, *INSTALL_DOCS, REPO_ROOT / "README.md"], ids=lambda p: p.name)
def test_no_install_or_usage_text_says_prepare_sets_a_custom_type(path) -> None:
    assert not re.search(r"issue type list|types\.custom", _text(path))


@pytest.mark.parametrize("title", OBSOLETE_HEADINGS)
def test_each_obsolete_section_of_the_notes_is_dropped_or_points_to_adr_0044(title) -> None:
    section = _sections(_text(NOTES)).get(title)
    assert section is None or "ADR-0044" in section.strip().splitlines()[0]


def test_the_e5_gate_and_ready_sections_of_the_notes_are_dropped_or_point_to_adr_0044() -> None:
    stale = {
        title: body
        for title, body in _sections(_text(NOTES)).items()
        if re.match(r"E5-[34]\b", title) and "ADR-0044" not in body.strip().splitlines()[0]
    }
    assert not stale, f"live text under {sorted(stale)}"


def test_a_line_of_the_notes_that_sets_the_custom_type_points_to_adr_0044() -> None:
    lines = [ln for ln in _text(NOTES).splitlines() if re.search(r"types\.custom program|invalid issue type: program", ln)]
    assert all("ADR-0044" in ln for ln in lines), lines


@pytest.mark.parametrize(
    "name", ["claim-next", "migrate-mapping", "native ready", "label `cb`", "external_ref", "`feature`", "`milestone`"]
)
def test_the_top_level_documents_name_the_new_mapping(name) -> None:
    text = _text(REPO_ROOT / "README.md") + _text(REPO_ROOT / "CLAUDE.md")
    assert name in text.replace("native_ready", "native ready")


def test_every_plugin_version_matches_its_marketplace_entry() -> None:
    market = json.loads(_text(REPO_ROOT / ".claude-plugin" / "marketplace.json"))["plugins"]
    for entry in market:
        manifest = REPO_ROOT / "plugins" / entry["name"] / ".claude-plugin" / "plugin.json"
        assert json.loads(_text(manifest))["version"] == entry["version"], entry["name"]
