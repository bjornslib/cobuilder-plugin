"""RED: a failed judge call never becomes a score of 0 inside `priority optimise`.

The bug. `judge.judge` reports a failed call as `(0.0, ["judge error: ..."])`. The optimise path calls
`metric.score`, which drops the failure flag that `metric.score_checked` keeps. GEPA then trains on a
false 0, and `optimise.run` reports a train mean that holds the zeros.

What dspy does with a metric that raises (dspy 3.4.1, read in the installed sources):

- `dspy.evaluate.Evaluate` runs the metric inside `ParallelExecutor`, and the executor catches `Exception`
  from the metric, logs it, and leaves the slot empty. `Evaluate` turns an empty slot into
  `(dspy.Prediction(), failure_score)`, and GEPA passes `failure_score=0.0`. `bootstrap_trace_data` and
  `DspyAdapter.evaluate` go through the same `Evaluate`. So an `Exception` from the metric is a silent 0,
  and the run goes on. `test_dspy_evaluate_swallows_an_exception_from_the_metric` pins that fact.
- The executor catches `Exception`, not `BaseException`. An exception that derives from `BaseException`
  only leaves `Evaluate`, the dspy GEPA adapter, and `GEPA.compile`, with one thread or many. The run tests
  below drive the real `dspy.GEPA` and so confirm that path end to end.

The contract these tests set:

1. In the optimise path, a failed judge call is retried a small bounded number of times. The wait between
   tries goes through the module attribute `priority.evaluation.metric.sleep`, which the retry loop reads
   at call time, so a test can replace it and no test sleeps for real.
2. When the retries run out, the metric raises an exception that is NOT an `Exception` subclass, and the
   message names the judge. `optimise.run` catches it, prints `optimise failed: ...` that names the judge
   failure and the stop of the run, returns 1, and writes no program and no report.
3. The eval path is unchanged: `score_checked` makes one judge call, and it returns the `judge_error` flag.

An abstain scores 0 by a code rule (see `payload_rules.pinned`), so a failed judge call on it is not a judge
failure and never stops the run. Every judge, program, and model here is a stub. No test makes a live model call.
"""
from __future__ import annotations

import contextlib
import inspect
import io
import itertools
import re
import threading
import time

import pytest

from eval_support import write_eval_world
from fixtures_support import require
from interpret_support import dspy, propose, step
from interpret_support import DummyLM
from judge_ref_support import install_judge, reply_step

ERROR_NOTE = "judge error: the judge call failed (TimeoutError), scored 0"
GOOD_NOTE = "payload: the made-up parts match."
GOOD_SCORE = 0.8
MAX_TRIES = 5  # a small bound on the tries of one stop, the first try included
STOP_WORDS = re.compile(r"\b(stop|stopped|stopping|abort|aborted|halt|halted)\b", re.I)
CODE = {"session_id": "made-up-session", "author": "interpreter"}


# ---- stubs --------------------------------------------------------------------


class ScriptedJudge:
    """A stub judge. It answers from `script`, one entry for each call, and repeats the last entry.

    An entry is `"fail"` for the error note that `judge.judge` returns, or a float for a good score."""

    def __init__(self, script):
        self.script = list(script)
        self.calls = 0
        self._lock = threading.Lock()

    def __call__(self, brief_text, predicted, expected):
        with self._lock:
            n = self.calls
            self.calls += 1
        entry = self.script[min(n, len(self.script) - 1)]
        if entry == "fail":
            return (0.0, [ERROR_NOTE])
        return (entry, [GOOD_NOTE])


def always_fails():
    return ScriptedJudge(["fail"])


def fails_then_works(failures: int):
    return ScriptedJudge(["fail"] * failures + [GOOD_SCORE])


