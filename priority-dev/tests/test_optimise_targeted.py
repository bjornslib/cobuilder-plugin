"""Per-predictor GEPA feedback, --seed-program, and the relaxed quote check.

(1) `gepa_feedback` targets the named predictor: the feedback names the
predictor and speaks to its own fields and trace, while the score stays the
program-level number so acceptance sums stay comparable.
(2) `priority optimise --seed-program PATH` loads a saved program as the
student that GEPA and bootstrap compile from; a loaded bootstrap student
still carries its demos into the compiled student.
(3) A non-verbatim evidence quote no longer abstains the whole stop: the
proposal reaches the caller and quotes do not change the score.

No test makes a model call and none reads real text.
"""
from __future__ import annotations

import contextlib
import io

import pytest

from eval_support import (EACH_FACT_SHARE, QUOTE_NOT_IN_BRIEF,
                          make_example, make_prediction, write_eval_world)
from fixtures_support import make_label, require
from interpret_support import (BLOCKED, NOT_IN_BRIEF, dummy, interpret,  # noqa: F401
                               make_brief, no_live_call, script)
from optimise_support import BUDGET, SEED, block_live_calls, run_optimise


def test_gepa_feedback_names_the_triage_predictor():
    label = make_label(1)
    example = make_example(label)
    prediction = make_prediction(label, status="done")
    metric = require("priority.evaluation.metric")
    optimise = require("priority.optimise")
    base, _ = metric.score(example, prediction)
    assert base == pytest.approx(1.0 - EACH_FACT_SHARE)
    feedback = optimise.gepa_feedback(example, prediction, None, "triage", None)
    assert feedback.score == pytest.approx(base)
    assert "triage" in feedback.feedback
    assert "status" in feedback.feedback


def test_gepa_feedback_for_fill_ignores_the_quote_text():
    label = make_label(1)
    example = make_example(label)
    prediction = make_prediction(label, quotes=[QUOTE_NOT_IN_BRIEF])
    optimise = require("priority.optimise")
    trace = [("fill", {"kind": "reply"}, {"payload": {}})]
    feedback = optimise.gepa_feedback(example, prediction, None, "fill['reply']", trace)
    assert feedback.score == pytest.approx(1.0)
    assert "fill" in feedback.feedback
    assert "payload parsed" in feedback.feedback


def test_gepa_feedback_for_fill_names_the_parse_fault():
    label = make_label(1)
    example = make_example(label)
    prediction = make_prediction(label, abstain={"reason": "invalid_output",
                                                 "detail": "fill: the payload did not parse"})
    metric = require("priority.evaluation.metric")
    optimise = require("priority.optimise")
    base, _ = metric.score(example, prediction)
    feedback = optimise.gepa_feedback(example, prediction, None, "fill['reply']", None)
    assert feedback.score == pytest.approx(base)
    assert "fill" in feedback.feedback
    assert "pars" in feedback.feedback.lower() or "invalid_output" in feedback.feedback


def test_gepa_feedback_keeps_the_program_score_for_every_predictor():
    label = make_label(1, status="done")
    example = make_example(label)
    prediction = make_prediction(label, status="done", quotes=[QUOTE_NOT_IN_BRIEF])
    metric = require("priority.evaluation.metric")
    optimise = require("priority.optimise")
    base, _ = metric.score(example, prediction)
    for name in (None, "triage", "pick", "fill['reply']", "card", "stop"):
        feedback = optimise.gepa_feedback(example, prediction, None, name, None)
        assert feedback.score == pytest.approx(base)
        assert isinstance(feedback.feedback, str) and feedback.feedback


def write_seed_program(path):
    """A saved chain program with one seeded demo and one seeded instruction."""
    dspy = require("dspy")
    api = require("priority.interpreter")
    program = api.Interpreter(lm=None)
    program.triage.signature = program.triage.signature.with_instructions(
        "Seed instruction: read the stop and report the session state.")
    program.triage.demos = [
        dspy.Example(brief_text="the seed brief", final_text="the seed final").with_inputs(
            "brief_text", "final_text")
    ]
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
    student = student_of(calls, optimiser)
    assert len(student.triage.demos) == 1
    assert "Seed instruction" in student.triage.signature.instructions


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
            fresh.triage.demos = list(fresh.triage.demos) + [
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
    compiled = recorded["compiled"]

    def field(demo, name):
        # A loaded program carries its demos as plain dicts; a fresh one as Examples.
        return demo.get(name) if isinstance(demo, dict) else getattr(demo, name, None)

    assert any(field(demo, "brief_text") == "the seed brief"
               for demo in compiled.triage.demos), \
        "the seeded demo is missing from the compiled student"
    assert any(field(demo, "brief_text") == "bootstrapped brief"
               for demo in compiled.triage.demos), \
        "the compile dropped its own bootstrapped demo"


def test_non_verbatim_quote_reaches_a_proposal_without_losing_score():
    lm = dummy(script(BLOCKED, [("reply", NOT_IN_BRIEF)]))
    out = interpret(lm)
    assert out.abstained is None
    assert [step.kind for step in out.advice.proposal.steps] == ["reply"]
    assert out.advice.proposal.steps[0].evidence_quote == NOT_IN_BRIEF
    metric = require("priority.evaluation.metric")
    runner = require("priority.evaluation.runner")
    label = make_label(2, status="blocked", needs_human=False,
                       answer_class="approve_continue", risk="low",
                       priority_hint="soon", steps=["reply"])
    example = make_example(label, brief_text=make_brief().for_model())
    parts = metric.components(example, runner.to_prediction(out))
    assert "grounding" not in parts
    assert parts["validity"] == pytest.approx(0.1)
    assert parts["overall"] == pytest.approx(1.0)
