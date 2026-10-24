"""Shared helpers for the E7-2 seed tests. Not a test module.

The seed fixture is tests/fixtures/tracker/plans-mapping. `WriteRunner` plays bd for a seed that creates records.
"""
from __future__ import annotations

import json

import _beads_support as support
from _beads_mapping_support import RowsRunner, flag_value

PLANS = support.FIXTURE_DIR / "plans-mapping" / "plans"


class WriteRunner(RowsRunner):
    """A RowsRunner that also takes creates. Each create adds a row, so a later read shows it.

    A dep add, a close, an update, and a sync answer with an empty text. All calls stay in `calls`.
    """

    def run(self, args: list[str]) -> str:
        if args[0] in ("dep", "close", "update", "sync"):
            self.calls.append(list(args))
            return ""
        if args[0] != "create":
            return super().run(args)
        self.calls.append(list(args))
        bd_id = f"t-{len(self.rows) + 1}"
        self.rows.append(
            {
                "id": bd_id, "title": flag_value(args, "--title"), "status": "open", "issue_type": flag_value(args, "--type"),
                "external_ref": flag_value(args, "--external-ref"), "parent": flag_value(args, "--parent"),
                "metadata": json.loads(flag_value(args, "--metadata") or "{}"),
            }
        )
        return bd_id + "\n"

    def creates(self) -> dict[str, list[str]]:
        """The create argv of each created record, by cb id."""
        return {json.loads(flag_value(call, "--metadata") or "{}")["cb"]["id"]: call for call in self.calls if call[0] == "create"}


# The seed of tests/fixtures/tracker/plans-mapping. cb id -> (title, description, acceptance, design).
# A design is the end of its path. None means the files hold no source for the field.
EXPECTED: dict[str, tuple[str, str | None, str | None, str | None]] = {
    "mapped": ("Mapped program title", "The mapped program outcome.", "First done\nSecond done", "architecture/designs/mapped"),
    "mapped/E1": ("Core mapping", "The first epic outcome.", None, "plans/mapped/epic-E1-design.md"),
    "mapped/E2": ("Second epic", None, None, None),
    "mapped/1": ("Read the row fields", None, "A read returns the four text fields", None),
    "mapped/2": ("Send the text flags", None, "A create sends a flag for each set field", None),
    "mapped/3": ("Seed the second epic", None, "The second epic seeds with no text", None),
    "bare": ("bare", None, None, None),
    "bare/E1": ("Bare epic", None, None, None),
    "bare/1": ("Bare slice", None, "The bare slice ends", None),
    "solo": ("Solo program title", "The solo program outcome.", "Solo done", "architecture/designs/solo"),
    "solo/E1": ("Solo epic title", "The solo epic outcome.", None, None),
}
KIND_TYPE = {"program": "feature", "epic": "epic", "slice": "task", "pr": "milestone"}


def check_design(value: str | None, suffix: str | None) -> None:
    if suffix is None:
        assert value is None
    else:
        assert value is not None and value.endswith(suffix), value


# The two legal values of tracker_port.record.TITLE_RULE. The design names the second one as `<cb id> — <name>`.
RULE_NAME = "name"
RULE_ID_AND_NAME = "id-and-name"
ID_NAME_SEPARATOR = " — "


def use_title_rule(monkeypatch, rule: str) -> None:
    """Set the one title-rule constant. It fails on an assertion when the constant does not exist yet."""
    from tracker_port import record

    from _beads_mapping_support import need

    need(record, "TITLE_RULE")
    monkeypatch.setattr(record, "TITLE_RULE", rule)


def expected_title(rule: str, cb_id: str, kind: str, name: str | None) -> str:
    """The --title of a create. A pr keeps its ref, and a record with no name keeps its cb id."""
    if kind == "pr" or not name:
        return cb_id
    return name if rule == RULE_NAME else f"{cb_id}{ID_NAME_SEPARATOR}{name}"


def seed_creates() -> dict[str, list[str]]:
    """Seed tests/fixtures/tracker/plans-mapping through WriteRunner. Return the create argv by cb id."""
    from tracker_port.beads import BeadsAdapter

    runner = WriteRunner([])
    BeadsAdapter(runner).seed_from_files(PLANS)
    return runner.creates()