class FirstTryFails:
    """A stub judge that fails the first call for each stop and works on the next one. Use it with one thread.

    `unretried` counts the failed calls that the very next judge call did not repeat, so no retry followed."""

    def __init__(self):
        self.seen: set = set()
        self.failed_key = None
        self.failures = 0
        self.unretried = 0

    def __call__(self, brief_text, predicted, expected):
        key = (brief_text, repr(predicted), repr(expected))
        if self.failed_key is not None and key != self.failed_key:
            self.unretried += 1
        self.failed_key = None
        if key not in self.seen:
            self.seen.add(key)
            self.failed_key = key
            self.failures += 1
            return (0.0, [ERROR_NOTE])
        return (GOOD_SCORE, [GOOD_NOTE])


@pytest.fixture(autouse=True)
def waits(monkeypatch):
    """Record each wait, and sleep for none. `metric.sleep` is the injected hook. `time.sleep` is a backstop."""
    seen: list = []
    metric = require("priority.evaluation.metric")
    monkeypatch.setattr(metric, "sleep", seen.append, raising=False)
    monkeypatch.setattr(time, "sleep", seen.append)
    return seen


def outcome(call):
    """Run `call`. Return `(value, raised)`, where `raised` holds any BaseException, even a non-Exception one."""
    try:
        return call(), None
    except (KeyboardInterrupt, SystemExit):
        raise
    except BaseException as error:  # noqa: BLE001 (the tests ask which kind of exception left the call)
        return None, error


def example(payloads=None):
    """One labelled stop whose reference holds one reply step, so no code rule pins the score."""
    return dspy.Example(session_id="made-up-session", stop="001", brief_text="The made-up brief.",
                        status="waiting_answer", needs_human=True, priority="P3", ambiguous=False,
                        expected_payloads=[reply_step()] if payloads is None else payloads
                        ).with_inputs("brief_text")


def prediction(**overrides):
    """One program output with one reply step, so no code rule pins the score."""
    fields = dict(status="waiting_answer", needs_human=True, priority="P3",
                  steps=[reply_step() | CODE], abstain=None)
    return dspy.Prediction(**(fields | overrides))


def abstained():
    """One program output that abstained, so a code rule pins the score to 0."""
    return dspy.Prediction(status=None, needs_human=None, priority=None, steps=[],
                           abstain={"reason": "invalid_output", "detail": "made-up detail", "raw": "made-up raw"})


def optimise_metrics():
    """The two metrics that `optimise` hands to dspy: the GEPA one and the plain float one."""
    optimise = require("priority.optimise")
    return {"gepa_feedback": optimise.gepa_feedback, "plain_score": optimise.plain_score}


def score_of(value) -> float:
    """The number in a metric result: a float, or a Prediction with a score."""
    return float(value["score"] if hasattr(value, "feedback") else value)


# ---- the metric, called directly (contract 1 and 2) ---------------------------


@pytest.mark.parametrize("name", ("gepa_feedback", "plain_score"))
def test_a_judge_call_that_fails_once_is_retried_and_the_real_score_returned(monkeypatch, name):
    judge = install_judge(monkeypatch, fails_then_works(1))
    value, raised = outcome(lambda: optimise_metrics()[name](example(), prediction()))
    assert raised is None, f"{name} raised after one failed try, with no retry: {raised!r}"
    assert judge.calls == 2, f"{name} made {judge.calls} judge calls, not a retry after the failed first call"
    assert score_of(value) == pytest.approx(GOOD_SCORE), f"{name} returned {value!r}, not the judge score"


def test_a_retry_that_recovers_leaves_no_judge_error_note_in_the_feedback(monkeypatch):
    install_judge(monkeypatch, fails_then_works(1))
    value, raised = outcome(lambda: optimise_metrics()["gepa_feedback"](example(), prediction()))
    assert raised is None, f"gepa_feedback raised after one failed try: {raised!r}"
    assert "judge error" not in value["feedback"], f"a recovered stop still carries the error note: {value['feedback']!r}"
    assert GOOD_NOTE in value["feedback"]


