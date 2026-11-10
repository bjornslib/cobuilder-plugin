"""Slice 5 may split and tidy the viewer test files. It may not drop a test.

tests/fixtures/viewer_test_names.json holds the baseline from before slice 5:
every vitest full test name, the count of `expect(` calls, and the count of
`it` and `test` cases. These guards pass now and must keep passing.
"""
from __future__ import annotations

import json
import re
import subprocess
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
VIEWER = ROOT / "plugins/artifact/viewer"
BASELINE = json.loads((Path(__file__).parent / "fixtures/viewer_test_names.json").read_text())
EXPECT_CALL = re.compile(r"\bexpect\(")
TEST_CASE = re.compile(r"^\s*(it|test)(\.each)?\(", re.MULTILINE)

pytestmark = pytest.mark.skipif(
    not (VIEWER / "node_modules").exists(), reason="the viewer node_modules is missing"
)


def viewer_test_files() -> list[Path]:
    return sorted((VIEWER / "src").rglob("*.test.*"))


def count_in_tests(pattern: re.Pattern[str]) -> int:
    return sum(len(pattern.findall(f.read_text(encoding="utf-8"))) for f in viewer_test_files())


def vitest_full_names(out_file: Path) -> set[str]:
    subprocess.run(
        ["npx", "vitest", "run", "--reporter=json", f"--outputFile={out_file}"],
        cwd=VIEWER, capture_output=True, text=True, timeout=600, check=False,
    )
    report = json.loads(out_file.read_text(encoding="utf-8"))
    return {
        a["fullName"] for t in report["testResults"] for a in t["assertionResults"]
    }


def test_baseline_is_well_formed():
    names = BASELINE["full_names"]
    assert names == sorted(names)
    assert len(names) == len(set(names))
    assert BASELINE["expect_calls"] > 0 and BASELINE["test_cases"] > 0


def test_every_baseline_test_name_still_runs(tmp_path):
    present = vitest_full_names(tmp_path / "vitest.json")
    missing = sorted(set(BASELINE["full_names"]) - present)
    assert not missing, f"{len(missing)} baseline tests are gone:\n" + "\n".join(missing)


def test_expect_calls_do_not_drop():
    found = count_in_tests(EXPECT_CALL)
    assert found >= BASELINE["expect_calls"], (
        f"{found} expect( calls, baseline {BASELINE['expect_calls']}"
    )


def test_test_cases_do_not_drop():
    found = count_in_tests(TEST_CASE)
    assert found >= BASELINE["test_cases"], (
        f"{found} it/test cases, baseline {BASELINE['test_cases']}"
    )
