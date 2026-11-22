"""Size guide for shared/structure_evidence.py, slice 19 of structure-coaching (E9).

The entry script has 200 lines or fewer. Its helpers sit in modules under shared/structure/,
and each of those modules keeps to the same guide. The names that other tests read from the
entry script still exist. The whole-repository run still writes a record with findings and
folders.

Run with: uv run pytest tests/test_structure_evidence_size.py -q
"""
from __future__ import annotations

import importlib.util
import json
import subprocess
from pathlib import Path
from types import ModuleType

import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent
ENTRY = REPO_ROOT / "shared" / "structure_evidence.py"
STRUCTURE = REPO_ROOT / "shared" / "structure"
GUIDE_LINES = 200

# repo.py holds 201 lines before slice 19, and slice 19 does not touch it. The check gives
# the file a ceiling of its current size, so it cannot grow. Every other module, including
# a module that slice 19 adds, must keep to GUIDE_LINES.
LEGACY_CEILING = {"repo.py": 201}

# Names that the other tests read from the entry script.
PINNED_NAMES = ("build_packet", "main", "slice_files", "added_lines", "callers_untouched")


def _line_count(path: Path) -> int:
    """Return the number of lines in a file."""
    return len(path.read_text(encoding="utf-8").splitlines())


def _load_entry() -> ModuleType:
    """Return the entry script loaded as a module, the same way the other tests load it."""
    spec = importlib.util.spec_from_file_location("structure_evidence_size", ENTRY)
    assert spec is not None and spec.loader is not None, f"cannot load {ENTRY}"
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_entry_script_keeps_to_the_size_guide():
    lines = _line_count(ENTRY)
    assert lines <= GUIDE_LINES, f"structure_evidence.py has {lines} lines. The guide is {GUIDE_LINES}."


def test_structure_modules_keep_to_the_size_guide():
    sizes = {
        path.relative_to(STRUCTURE).as_posix(): _line_count(path)
        for path in sorted(STRUCTURE.rglob("*.py"))
    }
    assert sizes, f"no Python modules under {STRUCTURE}"
    over = {name: n for name, n in sizes.items() if n > LEGACY_CEILING.get(name, GUIDE_LINES)}
    assert not over, f"modules over their size limit: {over}"


@pytest.mark.parametrize("name", PINNED_NAMES)
def test_entry_script_still_exposes_each_name_that_other_tests_read(name):
    module = _load_entry()
    assert hasattr(module, name), f"structure_evidence.py has no {name!r}, and other tests read it"


def test_repo_run_on_this_repo_writes_a_record_with_findings_and_folders(tmp_path):
    out = tmp_path / "record.json"
    done = subprocess.run(
        ["uv", "run", str(ENTRY), "--repo", "--out", str(out)],
        cwd=REPO_ROOT, capture_output=True, text=True, check=False,
    )
    assert done.returncode == 0, f"exit {done.returncode}: {done.stderr}"
    record = json.loads(out.read_text(encoding="utf-8"))
    keys = sorted(record)
    assert isinstance(record.get("findings"), list), f"no findings list in the record. Keys: {keys}"
    assert isinstance(record.get("folders"), list), f"no folders list in the record. Keys: {keys}"