@pytest.mark.parametrize("name", ("gepa_feedback", "plain_score"))
def test_a_judge_call_that_never_works_does_not_return_a_score(monkeypatch, name):
    install_judge(monkeypatch, always_fails())
    value, raised = outcome(lambda: optimise_metrics()[name](example(), prediction()))
    assert raised is not None, f"{name} returned {value!r} for a failed judge call, a false 0 for the optimiser"


@pytest.mark.parametrize("name", ("gepa_feedback", "plain_score"))
def test_the_failure_is_not_an_exception_subclass_because_dspy_swallows_exceptions(monkeypatch, name):
    install_judge(monkeypatch, always_fails())
    value, raised = outcome(lambda: optimise_metrics()[name](example(), prediction()))
    assert raised is not None, f"{name} returned {value!r} for a failed judge call"
    assert not isinstance(raised, Exception), (
        f"{name} raised {type(raised).__name__}, an Exception, and dspy turns that into a score of 0")


@pytest.mark.parametrize("name", ("gepa_feedback", "plain_score"))
def test_the_failure_message_names_the_judge(monkeypatch, name):
    install_judge(monkeypatch, always_fails())
    _, raised = outcome(lambda: optimise_metrics()[name](example(), prediction()))
    assert raised is not None, f"{name} raised nothing for a failed judge call"
    assert "judge" in str(raised).lower(), f"the failure does not name the judge: {str(raised)!r}"


def test_the_retries_are_bounded_and_more_than_none(monkeypatch):
    judge = install_judge(monkeypatch, always_fails())
    outcome(lambda: optimise_metrics()["plain_score"](example(), prediction()))
    assert 2 <= judge.calls <= MAX_TRIES, f"the metric made {judge.calls} judge calls for one failed stop"


def test_the_wait_between_tries_goes_through_the_injected_sleep(monkeypatch):
    install_judge(monkeypatch, fails_then_works(1))
    metric = require("priority.evaluation.metric")
    injected: list = []
    monkeypatch.setattr(metric, "sleep", injected.append, raising=False)
    outcome(lambda: optimise_metrics()["plain_score"](example(), prediction()))
    assert injected, "a retry made no wait through `priority.evaluation.metric.sleep`"
    assert all(isinstance(wait, (int, float)) and 0 <= wait <= 60 for wait in injected), f"bad waits: {injected}"


def test_a_good_first_call_makes_one_judge_call_and_no_wait(monkeypatch, waits):
    judge = install_judge(monkeypatch, ScriptedJudge([GOOD_SCORE]))
    value, raised = outcome(lambda: optimise_metrics()["plain_score"](example(), prediction()))
    assert raised is None and judge.calls == 1 and waits == [], \
        f"a working judge made {judge.calls} calls and {len(waits)} waits, raised {raised!r}"
    assert score_of(value) == pytest.approx(GOOD_SCORE)


def test_a_real_zero_from_a_working_judge_is_not_retried_and_not_a_failure(monkeypatch):
    judge = install_judge(monkeypatch, ScriptedJudge([0.0]))
    value, raised = outcome(lambda: optimise_metrics()["plain_score"](example(), prediction()))
    assert raised is None, f"a real 0 from a working judge raised {raised!r}"
    assert judge.calls == 1 and score_of(value) == 0.0, f"{judge.calls} judge calls, value {value!r}"


@pytest.mark.parametrize("name", ("gepa_feedback", "plain_score"))
def test_a_stop_pinned_by_a_code_rule_never_stops_the_run_when_the_judge_failed(monkeypatch, name):
    install_judge(monkeypatch, always_fails())
    value, raised = outcome(lambda: optimise_metrics()[name](example(), abstained()))
    assert raised is None, f"{name} raised for an abstain that code pins to 0, so the judge is not needed: {raised!r}"
    assert score_of(value) == 0.0


# ---- the eval path keeps its behaviour (contract 3) ---------------------------


