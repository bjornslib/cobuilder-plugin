"""Structure checks (E7-6): `claim-next` is a real operation, and the usage guide and the reminder name it.

The moment table of `shared/tracker-usage.md` needs a row for it. The reminder that the hook prints at the
start of a session names it, so an agent knows the way to take the next slice. Both checks read structure:
a row that names the operation, and a name that `tracker.py --help` lists. They do not read the wording.

Run with: uv run pytest tests/test_tracker_claim_next_docs.py -q
"""
from __future__ import annotations

import test_tracker_skip_slice_docs as skip_docs  # the moment table readers; no test function is imported
from _tracker_cli_support import cli_ops

REMINDER = skip_docs.MENTIONS["reminder script"]


def test_claim_next_is_listed_by_help() -> None:
    assert "claim-next" in cli_ops()


def test_the_moment_table_has_a_row_for_claim_next_and_every_named_operation_is_listed_by_help() -> None:
    rows = skip_docs._moment_rows()

    assert any("claim-next" in skip_docs._row_ops(row) for row in rows)
    assert set().union(*(skip_docs._row_ops(row) for row in rows)) <= cli_ops()


def test_the_reminder_script_names_claim_next() -> None:
    assert "claim-next" in REMINDER.read_text(encoding="utf-8")
