"""RED, slice 22 (epic E7): the optimiser run gives the reflection model complete evidence.

1. REGRESSION (already holds): a failed `propose` parse or validation leaves a trace entry with
   `raw_reply` and `error`. DSPy's reflective dataset keeps that failed stop, with its abstain note.
2. RED for the prefix: `gepa_feedback` starts with `Score: <v:.2f> of 1.00.`. Its score equals
   `metric.score` for the same input (REGRESSION guard).
3. RED: `optimise --optimiser gepa` writes `reflection-001.json` and `candidates.json` into a log dir
   (default `probes/programs/<stem>-budget<b>-seed<s>-log/`, override `--gepa-log-dir`). The GEPA
   class gets `track_stats=True` and `log_dir=<dir>/gepa`.

Every judge, program, and model here is a stub. No test makes a live model call.
"""
import contextlib
import io
import itertools
import json
import time
from pathlib import Path

import pytest

from eval_support import write_eval_world
from fixtures_support import require
from interpret_support import DummyLM, dspy, propose, step
from judge_ref_support import install_judge, reply_step

GOOD_NOTE = "payload: the made-up parts match."
GOOD_SCORE = 0.8
CODE = {"session_id": "made-up-session", "author": "interpreter"}
BAD_REPLY = propose(steps="this is not JSON")
OVER_LIMIT_REPLY = propose([step("reply", text=f"made-up {i}") for i in range(4)], status="nonsense")
SEED_INSTRUCTION = "Made-up seed instruction."
DEFAULT_LOG = "probes/programs/gepa-budget2-seed7-log"
LOG_CASES = (((), DEFAULT_LOG), (("--gepa-log-dir", "made-up-log"), "made-up-log"))
LOG_IDS = ("default", "override")


@pytest.fixture(autouse=True)
def no_sleep(monkeypatch):
    """Sleep for none: the metric's injected hook and the retry waits."""
    monkeypatch.setattr(require("priority.evaluation.metric"), "sleep", lambda seconds: None, raising=False)
    monkeypatch.setattr(time, "sleep", lambda seconds: None)


def judge_ok(monkeypatch):
    """Stub judge: every stop scores GOOD_SCORE with one note."""
    install_judge(monkeypatch, lambda brief, predicted, expected: (GOOD_SCORE, [GOOD_NOTE]))


def outcome(call):
    """Run `call`. Return `(value, raised)`; `raised` holds an ordinary exception that escaped it."""
    try:
        return call(), None
    except Exception as error:  # noqa: BLE001 (the test reports which exception left the call)
        return None, error


def example():
    """One labelled stop with one reply step, so no code rule pins the score."""
    return dspy.Example(session_id="made-up-session", stop="001", brief_text="The made-up brief.",
                        status="waiting_answer", needs_human=True, priority="P3", ambiguous=False,
                        expected_payloads=[reply_step()]).with_inputs("brief_text")


def prediction():
    """One program output with one reply step."""
    return dspy.Prediction(status="waiting_answer", needs_human=True, priority="P3",
                           steps=[reply_step() | CODE], abstain=None)


def abstained():
    """One program output that abstained, so a code rule pins the score to 0."""
    return dspy.Prediction(status=None, needs_human=None, priority=None, steps=[],
                           abstain={"reason": "invalid_output", "detail": "made-up detail", "raw": "made-up raw"})


def gepa_world(monkeypatch, tmp_path):
    """Stub the task and reflection models, and move into `tmp_path`. Return the paths and reflection model."""
    optimise = require("priority.optimise")
    manifest, labels, real_dir, _ = write_eval_world(tmp_path, payloads=[step("reply")])
    task_lm = DummyLM(itertools.cycle([BAD_REPLY, propose([step("reply")]), propose([step("reply")])]))
    reflection_lm = DummyLM(itertools.cycle([{"new_instruction": "Made-up better instruction."}]),
                            adapter=dspy.JSONAdapter())
    monkeypatch.setattr(require("priority.interpreter"), "interpreter_lm", lambda retries=0: task_lm)
    monkeypatch.setattr(optimise, "_reflection_lm", lambda: reflection_lm)
    monkeypatch.chdir(tmp_path)
    return manifest, labels, real_dir, reflection_lm