def test_score_checked_still_returns_the_judge_error_flag_after_one_call(monkeypatch):
    judge = install_judge(monkeypatch, always_fails())
    metric = require("priority.evaluation.metric")
    value, feedback, judge_error = metric.score_checked(example(), prediction())
    assert (value, judge_error) == (0.0, True), f"score_checked returned {(value, feedback, judge_error)!r}"
    assert "judge error:" in feedback
    assert judge.calls == 1, f"the eval path made {judge.calls} judge calls for one stop, not 1"


def test_score_checked_leaves_the_flag_false_for_a_pinned_stop(monkeypatch):
    install_judge(monkeypatch, always_fails())
    metric = require("priority.evaluation.metric")
    value, _, judge_error = metric.score_checked(example(), abstained())
    assert (value, judge_error) == (0.0, False)


# ---- dspy itself (the finding that forces the exception kind) -----------------


class Gone(BaseException):
    """A made-up failure that is not an Exception."""


def _evaluate(metric_fn, threads: int):
    """`dspy.Evaluate` with the settings that the dspy GEPA adapter uses."""
    devset = [dspy.Example(brief_text=f"b{n}").with_inputs("brief_text") for n in range(3)]
    evaluator = dspy.Evaluate(devset=devset, metric=metric_fn, num_threads=threads, failure_score=0.0,
                              provide_traceback=True, max_errors=len(devset) * 100, display_progress=False)
    return evaluator(lambda brief_text: dspy.Prediction(answer="made-up"))


def test_dspy_evaluate_swallows_an_exception_from_the_metric():
    def metric_fn(example, prediction, *rest):
        raise RuntimeError("made-up judge failure")

    for threads in (1, 3):
        result, raised = outcome(lambda: _evaluate(metric_fn, threads))
        assert raised is None, f"dspy no longer swallows an Exception ({threads} threads): {raised!r}"
        assert [score for *_, score in result.results] == [0.0, 0.0, 0.0]


@pytest.mark.parametrize("threads", (1, 3))
def test_dspy_evaluate_lets_a_base_exception_from_the_metric_through(threads):
    def metric_fn(example, prediction, *rest):
        raise Gone("made-up judge failure")

    _, raised = outcome(lambda: _evaluate(metric_fn, threads))
    assert isinstance(raised, Gone), f"dspy swallowed a BaseException ({threads} threads): {raised!r}"


@pytest.mark.parametrize("name", ("gepa_feedback", "plain_score"))
@pytest.mark.parametrize("threads", (1, 3))
def test_a_failed_judge_call_does_not_become_a_dspy_failure_score(monkeypatch, name, threads):
    install_judge(monkeypatch, always_fails())
    metric_fn = optimise_metrics()[name]

    def scored():
        devset = [example()]
        evaluator = dspy.Evaluate(devset=devset, metric=metric_fn, num_threads=threads, failure_score=0.0,
                                  provide_traceback=True, max_errors=100, display_progress=False)
        return evaluator(lambda brief_text: prediction())

    result, raised = outcome(scored)
    assert raised is not None, \
        f"dspy.Evaluate scored a failed judge call with {name} ({threads} threads): {result.results!r}"
    assert not isinstance(raised, Exception), f"{name} raised an Exception, which dspy does not surface: {raised!r}"


# ---- the run, with the real dspy.GEPA (contract 2) ----------------------------


def gepa_world(monkeypatch, tmp_path):
    """A made-up world, a DummyLM student, and a DummyLM reflection model. No live call is possible."""
    optimise = require("priority.optimise")
    interpreter_mod = require("priority.interpreter")
    manifest, labels, real_dir, parts = write_eval_world(tmp_path, payloads=[step("reply")])
    reply = propose([step("reply")], status="waiting_answer") | {"new_instruction": "Made-up better instruction."}
    lm = DummyLM(itertools.cycle([reply]))
    monkeypatch.setattr(interpreter_mod, "interpreter_lm", lambda retries=0: lm)
    monkeypatch.setattr(optimise, "_reflection_lm", lambda: lm)
    monkeypatch.chdir(tmp_path)
    return optimise, manifest, labels, real_dir


