"""Slice 24 (E7-2): the beads create argv and the read of the bd row fields. No bd is needed.

The transcripts map-create-<kind>.json, map-read.json, and map-lookup.json hold real bd 1.3.0 runs.
This file holds the create argv. The create argv order is in tests/_beads_mapping_support.py.
The read and lookup tests sit in test_tracker_beads_mapping_read.py. The legacy, prepare, and doctor
tests sit in test_tracker_beads_mapping_legacy.py. The seed tests sit in test_tracker_beads_mapping_seed.py.

Run with: uv run pytest tests/test_tracker_beads_mapping.py -q
"""
from __future__ import annotations

import json

import pytest

import _beads_mapping_support as m
import _beads_support as support

LIST_ARGS = ["list", "--json", "--all"]
EXPECTED_TYPE = {"program": "feature", "epic": "epic", "slice": "task", "pr": "milestone", "bare": "task"}
# The text flags that each recorded create must carry. The other text flags must be absent.
EXPECTED_TEXT_FLAGS = {
    "program": {"--description", "--acceptance", "--design"},
    "epic": {"--description", "--design"},
    "slice": {"--acceptance"},
    "pr": set(),
    "bare": set(),
}
NAMES = list(m.CREATES)


def _flag(argv: list[str], flag: str) -> str:
    return argv[argv.index(flag) + 1]


def _creates(calls: list[list[str]]) -> list[list[str]]:
    return [call for call in calls if call[0] == "create"]


def test_bd_type_maps_program_to_feature_and_pr_to_milestone() -> None:
    from tracker_port import beads_rows

    assert m.need(beads_rows, "BD_TYPE") == {"program": "feature", "epic": "epic", "slice": "task", "pr": "milestone"}
    assert m.need(beads_rows, "CB_LABEL") == "cb"


@pytest.mark.parametrize("name", NAMES)
def test_create_sends_exactly_the_recorded_argv(name: str) -> None:
    _, calls = m.replay_create(name, m.create_record_of(name))

    assert _creates(calls) == [m.create_argv(name)]


@pytest.mark.parametrize("name", NAMES)
def test_create_sends_the_native_type_the_title_and_the_label(name: str) -> None:
    record = m.create_record_of(name)
    _, calls = m.replay_create(name, record)
    create = _creates(calls)[0]

    assert _flag(create, "--type") == EXPECTED_TYPE[name]
    assert _flag(create, "--title") == (record.title or record.id)
    assert _flag(create, "--labels") == "cb"
    assert json.loads(_flag(create, "--metadata"))["cb"]["id"] == record.id


@pytest.mark.parametrize("name", NAMES)
def test_create_sends_a_text_flag_only_for_a_set_field(name: str) -> None:
    record = m.create_record_of(name)
    _, calls = m.replay_create(name, record)
    create = _creates(calls)[0]

    assert {flag for flag in m.TEXT_FLAGS if flag in create} == EXPECTED_TEXT_FLAGS[name]
    for flag, field in zip(m.TEXT_FLAGS, ("description", "acceptance_criteria", "design")):
        if flag in create:
            assert _flag(create, flag) == getattr(record, field)


def test_a_record_with_no_text_and_no_ref_sends_neither_text_flags_nor_external_ref() -> None:
    _, calls = m.replay_create("bare", m.create_record_of("bare"))
    create = _creates(calls)[0]

    assert not any(flag in create for flag in (*m.TEXT_FLAGS, "--external-ref")), create
    assert not any(call[:2] == ["list", "--external-ref"] for call in calls), "no ref, so no lookup"
    assert _flag(create, "--title") == "mapdemo-bare"


def test_an_empty_title_and_empty_text_count_as_unset() -> None:
    empty = m.create_record_of("bare", title="", description="", acceptance_criteria="", design="")

    _, calls = m.replay_create("bare", empty)

    assert _creates(calls) == [m.create_argv("bare")]


def test_a_pull_request_create_sends_the_gh_ref_and_the_ref_as_title() -> None:
    _, calls = m.replay_create("pr", m.create_record_of("pr"))
    create = _creates(calls)[0]

    assert _flag(create, "--external-ref") == "gh-101"
    assert _flag(create, "--title") == "pr-101"
    assert _flag(create, "--type") == "milestone"


@pytest.mark.parametrize("name", ["program", "epic", "slice", "pr"])
def test_create_looks_up_the_external_ref_after_the_list_and_before_the_create(name: str) -> None:
    record = m.create_record_of(name)
    _, calls = m.replay_create(name, record)

    assert calls[0] == LIST_ARGS
    assert calls[1] == m.lookup_argv(record.external_ref)
    assert calls[2][0] == "create"
    assert calls[-1] == ["sync"]


def test_create_refuses_a_ref_that_a_row_already_holds_and_sends_no_create() -> None:
    from tracker_port.beads import BeadsAdapter
    from tracker_port.port import ArgumentError

    held = json.loads(support.steps("map-lookup")[0]["stdout"])
    runner = support.SequenceRunner(
        [
            {"args": LIST_ARGS, "stdout": "[]"},
            {"args": m.lookup_argv("gh-101"), "stdout": json.dumps(held)},
        ]
    )

    with pytest.raises(ArgumentError, match="already exists"):
        BeadsAdapter(runner).create_record(m.create_record_of("pr"))

    assert runner.calls == [LIST_ARGS, m.lookup_argv("gh-101")]
