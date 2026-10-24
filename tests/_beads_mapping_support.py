"""Shared helpers for the E7-2 mapping tests. Not a test module.

The transcripts map-create-<kind>.json, map-read.json, and map-lookup.json hold real bd 1.3.0
answers. The create argv they hold is the contract of E7-2:

    create --silent [--parent P] --type T --title X --priority N --labels cb [--status S]
        [--external-ref R] [--description D] [--acceptance A] [--design G] [--assignee U] --metadata M
"""
from __future__ import annotations

import copy
import json
from typing import Any

import _beads_support as support

TEXT_FLAGS = ("--description", "--acceptance", "--design")

# The cb id, the kind, the parent cb id, the external ref, and the four text fields of each recorded create.
CREATES: dict[str, dict[str, Any]] = {
    "program": {
        "id": "mapdemo", "kind": "program", "parent": None, "external_ref": "mapdemo", "title": "Mapping demo",
        "description": "A program outcome.", "acceptance_criteria": "First done-when\nSecond done-when",
        "design": "docs/architecture/designs/mapdemo", "envelope": {"stage": "design"},
    },
    "epic": {
        "id": "mapdemo/E1", "kind": "epic", "parent": "mapdemo", "external_ref": "mapdemo/E1", "title": "Epic name",
        "description": "The epic outcome.", "acceptance_criteria": None,
        "design": "docs/plans/mapdemo/epic-E1-design.md", "envelope": {"epic_id": "E1"},
    },
    "slice": {
        "id": "mapdemo/1", "kind": "slice", "parent": "mapdemo/E1", "external_ref": "mapdemo/1", "title": "Slice name",
        "description": None, "acceptance_criteria": "The slice ends here", "design": None,
        "envelope": {"n": 1, "title": "Slice name", "ends_with": "The slice ends here"},
    },
    "pr": {
        "id": "pr-101", "kind": "pr", "parent": None, "external_ref": "gh-101", "title": None,
        "description": None, "acceptance_criteria": None, "design": None, "envelope": {},
    },
    "bare": {
        "id": "mapdemo-bare", "kind": "slice", "parent": None, "external_ref": None, "title": None,
        "description": None, "acceptance_criteria": None, "design": None, "envelope": {},
    },
}


TEXT_FIELDS = ("title", "description", "acceptance_criteria", "design")


def need(owner: Any, name: str) -> Any:
    """Read an attribute that E7-2 adds. A missing one fails on an assertion, not on an AttributeError."""
    assert hasattr(owner, name), f"{getattr(owner, '__name__', type(owner).__name__)}.{name} is missing"
    return getattr(owner, name)


def need_record_fields() -> None:
    """Fail on an assertion when TrackerRecord lacks a new field or when a text field enters equality."""
    import dataclasses

    from tracker_port.record import TrackerRecord

    by_name = {field.name: field for field in dataclasses.fields(TrackerRecord)}
    missing = [name for name in (*TEXT_FIELDS, "tracks") if name not in by_name]
    assert not missing, f"TrackerRecord lacks the fields {missing}"
    assert not any(by_name[name].compare for name in TEXT_FIELDS), "a text field must stay out of record equality"
    assert by_name["tracks"].compare, "tracks stays in record equality"


def text_of(record: Any) -> tuple[Any, ...]:
    """The title, description, acceptance criteria, and design of a record."""
    return tuple(need(record, name) for name in TEXT_FIELDS)


def legacy_reasons(rows: list[dict[str, Any]]) -> list[str]:
    from tracker_port import beads_rows

    return need(beads_rows, "legacy_reasons")(rows)


def doctor_mapping(adapter: Any) -> Any:
    details = adapter.doctor_details()
    assert "mapping" in details, f"doctor_details has no mapping field: {sorted(details)}"
    return details["mapping"]


def find_record(adapter: Any, cb_id: str) -> Any:
    return need(adapter, "find_record")(cb_id)


def make_record(**fields: Any) -> Any:
    from tracker_port.record import TrackerRecord

    need_record_fields()
    base: dict[str, Any] = {
        "parent": None, "blocked_by": (), "lifecycle": "open", "assignee": None, "envelope": {}, "external_ref": None,
    }
    return TrackerRecord(**{**base, **fields})


def create_record_of(name: str, **overrides: Any) -> Any:
    return make_record(**{**CREATES[name], **overrides})


def create_argv(name: str) -> list[str]:
    """The argv of the one recorded create in map-create-<name>.json."""
    return next(step["args"] for step in support.steps(f"map-create-{name}") if step["args"][0] == "create")


def replay_create(name: str, record: Any) -> tuple[Any, list[list[str]]]:
    """Create the record through a runner that replays map-create-<name>.json. Return the runner and the argv list."""
    from tracker_port.beads import BeadsAdapter

    recorded = support.with_syncs(support.steps(f"map-create-{name}"))
    runner = support.SequenceRunner(recorded)
    BeadsAdapter(runner).create_record(record)
    assert len(runner.calls) == len(recorded), runner.calls
    return runner, runner.calls


def read_rows() -> list[dict[str, Any]]:
    return json.loads(support.load_transcript("map-read")["stdout"])


def row_of(cb_id: str, rows: list[dict[str, Any]] | None = None) -> dict[str, Any]:
    found = rows if rows is not None else read_rows()
    return next(row for row in found if ((row.get("metadata") or {}).get("cb") or {}).get("id") == cb_id)


def native_rows() -> list[dict[str, Any]]:
    return copy.deepcopy(read_rows())


def read_adapter(rows: list[dict[str, Any]] | None = None) -> Any:
    """A beads adapter that answers the one list read with the recorded rows."""
    adapter, _ = support.list_adapter(rows if rows is not None else read_rows())
    return adapter


def records_by_id(adapter: Any) -> dict[str, Any]:
    return {record.id: record for record in support.all_records(adapter)}


def lookup_argv(ref: str) -> list[str]:
    """The one bd call that finds the rows of one external ref. The recorded bd 1.3.0 call in map-lookup.json."""
    return ["list", "--external-ref", ref, "--json", "--limit", "0", "--all"]


class RowsRunner:
    """Plays bd over fixed rows. The full list gives every row, and the ref lookup filters on external_ref.

    Any other call fails the test. `calls` keeps each argument list in order.
    """

    def __init__(self, rows: list[dict[str, Any]]) -> None:
        self.rows = rows
        self.calls: list[list[str]] = []

    def run(self, args: list[str]) -> str:
        from tracker_port.beads import LIST_ARGS

        self.calls.append(list(args))
        if list(args) == LIST_ARGS:
            return json.dumps(self.rows)
        if args[:2] == ["list", "--external-ref"] and list(args) == lookup_argv(args[2]):
            return json.dumps([row for row in self.rows if row.get("external_ref") == args[2]])
        raise AssertionError(f"unexpected bd call {args}")


def flag_value(argv: list[str], flag: str) -> str | None:
    return argv[argv.index(flag) + 1] if flag in argv else None