def run_gepa(monkeypatch, tmp_path, threads: int):
    """Run `optimise.run` with the real GEPA. Return the code, the printed text, and what the run raised."""
    optimise, manifest, labels, real_dir = gepa_world(monkeypatch, tmp_path)
    out = io.StringIO()
    with contextlib.redirect_stdout(out):
        code, raised = outcome(lambda: optimise.run(manifest, labels, real_dir, "gepa", 1, 7, threads=threads))
    return code, out.getvalue(), raised


def written(tmp_path) -> list:
    """The program, rows, and report files that a run wrote under the work folder."""
    return sorted(str(path.relative_to(tmp_path)) for path in (tmp_path / "probes").rglob("*") if path.is_file()) \
        if (tmp_path / "probes").exists() else []


@pytest.mark.parametrize("threads", (1, 3))
def test_gepa_stops_with_exit_1_when_the_judge_never_works(monkeypatch, tmp_path, threads):
    judge = install_judge(monkeypatch, always_fails())
    code, printed, raised = run_gepa(monkeypatch, tmp_path, threads)
    assert raised is None, f"the run let {type(raised).__name__} escape instead of returning 1: {raised!r}"
    assert code == 1, f"GEPA compiled on a failed judge: code {code!r}, {judge.calls} judge calls, output {printed[-300:]!r}"


@pytest.mark.parametrize("threads", (1, 3))
def test_the_stop_message_names_the_judge_failure_and_the_stop(monkeypatch, tmp_path, threads):
    install_judge(monkeypatch, always_fails())
    code, printed, raised = run_gepa(monkeypatch, tmp_path, threads)
    assert raised is None and code == 1, f"the run did not return 1: code {code!r}, raised {raised!r}"
    lines = [line for line in printed.splitlines() if line.startswith("optimise failed:")]
    assert lines, f"no `optimise failed:` line: {printed[-400:]!r}"
    assert "judge" in lines[-1].lower(), f"the line does not name the judge: {lines[-1]!r}"
    assert STOP_WORDS.search(lines[-1]), f"the line does not say that the run stopped: {lines[-1]!r}"
    assert "Traceback" not in printed


def test_a_stopped_run_saves_no_program_and_no_report(monkeypatch, tmp_path):
    install_judge(monkeypatch, always_fails())
    code, printed, raised = run_gepa(monkeypatch, tmp_path, 1)
    assert raised is None and code == 1, f"the run did not return 1: code {code!r}, raised {raised!r}"
    assert written(tmp_path) == [], f"a stopped run wrote files: {written(tmp_path)}"
    assert "compiled on" not in printed and "train overall" not in printed


def test_gepa_retries_every_failed_judge_call_at_once_and_finishes_with_real_scores(monkeypatch, tmp_path):
    judge = install_judge(monkeypatch, FirstTryFails())
    code, printed, raised = run_gepa(monkeypatch, tmp_path, 1)
    assert raised is None, f"the run raised {raised!r}"
    assert code == 0, f"a failed first try, then a working judge, stopped the run: code {code!r}, {printed[-300:]!r}"
    assert judge.failures > 0, "the stub judge failed no call"
    assert judge.unretried == 0, \
        f"{judge.unretried} of {judge.failures} failed judge calls got no retry, so GEPA scored them 0"
    match = re.search(r"train overall (\d+\.\d+)", printed)
    assert match and float(match.group(1)) == pytest.approx(GOOD_SCORE), \
        f"the train mean is not the judge score: {printed[-300:]!r}"


class FailsInReflection:
    """A stub judge that works for dspy's evaluations and fails only when GEPA's `feedback_fn` calls the metric
    itself to build the reflective dataset. That call does not go through `Evaluate`, so no executor sits
    between the metric and GEPA's own error handling."""

    def __init__(self):
        self.failed = 0

    def __call__(self, brief_text, predicted, expected):
        if any(frame.function == "feedback_fn" for frame in inspect.stack()):
            self.failed += 1
            return (0.0, [ERROR_NOTE])
        return (GOOD_SCORE, [GOOD_NOTE])


