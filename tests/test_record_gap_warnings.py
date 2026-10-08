"""Tests for record_gap_warnings in shared/build_index.py.

The build reports a missing record part. The viewer states none.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent))
from test_build_index import (  # noqa: E402
    build_index,
    init_repo,
    make_bundle,
    write_design,
)


def narrative(*kinds: str) -> dict:
    return {
        "problem_solution": {
            "beats": [{"kind": kind, "text": f"A {kind} beat."} for kind in kinds]
        }
    }


def warn(design_id: str, narr) -> list[str]:
    return build_index.record_gap_warnings(design_id, narr)


def test_a_complete_record_warns_of_nothing():
    assert warn("design-a", narrative("problem", "decision")) == []


def test_a_constraint_and_a_risk_also_complete_the_record():
    assert warn("design-a", narrative("constraint", "risk")) == []


def test_no_problem_or_constraint_beat_gives_one_warning_naming_the_design():
    result = warn("design-a", narrative("decision"))
    assert len(result) == 1
    assert result[0].startswith("design-a: ")
    assert "problem" in result[0] and "constraint" in result[0]


def test_no_decision_or_risk_beat_gives_one_warning_naming_the_design():
    result = warn("design-a", narrative("problem", "constraint"))
    assert len(result) == 1
    assert result[0].startswith("design-a: ")
    assert "decision" in result[0] and "risk" in result[0]


def test_a_record_with_only_problem_beats_warns_for_the_missing_solution_side_only():
    result = warn("design-a", narrative("problem", "problem"))
    assert len(result) == 1
    assert "decision" in result[0]


def test_an_unknown_kind_warns_and_names_the_kinds_sorted():
    result = warn("design-a", narrative("problem", "decision", "zeta", "alpha", "zeta"))
    assert len(result) == 1
    assert result[0].startswith("design-a: ")
    assert "alpha, zeta" in result[0]


def test_a_none_narrative_warns_for_both_missing_kinds():
    result = warn("design-a", None)
    assert len(result) == 2
    assert all(line.startswith("design-a: ") for line in result)


def test_a_narrative_without_problem_solution_warns_for_both_missing_kinds():
    assert len(warn("design-a", {})) == 2


def test_an_empty_beats_list_warns_for_both_missing_kinds():
    assert len(warn("design-a", {"problem_solution": {"beats": []}})) == 2


def write_narrative(repo: Path, design_id: str, narr: dict) -> None:
    path = repo / "docs" / "architecture" / "designs" / design_id / "narrative.json"
    path.write_text(json.dumps(narr))


def test_the_build_prints_a_gap_warning_on_stderr_and_exits_zero(
    tmp_path, monkeypatch, capsys
):
    init_repo(tmp_path)
    bundle = tmp_path / ".cobuilder-architect" / "self"
    make_bundle(bundle)
    write_design(tmp_path, "design-gap", ["E1"])
    write_narrative(tmp_path, "design-gap", narrative("decision"))
    write_design(tmp_path, "design-full", ["E1"])
    write_narrative(tmp_path, "design-full", narrative("problem", "decision"))

    monkeypatch.setattr(
        sys, "argv", ["build_index.py", "--repo", str(tmp_path), "--bundle-dir", str(bundle)]
    )
    code = 0
    try:
        build_index.main()
    except SystemExit as exit_:
        code = exit_.code or 0
    err = capsys.readouterr().err

    assert code == 0
    gap_lines = [l for l in err.splitlines() if l.startswith("warning:") and "design-gap" in l]
    assert gap_lines, f"no gap warning for design-gap in stderr: {err!r}"
    assert not [l for l in err.splitlines() if "design-full" in l and "warning:" in l]