def run_optimise(monkeypatch, tmp_path, extra_args=()):
    """Run `priority optimise --optimiser gepa` on stub models. Return (code, printed, raised, reflection_lm)."""
    judge_ok(monkeypatch)
    manifest, labels, real_dir, reflection_lm = gepa_world(monkeypatch, tmp_path)
    argv = ["optimise", "--optimiser", "gepa", "--manifest", str(manifest), "--labels", str(labels),
            "--real-dir", str(real_dir), "--budget", "2", "--seed", "7", "--threads", "1",
            "--minibatch", "3", *extra_args]
    out, code, raised = io.StringIO(), None, None
    with contextlib.redirect_stdout(out), contextlib.redirect_stderr(out):
        try:
            code = require("priority.cli").main(argv)
        except SystemExit as exit_:  # argparse exits on an unknown flag
            code = exit_.code
        except Exception as error:  # the test reports what escaped `main`
            raised = error
    return code, out.getvalue(), raised, reflection_lm


def stub_gepa(monkeypatch):
    """Replace GEPA with a class that records its settings and returns the student. Return the record list."""
    import dspy.teleprompt as teleprompt

    calls: list = []

    class StubGEPA:
        def __init__(self, **settings):
            calls.append(settings)

        def compile(self, student, trainset=None, valset=None):
            return student

    monkeypatch.setattr(teleprompt, "GEPA", StubGEPA)
    return calls


def gepa_log_dir(calls, work):
    """Return (settings, run dir) from the stub GEPA class's first build. Assert it received a `log_dir`."""
    assert calls, "the stub GEPA class was never built, so the run skipped the compile"
    settings = calls[0]
    assert "log_dir" in settings, f"no log_dir keyword in {sorted(settings)}"
    return settings, (work / Path(str(settings["log_dir"]))).parent


def spy_proposer(monkeypatch):
    """Record each reflective dataset that the module's instruction proposer receives."""
    optimise = require("priority.optimise")
    original = require("priority.gepa_proposer").guided_instruction_proposer
    seen: list = []

    def spy(candidate, reflective_dataset, components_to_update):
        seen.append({name: [dict(item) for item in items] for name, items in reflective_dataset.items()})
        return original(candidate, reflective_dataset, components_to_update)

    monkeypatch.setattr(optimise, "guided_instruction_proposer", spy)
    return seen


# ---- contract 1 (REGRESSION): the failed stop keeps its raw reply and its error ----


def trace_of(reply):
    """Run one Interpreter call inside a trace with one stub reply. Return (interp, out, trace)."""
    interp = require("priority.interpreter.module").Interpreter(lm=DummyLM([reply]), waits=(0,))
    with dspy.context(trace=[]):
        out = interp(brief_text="The made-up brief.")
        trace = list(dspy.settings.trace)
    return interp, out, trace


@pytest.mark.parametrize("reply", (BAD_REPLY, OVER_LIMIT_REPLY), ids=("parse", "validation"))
def test_a_failed_stop_leaves_a_trace_entry_with_raw_reply_and_error(reply):
    interp, out, trace = trace_of(reply)
    assert len(trace) == 1 and trace[0][0] is interp.propose, f"the trace is {trace!r}"
    assert trace[0][1] == {"brief_text": "The made-up brief."}, f"the trace inputs are {trace[0][1]!r}"
    assert out.abstain is not None and out.abstain["reason"] == "invalid_output", \
        f"forward returned {out.abstain!r}, not an invalid_output abstain"
    outputs = trace[0][2]
    assert outputs.get("raw_reply") == out.abstain["raw"], f"the trace outputs hold {outputs.get('raw_reply')!r}"
    assert outputs.get("error") == out.abstain["detail"] and outputs["error"], \
        f"the trace outputs hold error {outputs.get('error')!r}, not the detail"


