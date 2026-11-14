"""Tests for the test-folder rule of the structure signals.

A file under a folder whose name holds "test" is test code. The generic-name and
twin-name signals skip it, and a twin with fewer than two members left gives no
finding. The engineer label check of 2026-11-14 asked for this rule.

Run with: uv run pytest tests/test_structure_test_folders.py -q
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "shared"))

from structure.config import Config  # noqa: E402
from structure.names import generic_name, in_test_folder  # noqa: E402
from structure.repo_groups import twin_names  # noqa: E402


def test_a_folder_name_that_holds_test_marks_test_code():
    assert in_test_folder("src/shell/testSupport/IntentDrawing/helpers.ts")
    assert in_test_folder("pkg/__tests__/rail.ts")
    assert in_test_folder("tests/_support.py")
    assert not in_test_folder("src/shell/sections/common.tsx")
    assert not in_test_folder("src/contest/score.ts")


def test_a_generic_name_in_a_test_folder_gives_no_finding():
    config = Config()
    assert generic_name("src/shell/testSupport/IntentDrawing/helpers.ts", config) is None
    assert generic_name("src/lib/helpers.ts", config) is not None


def test_a_twin_left_with_one_product_member_gives_no_finding():
    config = Config()
    files = ["src/a/rail.ts", "src/testSupport/rail.ts"]
    assert twin_names(files, config) == []


def test_a_twin_keeps_its_product_members_and_drops_the_test_member():
    config = Config()
    files = ["src/a/sections.tsx", "src/b/sections.tsx", "src/testSupport/sections.tsx"]
    found = twin_names(files, config)
    assert len(found) == 1
    assert found[0].facts["members"] == ["src/a/sections.tsx", "src/b/sections.tsx"]
