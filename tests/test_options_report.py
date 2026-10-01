"""Tests for the options-report template and its structure validator."""
from __future__ import annotations

import importlib.util
import re
import shutil
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "plugins/architect/scripts/check_options_report.py"
TEMPLATE = (
    ROOT
    / "plugins/architect/skills/architecture/references/reports/options-report-TEMPLATE.html"
)
FIXTURES = ROOT / "tests/fixtures/options_report"

_spec = importlib.util.spec_from_file_location("check_options_report", SCRIPT)
checker = importlib.util.module_from_spec(_spec)
sys.modules[_spec.name] = checker
_spec.loader.exec_module(checker)  # type: ignore[union-attr]


def run(path: Path):
    return checker.check_report(path.read_text(encoding="utf-8"))


def errors(results):
    return [r for r in results if r.severity == "error"]


def test_template_exists_and_passes():
    assert TEMPLATE.is_file()
    assert errors(run(TEMPLATE)) == []


def test_good_fixture_passes():
    assert run(FIXTURES / "good.html") == []


def test_template_has_no_lavish_and_no_external_load():
    text = TEMPLATE.read_text(encoding="utf-8")
    assert "lavish" not in text.lower()
    assert "<script src" not in text
    assert 'rel="stylesheet"' not in text


def test_script_runs_through_uv_on_the_template():
    proc = subprocess.run(
        ["uv", "run", str(SCRIPT), str(TEMPLATE)],
        capture_output=True, text=True, cwd=ROOT,
    )
    assert proc.returncode == 0, proc.stdout + proc.stderr


def test_script_runs_through_uv_on_a_broken_fixture():
    proc = subprocess.run(
        ["uv", "run", str(SCRIPT), str(FIXTURES / "broken-anchor.html")],
        capture_output=True, text=True, cwd=ROOT,
    )
    assert proc.returncode == 1
    assert "ERROR check 1:" in proc.stdout


@pytest.mark.parametrize(
    "name, check",
    [
        ("broken-anchor.html", 1),
        ("broken-viewbox.html", 2),
        ("broken-g-title.html", 3),
        ("broken-direction.html", 4),
        ("broken-confidence.html", 5),
        ("broken-external-href.html", 6),
        ("broken-external-script.html", 7),
        ("broken-external-stylesheet.html", 7),
        ("broken-lavish.html", 8),
        ("broken-no-copy-all.html", 8),
        ("broken-no-title.html", 8),
    ],
)
def test_broken_fixture_fails_its_own_check(name, check):
    errs = errors(run(FIXTURES / name))
    assert errs, f"{name} produced no error"
    assert {r.check for r in errs} == {check}, [r.message for r in errs]


def test_main_prints_one_line_per_result_and_exits_1(tmp_path, capsys):
    code = checker.main([str(FIXTURES / "broken-anchor.html")])
    out = capsys.readouterr().out.strip().splitlines()
    assert code == 1
    assert out and all(re.match(r"^(ERROR|WARN) check \d: ", ln) for ln in out)


def test_long_svg_text_only_warns(capsys):
    results = run(FIXTURES / "long-svg-text.html")
    assert errors(results) == []
    assert [r.check for r in results] == [9]
    assert results[0].severity == "warning"
    code = checker.main([str(FIXTURES / "long-svg-text.html")])
    assert code == 0
    assert "WARN check 9:" in capsys.readouterr().out


def test_empty_direction_span_counts_as_direction():
    html = (FIXTURES / "good.html").read_text(encoding="utf-8")
    html = html.replace(
        "</tbody>\n  </table>\n  </div>\n</section>\n\n<!-- 5",
        '<tr id="row-F3"><td class="mono">F3</td><td>q</td><td>e</td><td>i</td>'
        '<td data-confidence>Hypothesis</td><td>-</td></tr></tbody>\n  </table>\n  </div>\n</section>\n\n<!-- 5',
        1,
    )
    html = html.replace('<div class="dir" id="dir-F1">', '<div class="dir" id="dir-F1"><span id="dir-F3"></span>', 1)
    assert errors(checker.check_report(html)) == []


@pytest.mark.skipif(shutil.which("node") is None, reason="node is not on PATH")
def test_inline_scripts_of_template_parse(tmp_path):
    text = TEMPLATE.read_text(encoding="utf-8")
    scripts = re.findall(r"<script>(.*?)</script>", text, flags=re.S)
    assert scripts, "template has no inline script"
    for i, body in enumerate(scripts):
        js = tmp_path / f"inline{i}.js"
        js.write_text(body, encoding="utf-8")
        proc = subprocess.run(["node", "--check", str(js)], capture_output=True, text=True)
        assert proc.returncode == 0, proc.stderr
