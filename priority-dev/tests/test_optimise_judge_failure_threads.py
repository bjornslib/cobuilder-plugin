"""A failed judge call ends a 4-thread dspy run, and never becomes a silent 0.

The sibling file `test_optimise_judge_failure.py` covers 1 and 3 threads with real `dspy.Evaluate` and
real `dspy.GEPA`. These tests repeat the two worst cases at `num_threads=4`, where a swallowed metric
exception would be hardest to see:

1. `dspy.Evaluate` at 4 threads over 12 examples, with a judge that always fails.
2. `dspy.Evaluate` and a full `optimise.run` with real `dspy.GEPA` at 4 threads, with a judge that fails
   only for one example, while the other calls succeed slowly.

Each run executes in its own subprocess with a hard 60 s timeout, so a hang fails the test and never
blocks the suite. The subprocess installs the stub judge, stubs `priority.evaluation.metric.sleep` to a
no-op, and prints one `RESULT_JSON:` line with what happened. The tests then assert that the run ended
inside the timeout, that `JudgeFailure` (or the `optimise failed:` exit 1 through `optimise.run`) reached
the caller, and that no score table or saved program holds a silent 0. Every judge, program, and model is
a stub. No test makes a live model call.
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
import time
from pathlib import Path

import pytest

from probe_support import PRIORITY_DEV
from test_optimise_judge_failure import STOP_WORDS

TIMEOUT = 60.0  # seconds; a run that is still going then is a hang, and the test fails
RESULT_MARK = "RESULT_JSON:"

RUNNER = r'''
"""One offline optimise scenario in its own process, with no live model call."""
from __future__ import annotations

import contextlib
import io
import itertools
import json
import os
import pathlib
import sys
import tempfile
import threading
import time

import pytest

import dspy

from eval_support import write_eval_world
from fixtures_support import require
from interpret_support import DummyLM, propose, step
from test_optimise_judge_failure import ERROR_NOTE, GOOD_NOTE, GOOD_SCORE, ScriptedJudge, example, prediction

MODE = json.loads(sys.argv[1])
RESULT_MARK = "__RESULT_MARK__"

optimise = require("priority.optimise")
judge_api = require("priority.evaluation.judge")
metric_mod = require("priority.evaluation.metric")


class FailsOneStop:
    """A stub judge that fails the first example it sees on every call, and works slowly on the others.

    It marks one brief by the example's place in the devset, not by its text: the metric gets the brief
    text in, but a stub judge can also pin the failure to the first call, so at 4 threads one worker
    fails while the other workers keep scoring the slow successes."""

    def __init__(self):
        self.bad = None
        self.calls = 0
        self.failures = 0
        self.good = 0
        self._lock = threading.Lock()

    def __call__(self, brief_text, predicted, expected):
        with self._lock:
            if self.bad is None:
                self.bad = brief_text
            bad = brief_text == self.bad
            self.calls += 1
        if bad:
            self.failures += 1
            return (0.0, [ERROR_NOTE])
        self.good += 1
        time.sleep(0.05)  # the slow success, so a hung retry loop cannot hide behind fast stubs
        return (GOOD_SCORE, [GOOD_NOTE])


def make_judge():
    return ScriptedJudge(["fail"]) if MODE.endswith("always") else FailsOneStop()


def run_evaluate(mp):
    """`dspy.Evaluate` at 4 threads over 12 examples, with the real optimise metric."""
    judge = make_judge()
    mp.setattr(judge_api, "judge", judge)
    examples = []
    for n in range(12):
        item = example()
        item.brief_text = f"the made-up brief number {n}"
        examples.append(item)
    evaluator = dspy.Evaluate(devset=examples, metric=optimise.gepa_feedback, num_threads=4,
                              failure_score=0.0, provide_traceback=True, max_errors=len(examples) * 100,
                              display_progress=False)
    result, raised = None, None
    try:
        result = evaluator(lambda brief_text: prediction())
    except BaseException as exc:  # the test asks which kind of exception left dspy
        raised = f"{type(exc).__name__}: {exc}"
    scores = [score for *_, score in result.results] if result is not None else None
    return {"mode": MODE, "raised": raised, "scores": scores, "judge_calls": judge.calls,
            "judge_failures": getattr(judge, "failures", None), "judge_good": getattr(judge, "good", None)}


def run_gepa(mp):
    """A full `optimise.run` with the real GEPA at 4 threads, in a made-up world."""
    judge = make_judge()
    mp.setattr(judge_api, "judge", judge)
    previous = os.getcwd()
    with tempfile.TemporaryDirectory() as tmp:
        os.chdir(tmp)
        try:
            manifest, labels, real_dir, _ = write_eval_world(pathlib.Path(tmp), payloads=[step("reply")])
            reply = propose([step("reply")], status="waiting_answer") | {"new_instruction": "Made-up better instruction."}
            lm = DummyLM(itertools.cycle([reply]))
            mp.setattr(require("priority.interpreter"), "interpreter_lm", lambda retries=0: lm)
            mp.setattr(optimise, "_reflection_lm", lambda: lm)
            out = io.StringIO()
            code, raised = 2, None
            with contextlib.redirect_stdout(out):
                try:
                    code = optimise.run(manifest, labels, real_dir, "gepa", 1, 7, threads=4)
                except BaseException as exc:
                    raised = f"{type(exc).__name__}: {exc}"
            printed = out.getvalue()
        finally:
            os.chdir(previous)
        probes = pathlib.Path(tmp) / "probes"
        saved = sorted(str(path.relative_to(tmp)) for path in probes.rglob("*")
                       if path.is_file()) if probes.exists() else []
        return {"mode": MODE, "code": code, "raised": raised, "saved": saved,
                "failed_lines": [line for line in printed.splitlines() if line.startswith("optimise failed:")],
                "has_train_overall": "train overall" in printed, "printed_tail": printed[-400:],
                "judge_calls": judge.calls, "judge_failures": getattr(judge, "failures", None),
                "judge_good": getattr(judge, "good", None)}


def main():
    mp = pytest.MonkeyPatch()
    mp.setattr(metric_mod, "sleep", lambda seconds: None, raising=False)
    record = run_evaluate(mp) if MODE.startswith("evaluate") else run_gepa(mp)
    print(RESULT_MARK + json.dumps(record))


main()
'''


def run_offline(tmp_path: Path, mode: str) -> dict:
    """Run one scenario in a subprocess with a hard timeout. Return its result record."""
    script = tmp_path / f"runner-{mode}.py"
    script.write_text(RUNNER.replace('MODE = json.loads(sys.argv[1])', f'MODE = {mode!r}')
                      .replace("__RESULT_MARK__", RESULT_MARK))
    env = {**os.environ,
           "PYTHONPATH": os.pathsep.join([str(PRIORITY_DEV / "src"), str(PRIORITY_DEV / "tests")])}
    started = time.monotonic()
    try:
        proc = subprocess.run([sys.executable, str(script)], capture_output=True, text=True,
                              timeout=TIMEOUT, cwd=str(PRIORITY_DEV), env=env)
    except subprocess.TimeoutExpired:
        pytest.fail(f"the {mode} run at 4 threads was still going after {TIMEOUT:.0f} s: a hang, not a score")
    seconds = time.monotonic() - started
    lines = [line for line in proc.stdout.splitlines() if line.startswith(RESULT_MARK)]
    assert lines, (f"the {mode} run printed no result after {seconds:.1f} s "
                   f"(exit {proc.returncode})\nstdout tail: {proc.stdout[-600:]}\nstderr tail: {proc.stderr[-600:]}")
    record = json.loads(lines[-1][len(RESULT_MARK):])
    record["seconds"] = round(seconds, 1)
    return record


def assert_judge_failure_raised(record: dict) -> None:
    """The run ended, inside the timeout, with JudgeFailure, and Evaluate returned no score table."""
    assert record["seconds"] < TIMEOUT, f"the run took {record['seconds']} s"
    assert record["raised"] is not None and record["raised"].startswith("JudgeFailure"), \
        f"no JudgeFailure reached the caller after {record['seconds']} s: {record['raised']!r}"
    assert record["scores"] is None, \
        f"Evaluate returned a score table over a failed judge: {record['scores']}"


def assert_gepa_stopped(record: dict) -> None:
    """optimise.run returned 1, named the judge and the stop, and saved nothing with a false zero."""
    assert record["seconds"] < TIMEOUT, f"the run took {record['seconds']} s"
    assert record["raised"] is None, f"optimise.run let {record['raised']!r} escape instead of returning 1"
    assert record["code"] == 1, \
        f"GEPA compiled on a failed judge: code {record['code']!r}, tail {record['printed_tail'][-300:]!r}"
    failed = " ".join(record["failed_lines"])
    assert failed, f"no `optimise failed:` line: {record['printed_tail'][-400:]!r}"
    assert "judge" in failed.lower(), f"the line does not name the judge: {failed!r}"
    assert STOP_WORDS.search(failed), f"the line does not say that the run stopped: {failed!r}"
    assert record["saved"] == [], f"a stopped run saved files: {record['saved']}"
    assert not record["has_train_overall"], "the run printed a train mean over false zeros"


def test_evaluate_four_threads_with_an_always_failing_judge_ends_with_judge_failure(tmp_path):
    record = run_offline(tmp_path, "evaluate-always")
    assert_judge_failure_raised(record)


def test_evaluate_four_threads_with_one_failing_example_and_slow_ones_ends_with_judge_failure(tmp_path):
    record = run_offline(tmp_path, "evaluate-one")
    assert record["judge_good"] > 0, "no slow successful judge call happened, so the test covers failures only"
    assert record["judge_failures"] >= 3, f"the failed stop got {record['judge_failures']} tries, not a bounded retry"
    assert_judge_failure_raised(record)


def test_gepa_four_threads_with_an_always_failing_judge_exits_1_and_saves_nothing(tmp_path):
    record = run_offline(tmp_path, "gepa-always")
    assert_gepa_stopped(record)


def test_gepa_four_threads_with_one_failing_example_and_slow_ones_exits_1_and_saves_nothing(tmp_path):
    record = run_offline(tmp_path, "gepa-one")
    assert record["judge_good"] > 0, "no slow successful judge call happened, so the test covers failures only"
    assert_gepa_stopped(record)
