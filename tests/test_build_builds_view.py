"""Tests for plugins/cobuilder-artifact/scripts/build_builds_view.py.

Covers read_epics grouping, current_doc's gate selection, read_rubrics'
file-to-key mapping, render()'s hand-authored-line preservation contract,
the </script> escaping that protects the page from a broken script tag, and
idempotence of a repeated render() run.

Run with: uv run pytest tests/ -q
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent
SCRIPT_DIR = REPO_ROOT / "plugins" / "cobuilder-artifact" / "scripts"
sys.path.insert(0, str(SCRIPT_DIR))

import build_builds_view as bbv  # noqa: E402

SLICES_TWO_EPICS = """# Slices: demo

| # | Epic | Slice | Ends with | Score | State |
|---|---|---|---|---|---|
| | **`demo/E1` — Epic one.** prose | | | | |
| 1 | `demo/E1` | **First slice** | ends | 1.00 | completed |
| 2 | `demo/E1` | Second slice | ends | 1.00 | completed |
| | **`demo/E2` — Epic two.** prose | | | | |
"""


def make_designs(tmp_path: Path) -> Path:
    """Build a small designs directory holding two goal.json files."""
    designs_dir = tmp_path / "designs"
    demo_dir = designs_dir / "demo"
    demo_dir.mkdir(parents=True)
    goal = {
        "name": "demo",
        "adrs": ["ADR-0001"],
        "epics": [
            {"id": "E1", "note": "first epic", "state": "in-progress", "branch": "e1"},
            {"id": "E2", "note": "second epic", "state": "planned", "branch": None},
        ],
    }
    (demo_dir / "goal.json").write_text(json.dumps(goal))
    return designs_dir


# --- read_epics ---


def test_read_epics_groups_slice_rows_under_the_correct_epic_key(tmp_path):
    designs_dir = make_designs(tmp_path)
    epics = bbv.read_epics(designs_dir, SLICES_TWO_EPICS)
    by_key = {e["key"]: e for e in epics}
    assert [s["n"] for s in by_key["demo/E1"]["slices"]] == [1, 2]


def test_read_epics_strips_bold_markers_from_a_slice_name(tmp_path):
    designs_dir = make_designs(tmp_path)
    epics = bbv.read_epics(designs_dir, SLICES_TWO_EPICS)
    by_key = {e["key"]: e for e in epics}
    names = [s["name"] for s in by_key["demo/E1"]["slices"]]
    assert "First slice" in names
    assert not any("**" in n for n in names)


def test_read_epics_yields_an_empty_slices_list_for_an_epic_with_no_row(tmp_path):
    designs_dir = make_designs(tmp_path)
    epics = bbv.read_epics(designs_dir, SLICES_TWO_EPICS)
    by_key = {e["key"]: e for e in epics}
    assert by_key["demo/E2"]["slices"] == []


# --- current_doc ---


def test_current_doc_returns_the_first_gate_not_starting_with_approved():
    gates = [
        {"n": "1", "name": "Product", "state": "APPROVED 2026-08-01"},
        {"n": "2", "name": "Architecture", "state": "in progress"},
        {"n": "3", "name": "Program design", "state": "pending"},
    ]
    gate, doc, pending = bbv.current_doc(gates)
    assert gate == "2"
    assert doc == "02-architecture.md"
    assert pending is True


def test_current_doc_returns_the_last_gate_with_pending_false_when_all_approved():
    gates = [
        {"n": "1", "name": "Product", "state": "APPROVED 2026-08-01"},
        {"n": "2", "name": "Architecture", "state": "APPROVED 2026-08-02"},
    ]
    gate, doc, pending = bbv.current_doc(gates)
    assert gate == "2"
    assert doc == "02-architecture.md"
    assert pending is False


def test_current_doc_handles_an_empty_gate_list_without_raising():
    gate, doc, pending = bbv.current_doc([])
    assert gate == "1"
    assert doc == "01-product.md"
    assert pending is False


# --- read_rubrics ---


def test_read_rubrics_maps_slice_file_to_a_rubric_n_key(tmp_path):
    rubrics_dir = tmp_path / "rubrics"
    rubrics_dir.mkdir()
    (rubrics_dir / "slice-1.md").write_text("criteria one\n")
    docs, paths = bbv.read_rubrics(rubrics_dir)
    assert docs["rubric-1"] == "criteria one\n"
    assert paths["rubric-1"] == str(rubrics_dir / "slice-1.md")


def test_read_rubrics_wraps_manifest_yaml_in_a_fenced_code_block(tmp_path):
    rubrics_dir = tmp_path / "rubrics"
    rubrics_dir.mkdir()
    (rubrics_dir / "manifest.yaml").write_text("key: value\n")
    docs, _ = bbv.read_rubrics(rubrics_dir)
    assert docs["rubric-manifest"] == "```yaml\nkey: value\n\n```"


def test_read_rubrics_omits_keys_for_files_that_do_not_exist(tmp_path):
    rubrics_dir = tmp_path / "rubrics"
    rubrics_dir.mkdir()
    docs, paths = bbv.read_rubrics(rubrics_dir)
    assert "rubric-1" not in docs
    assert "rubric-manifest" not in docs
    assert paths == {}


# --- render(): hand-authored-line preservation ---

PAGE_TEMPLATE = """<!doctype html>
<html>
<head><title>Builds</title></head>
<body>
<div id="hand-authored-marker">do not touch me</div>
<!-- BEGIN GENERATED -->
<script>window.BUILD=null;</script>
<script>
var GATEDOC={{}};
var TITLE={{}};
var cur={{gate:"1",doc:"01-product.md"}};
var ASKDOC="";
var ASKGATE="";
var ASKNOTE="";
buildRail(); go("1","01-product.md");
</script>
<!-- END GENERATED -->
<footer>hand authored footer, never generated</footer>
</body>
</html>
"""


def make_plan(tmp_path: Path) -> tuple[Path, Path, Path, Path]:
    """Build a plan dir, a designs dir, a rubrics dir, and a page file."""
    plan_dir = tmp_path / "plan"
    plan_dir.mkdir()
    (plan_dir / "00-status.md").write_text(
        "# Status: demo\n\n- Gate 1 — Product: APPROVED 2026-08-01\n"
    )
    (plan_dir / "01-product.md").write_text("Product plan text.\n")
    designs_dir = make_designs(tmp_path)
    (plan_dir / "04-slices.md").write_text(SLICES_TWO_EPICS)
    rubrics_dir = tmp_path / "rubrics"
    rubrics_dir.mkdir()
    page = tmp_path / "builds-view.html"
    page.write_text(PAGE_TEMPLATE)
    return plan_dir, designs_dir, rubrics_dir, page


def test_render_changes_only_the_generated_lines_and_keeps_the_rest(tmp_path):
    plan_dir, designs_dir, rubrics_dir, page = make_plan(tmp_path)
    before = page.read_text().split("\n")

    bbv.render(page, plan_dir, designs_dir, rubrics_dir)

    after = page.read_text().split("\n")
    assert len(before) == len(after)

    generated_prefixes = (
        "<script>window.BUILD=",
        "var GATEDOC=",
        "var TITLE=",
        "var cur=",
        "var ASKDOC=",
        "var ASKGATE=",
        "var ASKNOTE=",
        "buildRail(); go(",
    )
    for before_line, after_line in zip(before, after):
        if before_line.startswith(generated_prefixes):
            # A generated line is allowed to change.
            continue
        assert before_line == after_line


def test_render_preserves_hand_authored_marker_and_footer_byte_for_byte(tmp_path):
    plan_dir, designs_dir, rubrics_dir, page = make_plan(tmp_path)
    bbv.render(page, plan_dir, designs_dir, rubrics_dir)
    text = page.read_text()
    assert '<div id="hand-authored-marker">do not touch me</div>' in text
    assert "<footer>hand authored footer, never generated</footer>" in text


# --- </script> escaping ---


def test_render_escapes_a_literal_closing_script_tag_in_plan_text(tmp_path):
    plan_dir, designs_dir, rubrics_dir, page = make_plan(tmp_path)
    (plan_dir / "01-product.md").write_text(
        "Plan text with an embedded </script> tag that must not break the page.\n"
    )

    bbv.render(page, plan_dir, designs_dir, rubrics_dir)

    text = page.read_text()
    payload_line = next(
        line for line in text.split("\n") if line.startswith("<script>window.BUILD=")
    )
    assert "</" not in payload_line[len("<script>window.BUILD=") : -len(";</script>")]


# --- idempotence ---


def test_render_twice_produces_an_identical_file(tmp_path):
    plan_dir, designs_dir, rubrics_dir, page = make_plan(tmp_path)
    bbv.render(page, plan_dir, designs_dir, rubrics_dir)
    first = page.read_text()
    bbv.render(page, plan_dir, designs_dir, rubrics_dir)
    second = page.read_text()
    assert first == second


# --- the generated-region fence ---


def test_render_leaves_a_lookalike_line_outside_the_markers_untouched(tmp_path):
    """A hand-authored line outside the fence must survive, even if it
    starts with a prefix render() otherwise treats as generated. This is
    the regression test for the bug the fence exists to close."""
    plan_dir, designs_dir, rubrics_dir, page = make_plan(tmp_path)
    page.write_text(
        page.read_text().replace(
            "<footer>hand authored footer, never generated</footer>",
            '<footer>hand authored footer, never generated</footer>\n'
            '<pre>var cur={gate:"9",doc:"do-not-touch.md"};</pre>',
        )
    )
    before_line = 'var cur={gate:"9",doc:"do-not-touch.md"};'

    bbv.render(page, plan_dir, designs_dir, rubrics_dir)

    assert before_line in page.read_text()


def test_render_exits_nonzero_when_the_page_has_no_markers(tmp_path, capsys):
    plan_dir, designs_dir, rubrics_dir, page = make_plan(tmp_path)
    page.write_text(
        page.read_text()
        .replace("<!-- BEGIN GENERATED -->\n", "")
        .replace("<!-- END GENERATED -->\n", "")
    )

    with pytest.raises(SystemExit) as exc_info:
        bbv.render(page, plan_dir, designs_dir, rubrics_dir)

    assert exc_info.value.code != 0
    err = capsys.readouterr().err
    assert "BEGIN GENERATED" in err
    assert "remediation" in err


def test_render_exits_nonzero_when_a_marker_is_duplicated(tmp_path, capsys):
    plan_dir, designs_dir, rubrics_dir, page = make_plan(tmp_path)
    page.write_text(
        page.read_text().replace(
            "<!-- BEGIN GENERATED -->",
            "<!-- BEGIN GENERATED -->\n<!-- BEGIN GENERATED -->",
        )
    )

    with pytest.raises(SystemExit) as exc_info:
        bbv.render(page, plan_dir, designs_dir, rubrics_dir)

    assert exc_info.value.code != 0
    err = capsys.readouterr().err
    assert "remediation" in err


def test_render_exits_nonzero_when_end_appears_before_begin(tmp_path, capsys):
    plan_dir, designs_dir, rubrics_dir, page = make_plan(tmp_path)
    text = page.read_text()
    text = text.replace("<!-- BEGIN GENERATED -->\n", "")
    text = text.replace(
        "<!-- END GENERATED -->\n",
        "<!-- END GENERATED -->\n<!-- BEGIN GENERATED -->\n",
    )
    page.write_text(text)

    with pytest.raises(SystemExit) as exc_info:
        bbv.render(page, plan_dir, designs_dir, rubrics_dir)

    assert exc_info.value.code != 0
    err = capsys.readouterr().err
    assert "remediation" in err
