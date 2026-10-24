"""Slice 24 (E7-2): the seed fills title and text fields from the files, and a field with no source sends no flag.

The fixture tests/fixtures/tracker/plans-mapping holds three plans and designs:
- `mapped`: a plan and a design with a title, an outcome, and a done-when list. Epic E1 has an outcome
  and an epic design file. Epic E2 has neither.
- `bare`: a plan with no design, so no description, no acceptance criteria, and no design path.
- `solo`: a design with no plan. Its goal.json gives the program and its epic.
No bd is needed.

Run with: uv run pytest tests/test_tracker_beads_mapping_seed.py -q
"""
from __future__ import annotations

from typing import Any

import pytest

import _beads_mapping_seed_support as seed
import _beads_mapping_support as m


def _files_records() -> dict[str, Any]:
    from tracker_port.files import FilesAdapter

    return {record.id: record for record in FilesAdapter(seed.PLANS).all_records()}


def _seed_creates() -> tuple[Any, dict[str, list[str]]]:
    from tracker_port.beads import BeadsAdapter

    runner = seed.WriteRunner([])
    BeadsAdapter(runner).seed_from_files(seed.PLANS)
    return runner, runner.creates()


def test_the_title_rule_is_one_constant_that_names_the_recommended_rule() -> None:
    from tracker_port import record

    assert m.need(record, "TITLE_RULE") == "name"


@pytest.mark.parametrize("cb_id", seed.EXPECTED)
def test_the_files_adapter_fills_the_title_and_text_fields_from_its_sources(cb_id: str) -> None:
    title, description, acceptance, design = seed.EXPECTED[cb_id]
    record = _files_records()[cb_id]

    held_title, held_description, held_acceptance, held_design = m.text_of(record)
    assert (held_title, held_description, held_acceptance) == (title, description, acceptance)
    seed.check_design(held_design, design)


def test_the_files_adapter_keeps_the_external_ref_of_each_record_as_its_cb_id() -> None:
    assert all(record.external_ref == cb_id for cb_id, record in _files_records().items())


@pytest.mark.parametrize("cb_id", seed.EXPECTED)
def test_the_seed_sends_the_title_and_each_text_flag_that_has_a_source(cb_id: str) -> None:
    title, description, acceptance, design = seed.EXPECTED[cb_id]
    _, creates = _seed_creates()
    argv = creates[cb_id]

    assert m.flag_value(argv, "--title") == title
    assert m.flag_value(argv, "--description") == description
    assert m.flag_value(argv, "--acceptance") == acceptance
    seed.check_design(m.flag_value(argv, "--design"), design)


@pytest.mark.parametrize("cb_id", seed.EXPECTED)
def test_the_seed_sends_no_flag_for_a_field_with_no_source_and_no_empty_value(cb_id: str) -> None:
    _, creates = _seed_creates()
    argv = creates[cb_id]
    sources = seed.EXPECTED[cb_id][1:]

    for flag, source in zip(m.TEXT_FLAGS, sources):
        assert (flag in argv) == (source is not None), (cb_id, flag)
    assert "" not in argv, argv


@pytest.mark.parametrize("cb_id", seed.EXPECTED)
def test_the_seed_sends_the_native_type_the_label_and_the_cb_id_as_external_ref(cb_id: str) -> None:
    runner, creates = _seed_creates()
    argv = creates[cb_id]

    assert m.flag_value(argv, "--type") == seed.KIND_TYPE[_files_records()[cb_id].kind]
    assert m.flag_value(argv, "--labels") == "cb"
    assert m.flag_value(argv, "--external-ref") == cb_id
    assert any(call == m.lookup_argv(cb_id) for call in runner.calls), "each create checks its external ref first"

