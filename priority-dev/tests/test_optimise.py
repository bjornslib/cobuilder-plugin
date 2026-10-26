"""Slice 18 RED: the optimiser comparison.

Each test fails until `priority optimise` exists. The contract stays
fixed. `optimise --optimiser gepa` and `--optimiser miprov2` compile the
chosen chain interpreter on the train sessions only. BootstrapFewShot is
the cheap baseline. The report gives the held-out score before and after
for each optimiser, the spread comparison from slice 16, the cost of each
run, and the saved program paths. A saved program loads in `eval
--program`. A held-out stop in any optimiser input fails the run.

All sessions, labels, and transcripts are made up. Every optimiser run
is a stub. No test makes a model call and none reads real text.
"""
from __future__ import annotations

import pytest

from optimise_support import (
    BUDGET,
    SEED,
    input_blob,
    optuna_available,
    read_report,
    require,
    require_optimise,
    require_teleprompter,
    run_eval_with_program,
    run_optimise,
    saved_programs,
)


def test_optimise_gepa_uses_train_only_and_saves_program(monkeypatch, tmp_path):
    require_teleprompter("gepa")
    code, printed, parts, calls, manifest, labels, _ = run_optimise(
        monkeypatch, tmp_path, "gepa"
    )
    assert code == 0, f"optimise --optimiser gepa failed: {printed}"
    blob = input_blob(calls, "gepa")
    for session_id in parts["train"]:
        assert session_id in blob
    for session_id in parts["holdout"]:
        assert session_id not in blob
    programs = saved_programs(tmp_path, known=(manifest, labels))
    assert programs, "the gepa run saved no program file"


def test_optimise_miprov2_uses_train_only_and_saves_program(monkeypatch, tmp_path):
    require_teleprompter("miprov2")
    code, printed, parts, calls, manifest, labels, _ = run_optimise(
        monkeypatch, tmp_path, "miprov2"
    )
    assert code == 0, f"optimise --optimiser miprov2 failed: {printed}"
    blob = input_blob(calls, "miprov2")
    for session_id in parts["train"]:
        assert session_id in blob
    for session_id in parts["holdout"]:
        assert session_id not in blob
    programs = saved_programs(tmp_path, known=(manifest, labels))
    assert programs, "the miprov2 run saved no program file"
    report = read_report(tmp_path)
    assert "optuna" in report.lower(), (
        "the miprov2 report states whether the optuna extra was present "
        f"(optuna here: {optuna_available()}): {report[:500]}"
    )


def test_optimise_bootstrap_baseline_uses_train_only(monkeypatch, tmp_path):
    require_teleprompter("bootstrap")
    code, printed, parts, calls, manifest, labels, _ = run_optimise(
        monkeypatch, tmp_path, "bootstrap"
    )
    assert code == 0, f"optimise --optimiser bootstrap failed: {printed}"
    blob = input_blob(calls, "bootstrap")
    for session_id in parts["train"]:
        assert session_id in blob
    for session_id in parts["holdout"]:
        assert session_id not in blob
    programs = saved_programs(tmp_path, known=(manifest, labels))
    assert programs, "the bootstrap run saved no program file"


def test_optimise_held_out_stop_in_inputs_fails_the_run():
    dspy = require("dspy")
    mod = require_optimise()
    guard = getattr(mod, "assert_train_only", None)
    assert callable(guard), "the optimise module has no train-only guard"
    holdout_ids = ["made-up-holdout-09"]
    clean = [
        dspy.Example(session_id="made-up-train-01", stop="001").with_inputs("stop")
    ]
    guard(clean, holdout_ids)
    leaked = clean + [
        dspy.Example(session_id="made-up-holdout-09", stop="002").with_inputs("stop")
    ]
    with pytest.raises(Exception):
        guard(leaked, holdout_ids)


def test_optimise_saved_program_loads_in_eval(monkeypatch, tmp_path):
    require_teleprompter("gepa")
    code, printed, _, _, manifest, labels, real_dir = run_optimise(
        monkeypatch, tmp_path, "gepa"
    )
    assert code == 0, f"optimise --optimiser gepa failed: {printed}"
    programs = saved_programs(tmp_path, known=(manifest, labels))
    assert programs, "the gepa run saved no program file"
    code, printed = run_eval_with_program(
        monkeypatch, manifest, labels, real_dir, programs[0]
    )
    assert code == 0, f"eval --program failed to load the saved program: {printed}"
    assert "overall" in printed.lower()
    corrupt = tmp_path / "corrupt-program.json"
    corrupt.write_text("{not json")
    code, printed = run_eval_with_program(
        monkeypatch, manifest, labels, real_dir, corrupt
    )
    assert code is not None and code != 0, (
        f"eval --program accepted a corrupt program file: {printed}"
    )


def test_optimise_report_records_settings_and_cost(monkeypatch, tmp_path):
    require_teleprompter("gepa")
    code, printed, _, _, _, _, _ = run_optimise(monkeypatch, tmp_path, "gepa")
    assert code == 0, f"optimise --optimiser gepa failed: {printed}"
    report = read_report(tmp_path)
    lowered = report.lower()
    assert "gepa" in lowered
    assert str(BUDGET) in report, f"the report states the budget {BUDGET}"
    assert str(SEED) in report, f"the report states the seed {SEED}"
    assert "candidate" in lowered, "the report states the candidate count"
    assert "reflection" in lowered, "the report states the GEPA reflection model"
    assert "cost" in lowered, "the report states the cost of the run"


def test_optimise_report_compares_before_after_against_spread(monkeypatch, tmp_path):
    for optimiser in ("gepa", "miprov2", "bootstrap"):
        require_teleprompter(optimiser)
    for optimiser in ("gepa", "miprov2", "bootstrap"):
        code, printed, _, _, _, _, _ = run_optimise(
            monkeypatch, tmp_path, optimiser
        )
        assert code == 0, f"optimise --optimiser {optimiser} failed: {printed}"
    report = read_report(tmp_path)
    lowered = report.lower()
    for optimiser in ("gepa", "miprov2", "bootstrap"):
        assert optimiser in lowered, f"the report covers {optimiser}"
    assert "before" in lowered and "after" in lowered
    assert "holdout" in lowered or "held-out" in lowered or "held out" in lowered
    assert "spread" in lowered or "repeat" in lowered, (
        "the report reads each gain against the spread over repeats"
    )
    assert "cost" in lowered
    assert ".json" in report, "the report names the saved program paths"


def test_optimise_missing_teleprompter_skips_with_message(monkeypatch, tmp_path):
    require_teleprompter("gepa")
    code, printed, _, _, _, _, _ = run_optimise(
        monkeypatch, tmp_path, "gepa", break_teleprompter="gepa"
    )
    assert code == 0, f"a missing teleprompter broke the run: {printed}"
    assert "skip" in printed.lower(), (
        f"a missing teleprompter must skip with a clear message: {printed}"
    )