def test_the_reflective_dataset_keeps_the_failed_stop_with_its_abstain_note(monkeypatch):
    from dspy.teleprompt.gepa.gepa_utils import DspyAdapter

    judge_ok(monkeypatch)
    gepa_feedback = require("priority.optimise").gepa_feedback
    interp = require("priority.interpreter.module").Interpreter(
        lm=DummyLM([BAD_REPLY, propose([step("reply")]), propose([step("reply")])]), waits=(0,))

    def metric_fn(example, prediction, trace=None, pred_name=None, pred_trace=None):
        return gepa_feedback(example, prediction, trace, pred_name, pred_trace)

    def feedback_fn(**kw):
        return gepa_feedback(kw["module_inputs"], kw["module_outputs"], kw["captured_trace"], "propose")

    adapter = DspyAdapter(student_module=interp, metric_fn=metric_fn,
                          feedback_map={"propose": feedback_fn},
                          add_format_failure_as_feedback=True)
    examples = [dspy.Example(brief_text=f"The made-up brief {i}.", expected_payloads=[reply_step()],
                             priority="P3").with_inputs("brief_text") for i in range(3)]
    batch = adapter.batch_evaluate([({"propose": SEED_INSTRUCTION}, examples)], capture_traces=True)[0]
    items = adapter.make_reflective_dataset({"propose": SEED_INSTRUCTION}, batch, ["propose"]).get("propose", [])
    assert len(items) == 3, f"the reflective dataset holds {len(items)} examples, not the batch of 3"
    failed = [item for item in items if "raw_reply" in item["Generated Outputs"]]
    assert len(failed) == 1, f"{len(failed)} reflective examples carry a raw reply, not the one failed stop"
    outputs = failed[0]["Generated Outputs"]
    assert "this is not JSON" in outputs["raw_reply"], f"the raw reply is {outputs['raw_reply']!r}"
    assert outputs.get("error"), f"the failed stop's outputs hold {sorted(outputs)}, no error text"
    assert "abstain" in failed[0]["Feedback"], f"the feedback is {failed[0]['Feedback']!r}, no abstain note"


def test_a_full_gepa_run_reflects_on_the_failed_stop_with_its_abstain_note(monkeypatch, tmp_path):
    seen = spy_proposer(monkeypatch)
    code, printed, raised, reflection_lm = run_optimise(monkeypatch, tmp_path)
    assert raised is None and code == 0, f"the run raised {raised!r} or exited {code}: {printed[-300:]!r}"
    assert seen and reflection_lm.history, "no reflection call happened, so no dataset was built"
    items = [item for datasets in seen for item in datasets.get("propose", [])]
    feedbacks = [item["Feedback"] for item in items if "raw_reply" in item["Generated Outputs"]]
    assert feedbacks, "no reflective example carries a raw reply, so the failed stop never reached reflection"
    assert any("abstain" in feedback for feedback in feedbacks), f"no abstain note in {feedbacks!r}"
    assert any(len(datasets.get("propose", [])) == 3 for datasets in seen), "no dataset holds the minibatch of 3"


# ---- contract 2: the feedback starts with the score (RED for the prefix) ---------


@pytest.mark.parametrize("pred_factory,score", ((prediction, GOOD_SCORE), (abstained, 0.0)))
def test_gepa_feedback_starts_with_the_score_line(monkeypatch, pred_factory, score):
    judge_ok(monkeypatch)
    value, raised = outcome(lambda: require("priority.optimise").gepa_feedback(example(), pred_factory()))
    assert raised is None, f"gepa_feedback raised {raised!r}"
    assert value["feedback"].startswith(f"Score: {score:.2f} of 1.00."), \
        f"the feedback is {value['feedback']!r}, not the score line"
    assert float(value["score"]) == pytest.approx(score), f"the score is {value['score']!r}"


