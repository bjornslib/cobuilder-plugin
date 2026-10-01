"""Tests for the runtime-architecture SVG contract and its validator (ADR-0036)."""
from __future__ import annotations

import importlib.util
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "plugins/architect/scripts/check_design_svg.py"
CONTRACT = ROOT / "plugins/architect/skills/architecture/references/runtime-architecture-diagram.md"
MERMAID_CONTRACT = ROOT / "shared/skills/mermaid/references/architecture-diagram.md"
DESIGN_SVG = ROOT / "docs/architecture/designs/nexus-borrowings/diagrams/runtime-architecture.svg"
FIXTURES = ROOT / "tests/fixtures/design_svg"

_spec = importlib.util.spec_from_file_location("check_design_svg", SCRIPT)
checker = importlib.util.module_from_spec(_spec)
sys.modules[_spec.name] = checker
_spec.loader.exec_module(checker)  # type: ignore[union-attr]


def run(path: Path):
    return checker.check_design_svg(path.read_text(encoding="utf-8"))


def errors(results):
    return [r for r in results if r.severity == "error"]


def test_contract_exists_and_cites_adr_0035():
    assert CONTRACT.is_file()
    text = CONTRACT.read_text(encoding="utf-8")
    assert "ADR-0035" in text
    assert "runtime-architecture.svg" in text


def test_pre_merge_mermaid_contract_is_deleted():
    assert not MERMAID_CONTRACT.exists()


def test_design_svg_is_a_good_file():
    assert DESIGN_SVG.is_file()
    assert run(DESIGN_SVG) == []


def test_good_fixture_passes():
    assert run(FIXTURES / "good.svg") == []


def test_root_not_svg():
    results = errors(run(FIXTURES / "broken-root.svg"))
    assert results and results[0].check == 1


def test_root_without_viewbox():
    results = errors(run(FIXTURES / "broken-viewbox.svg"))
    assert results and results[0].check == 2


def test_group_without_title():
    results = errors(run(FIXTURES / "broken-g-title.svg"))
    assert results and results[0].check == 3


def test_script_element():
    results = errors(run(FIXTURES / "broken-script.svg"))
    assert results and any(r.check == 4 for r in results)


def test_external_reference():
    results = errors(run(FIXTURES / "broken-external-href.svg"))
    assert results and any(r.check == 4 for r in results)


def test_long_text_warns_but_does_not_error():
    results = run(FIXTURES / "long-svg-text.svg")
    warnings = [r for r in results if r.severity == "warning"]
    assert warnings and warnings[0].check == 5
    assert errors(results) == []


def test_script_runs_through_uv_on_the_design_svg():
    proc = subprocess.run(
        ["uv", "run", str(SCRIPT), str(DESIGN_SVG)],
        capture_output=True, text=True, cwd=ROOT,
    )
    assert proc.returncode == 0, proc.stdout + proc.stderr


def test_script_runs_through_uv_on_a_broken_fixture():
    proc = subprocess.run(
        ["uv", "run", str(SCRIPT), str(FIXTURES / "broken-viewbox.svg")],
        capture_output=True, text=True, cwd=ROOT,
    )
    assert proc.returncode == 1
    assert "ERROR check 2" in proc.stdout