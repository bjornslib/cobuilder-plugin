"""`priority optimise --seed-program PATH` (slice 18, on the one propose predictor since slice 21).

The run loads a saved program as the student that GEPA and bootstrap compile
from, and a loaded bootstrap student still carries its demos into the
compiled student. No test makes a model call and none reads real text.
"""
from __future__ import annotations

import contextlib
import io

import pytest

from eval_support import write_eval_world
from fixtures_support import require
from interpret_support import no_live_call  # noqa: F401
from optimise_support import BUDGET, SEED, block_live_calls, run_optimise
from propose_support import field, propose_of


def write_seed_program(path):
    """A saved program with one seeded demo and one seeded instruction on its propose predictor."""
    dspy = require("dspy")
    program = require("priority.interpreter").Interpreter(lm=None)
    predictor = propose_of(program)
    predictor.signature = predictor.signature.with_instructions(
        "Seed instruction: read the stop and propose the payload.")
    predictor.demos = [dspy.Example(brief_text="the seed brief", status="done", needs_human=False, steps=[],
                                    priority="P3").with_inputs("brief_text")]
    program.save(str(path))
    return path


def student_of(calls, optimiser):
    """The student object that the stub teleprompter compiled."""
    return calls[optimiser][0]["inputs"][0]["args"][0]


@pytest.mark.parametrize("optimiser", ("gepa", "bootstrap"))
def test_seed_program_is_the_student_the_optimiser_compiles_from(monkeypatch, tmp_path, optimiser):
    seed = write_seed_program(tmp_path / "seed.json")
    code, printed, _, calls, _, _, _ = run_optimise(
        monkeypatch, tmp_path, optimiser, extra_args=("--seed-program", str(seed)))
    assert code == 0, f"optimise --seed-program failed: {printed}"
    predictor = propose_of(student_of(calls, optimiser))
    assert len(predictor.demos) == 1
    assert "Seed instruction" in predictor.signature.instructions


def test_corrupt_seed_program_fails_the_run(monkeypatch, tmp_path):
    bad = tmp_path / "bad.json"
    bad.write_text("{not json")
    code, printed, _, _, _, _, _ = run_optimise(
        monkeypatch, tmp_path, "gepa", extra_args=("--seed-program", str(bad)))
    assert code == 1, f"optimise --seed-program accepted a corrupt program: {printed}"


def test_seed_program_demos_survive_a_bootstrap_reset(monkeypatch, tmp_path):
    """A bootstrap-style compile (reset_copy, then new demos) keeps the seeded demos."""
    dspy = require("dspy")
    recorded = {}

    class ResettingBootstrap:
        def compile(self, student, **kwargs):
            fresh = student.reset_copy()
            predictor = propose_of(fresh)
            predictor.demos = list(predictor.demos) + [
                dspy.Example(brief_text="bootstrapped brief").with_inputs("brief_text")]
            recorded["compiled"] = fresh
            return fresh

    manifest_path, labels_path, real_dir, _parts = write_eval_world(tmp_path)
    block_live_calls(monkeypatch)

    import dspy.teleprompt as teleprompt

    def factory(*args, **kwargs):
        return ResettingBootstrap()

    monkeypatch.setattr(teleprompt, "BootstrapFewShot", factory)
    monkeypatch.setattr(dspy, "BootstrapFewShot", factory, raising=False)
    monkeypatch.chdir(tmp_path)
    seed = write_seed_program(tmp_path / "seed.json")
    from priority.cli import main

    argv = ["optimise", "--optimiser", "bootstrap",
            "--manifest", str(manifest_path), "--labels", str(labels_path),
            "--real-dir", str(real_dir), "--budget", str(BUDGET), "--seed", str(SEED),
            "--seed-program", str(seed)]
    out = io.StringIO()
    code = None
    with contextlib.suppress(SystemExit):
        with contextlib.redirect_stdout(out):
            code = main(argv)
    assert code == 0, f"optimise --seed-program failed: {out.getvalue()}"
    demos = propose_of(recorded["compiled"]).demos
    assert any(field(demo, "brief_text") == "the seed brief" for demo in demos), \
        "the seeded demo is missing from the compiled student"
    assert any(field(demo, "brief_text") == "bootstrapped brief" for demo in demos), \
        "the compile dropped its own bootstrapped demo"