def test_gepa_stops_when_the_judge_fails_while_it_builds_the_reflective_dataset(monkeypatch, tmp_path):
    judge = install_judge(monkeypatch, FailsInReflection())
    code, printed, raised = run_gepa(monkeypatch, tmp_path, 1)
    assert judge.failed > 0, "GEPA never scored a stop in `feedback_fn`, so the test reaches no reflection path"
    assert raised is None, f"the run let {type(raised).__name__} escape instead of returning 1: {raised!r}"
    assert code == 1, f"a failed judge call in the reflection step did not stop the run: code {code!r}, {printed[-300:]!r}"
    assert written(tmp_path) == [], f"a stopped run wrote files: {written(tmp_path)}"


# ---- the post-compile rescore of the train stops ------------------------------


class CannedProgram:
    """A stub compiled program. It always returns one reply step, so no code rule pins the score."""

    def __call__(self, *args, **kwargs):
        return prediction()

    def named_predictors(self):
        return []


def run_rescore(monkeypatch, tmp_path):
    """Run `optimise.run` with a stub BootstrapFewShot, so only the rescore of the train stops scores a stop."""
    import dspy.teleprompt as teleprompt

    optimise = require("priority.optimise")
    interpreter_mod = require("priority.interpreter")
    manifest, labels, real_dir, _ = write_eval_world(tmp_path, payloads=[reply_step()])
    program = CannedProgram()

    class StubOptimiser:
        def compile(self, *args, **kwargs):
            return program

    monkeypatch.setattr(teleprompt, "BootstrapFewShot", lambda *args, **kwargs: StubOptimiser())
    monkeypatch.setattr(interpreter_mod, "Interpreter", lambda *args, **kwargs: program)
    monkeypatch.chdir(tmp_path)
    out = io.StringIO()
    with contextlib.redirect_stdout(out):
        code, raised = outcome(lambda: optimise.run(manifest, labels, real_dir, "bootstrap", 1, 7))
    return code, out.getvalue(), raised


def test_the_train_rescore_stops_the_run_when_the_judge_never_works(monkeypatch, tmp_path):
    install_judge(monkeypatch, always_fails())
    code, printed, raised = run_rescore(monkeypatch, tmp_path)
    assert raised is None, f"the run let {type(raised).__name__} escape instead of returning 1: {raised!r}"
    assert code == 1, f"the rescore scored a failed judge as 0 and the run went on: code {code!r}, {printed[-300:]!r}"
    lines = [line for line in printed.splitlines() if line.startswith("optimise failed:")]
    assert lines and "judge" in lines[-1].lower() and STOP_WORDS.search(lines[-1]), \
        f"no failure line that names the judge and the stop: {printed[-300:]!r}"
    assert "train overall" not in printed, "the run printed a train mean over false zeros"


def test_the_train_rescore_writes_no_rows_with_false_zeros(monkeypatch, tmp_path):
    install_judge(monkeypatch, always_fails())
    run_rescore(monkeypatch, tmp_path)
    rows = sorted((tmp_path / "probes" / "programs").glob("*-rows.jsonl")) if (tmp_path / "probes").exists() else []
    assert rows == [], f"the run wrote a rows file after a failed judge: {[str(path) for path in rows]}"


def test_the_train_rescore_retries_a_failed_judge_call(monkeypatch, tmp_path):
    install_judge(monkeypatch, fails_then_works(1))
    code, printed, raised = run_rescore(monkeypatch, tmp_path)
    assert raised is None and code == 0, f"one failed call stopped the run: code {code!r}, raised {raised!r}, {printed[-300:]!r}"
    match = re.search(r"train overall (\d+\.\d+)", printed)
    assert match and float(match.group(1)) == pytest.approx(GOOD_SCORE), f"false zero in the mean: {printed[-300:]!r}"