def test_the_abstain_feedback_holds_the_abstain_note(monkeypatch):
    judge_ok(monkeypatch)
    value, raised = outcome(lambda: require("priority.optimise").gepa_feedback(example(), abstained()))
    assert raised is None and "abstain" in value["feedback"], f"the abstain feedback holds no note: {value!r}"


@pytest.mark.parametrize("pred_factory", (prediction, abstained))
def test_the_gepa_score_equals_the_metric_score_for_the_same_input(monkeypatch, pred_factory):
    judge_ok(monkeypatch)
    ex, pred = example(), pred_factory()
    value, raised = outcome(lambda: require("priority.optimise").gepa_feedback(ex, pred))
    assert raised is None, f"gepa_feedback raised {raised!r}"
    expected, _ = require("priority.evaluation.metric").score(ex, pred)
    assert float(value["score"]) == pytest.approx(expected), \
        f"gepa_feedback scored {value['score']!r}, metric.score gave {expected!r}"


# ---- contract 3: the log dir and the GEPA settings (RED) -------------------------


@pytest.mark.parametrize("extra_args,rel_dir", LOG_CASES, ids=LOG_IDS)
def test_the_gepa_class_gets_track_stats_and_a_log_dir_that_is_created(monkeypatch, tmp_path, extra_args, rel_dir):
    calls = stub_gepa(monkeypatch)
    code, printed, raised, _ = run_optimise(monkeypatch, tmp_path, extra_args)
    assert raised is None and code == 0, f"the run raised {raised!r} or exited {code}: {printed[-300:]!r}"
    settings, run_dir = gepa_log_dir(calls, tmp_path)
    assert settings.get("track_stats") is True, f"no track_stats=True in {sorted(settings)}"
    assert str(settings["log_dir"]).endswith("gepa"), f"the log_dir is {settings['log_dir']!r}, not <dir>/gepa"
    assert run_dir.resolve() == (tmp_path / rel_dir).resolve(), f"the log dir is {run_dir}, not {rel_dir}"
    assert run_dir.is_dir(), f"the log dir {run_dir} was not created"


@pytest.mark.parametrize("extra_args,rel_dir", LOG_CASES, ids=LOG_IDS)
def test_the_log_dir_holds_the_first_reflection_call_and_the_candidates(monkeypatch, tmp_path, extra_args, rel_dir):
    code, printed, raised, reflection_lm = run_optimise(monkeypatch, tmp_path, extra_args)
    assert raised is None and code == 0, f"the run raised {raised!r} or exited {code}: {printed[-300:]!r}"
    assert reflection_lm.history, "no reflection model call happened, so no reflection file can exist"
    run_dir = tmp_path / rel_dir
    assert run_dir.is_dir(), f"no log dir at {run_dir}"
    reflection = run_dir / "reflection-001.json"
    assert reflection.is_file(), f"no reflection-001.json in {run_dir}: {sorted(p.name for p in run_dir.iterdir())}"
    record = json.loads(reflection.read_text())
    assert {"component", "current_instruction", "reflective_dataset", "proposal"} <= set(record), \
        f"reflection-001.json holds {sorted(record)}"
    assert record["component"] == "propose" and record["reflective_dataset"], \
        f"the component is {record['component']!r}, the dataset is {record['reflective_dataset']!r:.100}"
    candidates = run_dir / "candidates.json"
    assert candidates.is_file(), f"no candidates.json in {run_dir}"
    data = json.loads(candidates.read_text())
    assert isinstance(data, dict) and "best_index" in data, f"candidates.json holds {str(data)[:200]}"
    entries = data.get("candidates") or []
    assert entries and all({"instruction", "parents", "val_score"} <= set(entry) for entry in entries), \
        f"the candidates are {entries[:1]!r}, not records with instruction, parents, and val_score"
