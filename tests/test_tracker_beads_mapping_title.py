"""Slice 24 (E7-2): one constant, tracker_port.record.TITLE_RULE, sets the title of every create.

The rule `name` sends the bare name. The rule `id-and-name` sends `<cb id> — <name>`. A pull request keeps its
ref under both rules, and a record with no name keeps its cb id. Both the create_record path and the seed path obey
the constant. No bd is needed.

Run with: uv run pytest tests/test_tracker_beads_mapping_title.py -q
"""
from __future__ import annotations

import pytest

import _beads_mapping_seed_support as seed
import _beads_mapping_support as m

RULES = (seed.RULE_NAME, seed.RULE_ID_AND_NAME)
NAMES = ("program", "epic", "slice", "pr", "bare")
# A seeded program whose name is its own id has no separate name, so the two rules would need an extra decision.
SEEDED = [cb_id for cb_id, fields in seed.EXPECTED.items() if fields[0] != cb_id]


def _created_titles(rule: str, monkeypatch: pytest.MonkeyPatch) -> dict[str, str]:
    from tracker_port.beads import BeadsAdapter

    seed.use_title_rule(monkeypatch, rule)
    runner = seed.WriteRunner([])
    adapter = BeadsAdapter(runner)
    for name in NAMES:
        adapter.create_record(m.create_record_of(name))
    return {cb_id: m.flag_value(argv, "--title") for cb_id, argv in runner.creates().items()}


def test_the_two_legal_values_of_the_rule_are_pinned() -> None:
    assert (seed.RULE_NAME, seed.RULE_ID_AND_NAME) == ("name", "id-and-name")
    assert seed.ID_NAME_SEPARATOR == " — "


@pytest.mark.parametrize("rule", RULES)
@pytest.mark.parametrize("name", NAMES)
def test_create_record_title_follows_the_rule(name: str, rule: str, monkeypatch: pytest.MonkeyPatch) -> None:
    spec = m.CREATES[name]
    titles = _created_titles(rule, monkeypatch)

    assert titles[spec["id"]] == seed.expected_title(rule, spec["id"], spec["kind"], spec["title"])


def test_create_record_default_rule_gives_the_bare_name() -> None:
    from tracker_port.beads import BeadsAdapter

    runner = seed.WriteRunner([])
    adapter = BeadsAdapter(runner)
    for name in NAMES:
        adapter.create_record(m.create_record_of(name))
    titles = {cb_id: m.flag_value(argv, "--title") for cb_id, argv in runner.creates().items()}

    assert titles == {"mapdemo": "Mapping demo", "mapdemo/E1": "Epic name", "mapdemo/1": "Slice name", "pr-101": "pr-101", "mapdemo-bare": "mapdemo-bare"}


def test_create_record_titles_differ_between_the_two_rules_for_each_named_kind(monkeypatch: pytest.MonkeyPatch) -> None:
    by_rule = {rule: _created_titles(rule, monkeypatch) for rule in RULES}

    changed = {cb_id for cb_id in by_rule["name"] if by_rule["name"][cb_id] != by_rule["id-and-name"][cb_id]}
    assert changed == {"mapdemo", "mapdemo/E1", "mapdemo/1"}


@pytest.mark.parametrize("rule", RULES)
@pytest.mark.parametrize("cb_id", SEEDED)
def test_seed_title_follows_the_rule(cb_id: str, rule: str, monkeypatch: pytest.MonkeyPatch) -> None:
    from tracker_port.files import FilesAdapter

    seed.use_title_rule(monkeypatch, rule)
    kind = next(r.kind for r in FilesAdapter(seed.PLANS).all_records() if r.id == cb_id)
    argv = seed.seed_creates()[cb_id]

    assert m.flag_value(argv, "--title") == seed.expected_title(rule, cb_id, kind, seed.EXPECTED[cb_id][0])


def test_seed_default_rule_gives_the_bare_name() -> None:
    creates = seed.seed_creates()

    assert {cb_id: m.flag_value(argv, "--title") for cb_id, argv in creates.items()} == {
        cb_id: fields[0] for cb_id, fields in seed.EXPECTED.items()
    }


def test_seed_with_the_id_and_name_rule_changes_each_named_title_and_keeps_the_text(monkeypatch: pytest.MonkeyPatch) -> None:
    seed.use_title_rule(monkeypatch, seed.RULE_ID_AND_NAME)
    creates = seed.seed_creates()

    assert m.flag_value(creates["mapped/1"], "--title") == "mapped/1 — Read the row fields"
    assert m.flag_value(creates["mapped/E1"], "--title") == "mapped/E1 — Core mapping"
    assert m.flag_value(creates["mapped"], "--title") == "mapped — Mapped program title"
    assert m.flag_value(creates["mapped/1"], "--acceptance") == "A read returns the four text fields"
