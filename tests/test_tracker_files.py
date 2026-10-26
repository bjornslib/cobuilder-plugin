"""E1 slice 3: the files adapter, the backfill dry run, and the backfill reference.

Each test imports its module inside the test body. A missing module fails
only the test that needs it.
"""

from __future__ import annotations

import importlib.util
import json
import re
import subprocess
from typing import Any

import pytest

import _tracker_port_support as support  # noqa: E402

REPO = support.REPO_ROOT
SHARED_DIR = support.SHARED_DIR
TESTS_DIR = support.TESTS_DIR
FIXTURES = support.FIXTURES
PLANS_DIR = support.PLANS_DIR
CORPUS_DIR = support.CORPUS
DRY_RUN = FIXTURES / "backfill" / "dry_run.txt"
BACKFILL_REF = SHARED_DIR / "tracker-backfill.md"


def _no_adapter_writes() -> list[tuple[str, tuple[Any, ...]]]:
    # One source of truth: the write list that the contract test already defines.
    spec = importlib.util.spec_from_file_location(
        "contract_module", TESTS_DIR / "test_tracker_contract.py"
    )
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module.NO_ADAPTER_WRITES


def test_lists_programs_from_plans_tree() -> None:
    from tracker_port.files import FilesAdapter

    programs = FilesAdapter(PLANS_DIR).list_programs()

    assert [program.id for program in programs] == ["beads-storage-mini"]
    assert programs[0].kind == "program"


def test_program_envelope_carries_gate_values() -> None:
    from tracker_port.files import FilesAdapter

    envelope = FilesAdapter(PLANS_DIR).list_programs()[0].envelope

    assert envelope["gate1"] == "passed"
    assert envelope["gate2"] == "passed"


def test_lists_slices_from_04() -> None:
    from tracker_port.files import FilesAdapter

    slices = FilesAdapter(PLANS_DIR).list_slices()

    assert [slice_record.id for slice_record in slices] == [
        "beads-storage-mini/1",
        "beads-storage-mini/2",
        "beads-storage-mini/3",
    ]
    assert {slice_record.lifecycle for slice_record in slices} == {"open"}


def test_every_write_exits_2() -> None:
    from tracker_port.files import FilesAdapter
    from tracker_port.port import NoAdapterError

    adapter = FilesAdapter(PLANS_DIR)

    for method, args in _no_adapter_writes():
        with pytest.raises(NoAdapterError):
            getattr(adapter, method)(*args)


def test_backfill_dry_run_matches_fixture() -> None:
    from tracker_port.fake import FakeAdapter
    from tracker_port.projector import project

    creates = FakeAdapter(CORPUS_DIR).seed_from_files(PLANS_DIR)
    lines = [
        json.dumps(project([record])["entities"][record.id], sort_keys=True)
        for record in creates
    ]

    assert "\n".join(lines) + "\n" == DRY_RUN.read_text(encoding="utf-8")


def test_second_run_creates_nothing() -> None:
    from tracker_port.fake import FakeAdapter

    adapter = FakeAdapter(CORPUS_DIR)
    first_creates = adapter.seed_from_files(PLANS_DIR)

    assert first_creates
    assert adapter.seed_from_files(PLANS_DIR) == []


def test_backfill_reference_names_operations() -> None:
    text = BACKFILL_REF.read_text(encoding="utf-8")

    # Structure only: seven numbered steps, in order.
    steps = re.findall(r"^(\d+)\. ", text, flags=re.MULTILINE)
    assert steps == ["1", "2", "3", "4", "5", "6", "7"]

    # Every tracker.py operation that the reference names must exist in the CLI.
    operations = set(re.findall(r"tracker\.py\s+([a-z][a-z-]*)", text))
    assert "seed-from-files" in operations

    help_text = subprocess.run(
        ["uv", "run", "shared/tracker.py", "--help"],
        cwd=REPO,
        capture_output=True,
        text=True,
        check=True,
    ).stdout
    for operation in sorted(operations):
        assert operation in help_text, operation
