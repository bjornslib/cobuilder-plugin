"""E5-5: the slice-loop formula file, its pointer, and that no code reads it.

Run with: uv run pytest tests/test_tracker_beads_formula.py -q
"""
from __future__ import annotations


import _formula_support as fs
from _formula_support import FORMULA, FORMULA_REL, SLICE_LOOP, SLICE_LOOP_REL, REPO


def test_formula_defines_slice_loop_with_three_ordered_steps() -> None:
    formula = fs.load_formula()
    assert formula.get("formula") == "slice-loop"
    assert formula.get("type") == "workflow"
    assert formula.get("version") == 1
    steps = formula.get("steps")
    assert isinstance(steps, list)
    assert [step.get("id") for step in steps] == fs.STEP_IDS
    for step in steps:
        assert str(step.get("title", "")).strip(), f"step {step.get('id')} has no title"
        assert str(step.get("description", "")).strip(), f"step {step.get('id')} has no description"
        assert "{{slice_id}}" in step["title"], f"step {step['id']} title does not use the slice id"


def test_formula_orders_steps_with_needs_and_declares_slice_id() -> None:
    formula = fs.load_formula()
    assert set(formula.get("vars", {})) == {"slice_id"}
    assert formula["vars"]["slice_id"].get("required") is True
    deps = {step["id"]: step.get("needs", step.get("depends_on", [])) for step in formula["steps"]}
    assert deps == {"red": [], "green": ["red"], "validate": ["green"]}


def test_slice_loop_md_points_to_the_formula_without_copying_it() -> None:
    text = SLICE_LOOP.read_text(encoding="utf-8")
    assert text.count(FORMULA_REL) == 1, f"{SLICE_LOOP_REL} must name {FORMULA_REL} once"
    assert FORMULA.is_file(), f"the path named in slice-loop.md does not exist: {FORMULA_REL}"
    for step in fs.load_formula()["steps"]:
        assert step["description"] not in text, f"slice-loop.md copies the {step['id']} description"


def test_no_code_reads_the_formula() -> None:
    readers = [
        str(path.relative_to(REPO))
        for path in (REPO / "shared").rglob("*.py")
        if "slice-loop.toml" in path.read_text(encoding="utf-8") or "formulas/" in path.read_text(encoding="utf-8")
    ]
    assert readers == [], f"code reads the formula: {readers}"
