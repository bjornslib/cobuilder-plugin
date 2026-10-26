"""Structure checks (E7-7): `migrate-mapping` is a real operation, and the usage guide and the install steps name it.

The moment table of `shared/tracker-usage.md` needs a row for it. The install steps (the command of the umbrella plugin and its setup skill) tell an engineer that an
existing tracker needs it. Both checks read structure: a row that names the operation, and a name that
`tracker.py --help` lists. They do not read the wording. These checks fail until the docs name the operation.

Run with: uv run pytest tests/test_tracker_migrate_mapping_docs.py -q
"""
from __future__ import annotations

import test_tracker_skip_slice_docs as skip_docs  # the moment table readers; no test function is imported
from _tracker_cli_support import REPO_ROOT, assert_prose_ops_exist, cli_ops

LIFECYCLE = REPO_ROOT / "plugins" / "cobuilder-full-lifecycle"
# The install command of the umbrella and its setup skill hold the install steps. The command of `implement` hands over to them.
INSTALL_DOCS = [LIFECYCLE / "commands" / "install.md", LIFECYCLE / "skills" / "cobuilder-setup" / "SKILL.md"]


def test_migrate_mapping_is_listed_by_help() -> None:
    assert "migrate-mapping" in cli_ops()


def test_the_moment_table_has_a_row_for_migrate_mapping_and_every_named_operation_is_listed_by_help() -> None:
    rows = skip_docs._moment_rows()

    assert any("migrate-mapping" in skip_docs._row_ops(row) for row in rows)
    assert set().union(*(skip_docs._row_ops(row) for row in rows)) <= cli_ops()


def test_the_install_steps_name_migrate_mapping_and_every_operation_they_name_is_listed_by_help() -> None:
    assert any("migrate-mapping" in path.read_text(encoding="utf-8") for path in INSTALL_DOCS)
    assert_prose_ops_exist(INSTALL_DOCS)
