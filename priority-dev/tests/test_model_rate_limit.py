"""RED: a rate-limited model call is retried, and a model error is never a score of 0.

The bug. A live eval on Inception (Mercury 3 is the task model and the judge) hit 429 limits. 15 of the
first 40 task calls raised `LMRateLimitError: Rate limit reached: ...`. `Interpreter.forward` turned each one
into a `model_error` abstain, and an abstain scores 0. The arm mean held false zeros, and GEPA would train on
them.

The contract these tests set.

1. `Interpreter.forward` retries a rate-limit error with exponential backoff: 4 tries in all, with waits of
   5, 15, and 45 seconds between them. A rate-limit error is an exception whose class name holds `RateLimit`,
   or whose text holds `Rate limit reached`, or whose `status_code` is 429. The wait goes through the module
   attribute `priority.interpreter.module.sleep`, which forward reads at call time, so no test sleeps. A call
   that works on a later try returns its normal Prediction. The call store holds each try as a row: the failed
   tries with an `error` and valid False, the working try valid. After the last try the result is the
   `model_error` abstain. A timeout, an auth error, or a parse fault is NOT retried.
2. The rows of `runner._score_stop` gain `model_error` (bool): True for a `model_error` abstain. `print_report`
   prints `model errors: N` right after `judge errors: N`, and it leaves those rows out of every mean and
   count, as it does for a judge error. The per-stop line is marked `model_error`. When every row is a model
   error, the overall lines print `n/a (0 stops)`. The exit code stays 0.
3. In the optimise path, `metric.score` raises `ModelFailure(BaseException)` for a `model_error` abstain. The
   message names the session, the stop, and the error text. `optimise.run` catches it, prints
   `optimise failed: ... The run stopped and saved nothing.` with the word model, returns 1, and writes no
   program, report, or rows file. `score_checked` keeps scoring an abstain 0 on the eval path, and it still
   returns a 3-tuple, because the judge-error tests unpack three values.
4. An `invalid_output` abstain is a real model failure. It scores 0 in every path.

Every model, judge, and program here is a stub. No test makes a live model call.
"""
from __future__ import annotations

import contextlib
import io
import itertools
import re
import time

import pytest

from eval_support import StubInterpreter, make_prediction, write_eval_world
from fixtures_support import make_label, require
from interpret_support import DummyLM, dspy, interpret, make_brief, propose, read_calls, step
from judge_ref_support import install_judge, reply_step

WAITS = [5, 15, 45]
GOOD_SCORE = 0.8
RATE_TEXT = "Rate limit reached: output token limit exceeded"
CODE = {"session_id": "made-up-session", "author": "interpreter"}
ERRORS_LINE = re.compile(r"^judge errors: (\d+)\s*$", re.M)
MODEL_LINE = re.compile(r"^model errors: (\d+)\s*$", re.M)
SESSION_LINE = re.compile(r"^session (\S+) overall (\S+) \((\d+) stops\) facts (\S+) steps (\S+)\s*$", re.M)


# ---- own support: the stub model and its errors --------------------------------


class LMRateLimitError(Exception):
    """The class name that the live run showed."""


class RateLimitError(Exception):
    """A rate-limit class with a text that says nothing about limits."""


class StatusError(Exception):
    """An error that carries only an HTTP status code."""

    def __init__(self, message: str, status_code: int):
        super().__init__(message)
        self.status_code = status_code


class AuthenticationError(StatusError):
    def __init__(self):
        super().__init__("Incorrect API key provided", 401)


def rate_limit() -> Exception:
    return LMRateLimitError(RATE_TEXT)


class ScriptedLM(DummyLM):
    """A stub model. `plan(n)` gives the error to raise on the nth call (0-based), or None for a good reply."""

    def __init__(self, plan, reply=None):
        super().__init__(itertools.cycle([propose([step("reply")]) if reply is None else reply]))
        self.plan, self.count = plan, 0

    def forward(self, prompt=None, messages=None, **kwargs):
        n, self.count = self.count, self.count + 1
        error = self.plan(n)
        if error is not None:
            raise error
        return super().forward(prompt=prompt, messages=messages, **kwargs)


def fail_first(errors: list):
    """A plan that raises each error in turn, then answers."""
    return lambda n: errors[n] if n < len(errors) else None


def always(error_factory):
    return lambda n: error_factory()


@pytest.fixture(autouse=True)
def waits(monkeypatch):
    """Record the waits of the interpreter. `time.sleep` and `metric.sleep` are backstops: no test sleeps."""
    seen: list = []
    stray: list = []
    monkeypatch.setattr(require("priority.interpreter.module"), "sleep", seen.append, raising=False)
    monkeypatch.setattr(require("priority.evaluation.metric"), "sleep", stray.append, raising=False)
    monkeypatch.setattr(time, "sleep", stray.append)
    return seen


def model_error_abstain(detail: str = f"LMRateLimitError: {RATE_TEXT}") -> dict:
    return {"reason": "model_error", "detail": detail, "raw": ""}


def invalid_abstain() -> dict:
    return {"reason": "invalid_output", "detail": "made-up detail", "raw": "made-up raw"}


def example():
    """One labelled stop whose reference holds one reply step, so no code rule pins the score."""
    return dspy.Example(session_id="made-up-session", stop="001", brief_text="The made-up brief.",
                        status="waiting_answer", needs_human=True, priority="P3", ambiguous=False,
                        expected_payloads=[reply_step()]).with_inputs("brief_text")


def prediction(abstain=None):
    if abstain is not None:
        return dspy.Prediction(status=None, needs_human=None, priority=None, steps=[], abstain=abstain)
    return dspy.Prediction(status="waiting_answer", needs_human=True, priority="P3",
                           steps=[reply_step() | CODE], abstain=None)


def outcome(call):
    """Run `call`. Return `(value, raised)`, where `raised` holds any BaseException."""
    try:
        return call(), None
    except (KeyboardInterrupt, SystemExit):
        raise
    except BaseException as error:  # noqa: BLE001 (the tests ask which kind of exception left the call)
        return None, error


# ---- Item 1: the retry in Interpreter.forward -----------------------------------


def test_a_rate_limit_that_clears_returns_the_normal_prediction(waits):
    lm = ScriptedLM(fail_first([rate_limit(), rate_limit()]))
    out = interpret(lm)
    assert out.abstain is None, f"two failed tries then a good reply still abstained: {out.abstain}"
    assert [item["kind"] for item in out.steps] == ["reply"]
    assert lm.count == 3, f"the model got {lm.count} calls, not 3"
    assert waits == [5, 15], f"the waits were {waits}, not [5, 15]"


def test_the_first_wait_is_five_seconds(waits):
    out = interpret(ScriptedLM(fail_first([rate_limit()])))
    assert out.abstain is None and waits == [5], f"one failed try gave waits {waits}, abstain {out.abstain}"


def test_a_rate_limit_that_never_clears_makes_four_tries_with_the_three_waits(waits):
    lm = ScriptedLM(always(rate_limit))
    out = interpret(lm)
    assert lm.count == 4, f"the model got {lm.count} calls, not 4 in all"
    assert waits == WAITS, f"the waits were {waits}, not {WAITS}"
    assert out.abstain is not None and out.abstain["reason"] == "model_error"
    assert out.abstain["detail"] == f"LMRateLimitError: {RATE_TEXT}"
    assert out.steps == []


def test_no_wait_follows_the_last_try(waits):
    interpret(ScriptedLM(always(rate_limit)))
    assert len(waits) == 3, f"{len(waits)} waits for 4 tries: the last try needs none"


RATE_LIMIT_SHAPES = {
    "class name LMRateLimitError": lambda: LMRateLimitError("made-up upstream trouble"),
    "class name RateLimitError": lambda: RateLimitError("slow down"),
    "text Rate limit reached in a plain Exception": lambda: Exception(
        "Rate limit reached: too many requests per minute"),
    "status code 429": lambda: StatusError("upstream refused the call", 429),
}


@pytest.mark.parametrize("make_error", RATE_LIMIT_SHAPES.values(), ids=RATE_LIMIT_SHAPES.keys())
def test_each_rate_limit_shape_is_retried(make_error, waits):
    lm = ScriptedLM(fail_first([make_error()]))
    out = interpret(lm)
    assert lm.count == 2, f"the model got {lm.count} calls: a rate-limit error got no retry"
    assert waits == [5]
    assert out.abstain is None, f"the retry did not return the good reply: {out.abstain}"


NOT_RATE_LIMIT = {
    "timeout": TimeoutError("the model timed out"),
    "auth error": AuthenticationError(),
    "status 500": StatusError("the server broke", 500),
    "plain runtime error": RuntimeError("made-up fault"),
}


@pytest.mark.parametrize("error", NOT_RATE_LIMIT.values(), ids=NOT_RATE_LIMIT.keys())
def test_another_error_is_not_retried_here(error, waits):
    lm = ScriptedLM(always(lambda: error))
    out = interpret(lm)
    assert lm.count == 1, f"the model got {lm.count} calls: this error must not be retried here"
    assert waits == [], f"a wait happened for an error that is no rate limit: {waits}"
    assert out.abstain["reason"] == "model_error" and str(error) in out.abstain["detail"]


def test_a_parse_fault_is_not_retried(waits):
    lm = ScriptedLM(lambda n: None, reply=propose(steps="this is not JSON"))
    out = interpret(lm)
    assert out.abstain is not None and out.abstain["reason"] == "invalid_output"
    assert len(lm.history) == 1 and waits == [], f"{len(lm.history)} calls and waits {waits} for a parse fault"


def test_a_rate_limit_then_a_parse_fault_gives_invalid_output(waits):
    lm = ScriptedLM(fail_first([rate_limit()]), reply=propose(steps="this is not JSON"))
    out = interpret(lm)
    assert waits == [5], "the rate-limit error got no retry"
    assert out.abstain is not None and out.abstain["reason"] == "invalid_output"


def test_a_rate_limit_then_a_timeout_stops_the_retries_at_the_timeout(waits):
    lm = ScriptedLM(fail_first([rate_limit(), TimeoutError("the model timed out")]))
    out = interpret(lm)
    assert lm.count == 2, f"the model got {lm.count} calls: the timeout must end the tries"
    assert waits == [5]
    assert out.abstain["reason"] == "model_error" and "TimeoutError" in out.abstain["detail"]


def test_a_retried_call_logs_each_try_and_only_the_good_one_valid(tmp_path):
    lm = ScriptedLM(fail_first([rate_limit(), rate_limit()]))
    out = interpret(lm, log_dir=tmp_path, session_id="made-up-session", stop="001")
    assert out.abstain is None
    rows = read_calls(tmp_path)
    assert len(rows) == 3, f"the call store holds {len(rows)} rows, not 3 (two failed tries and one good)"
    failed, good = rows[:2], rows[2]
    for row in failed:
        assert RATE_TEXT in row["error"], f"a failed try holds no error text: {row}"
        assert row["valid"] is False
    assert "error" not in good and good["valid"] is True, f"the good try is not logged valid: {good}"
    assert {row["session_id"] for row in rows} == {"made-up-session"}


def test_four_failed_tries_log_four_rows_with_an_error_and_none_valid(tmp_path):
    interpret(ScriptedLM(always(rate_limit)), log_dir=tmp_path)
    rows = read_calls(tmp_path)
    assert len(rows) == 4, f"the call store holds {len(rows)} rows, not 4"
    assert all(RATE_TEXT in row["error"] and row["valid"] is False for row in rows), rows


def test_a_good_first_call_makes_one_call_and_no_wait(waits):
    lm = ScriptedLM(lambda n: None)
    out = interpret(lm)
    assert out.abstain is None and lm.count == 1 and waits == []


def test_the_waits_go_through_the_module_attribute_and_not_the_time_module(monkeypatch):
    module = require("priority.interpreter.module")
    mine: list = []
    stray: list = []
    monkeypatch.setattr(module, "sleep", mine.append, raising=False)
    monkeypatch.setattr(time, "sleep", stray.append)
    interpret(ScriptedLM(fail_first([rate_limit(), rate_limit(), rate_limit()])))
    assert mine == WAITS, f"the module attribute `sleep` saw {mine}, not {WAITS}"
    assert stray == [], f"forward waited through the time module: {stray}"


# ---- Item 2: the eval rows and the report ----------------------------------------


def stop_brief(tmp_path):
    from brief_support import Transcript, build

    t = Transcript()
    t.human("Made-up question?")
    t.reply("Made-up answer.")
    path = tmp_path / "made-up-session.jsonl"
    t.write(path)
    brief = build(path, stop=1)
    assert type(brief).__name__ == "StopBrief", "the made-up transcript built no brief"
    return brief


def row_of(tmp_path, prediction_, brief=None) -> dict:
    runner = require("priority.evaluation.runner")
    label = make_label(1) | {"payloads": [reply_step()]}
    brief = stop_brief(tmp_path) if brief is None else brief
    return runner._score_stop(StubInterpreter([prediction_]), brief, label, "made-up-session", "001")


def abstained_prediction(abstain: dict):
    return make_prediction(make_label(1), status=None, needs_human=None, priority=None, abstain=abstain)


def test_a_model_error_abstain_marks_the_row(monkeypatch, tmp_path):
    install_judge(monkeypatch, lambda *a: (GOOD_SCORE, ["payload: the made-up parts match."]))
    row = row_of(tmp_path, abstained_prediction(model_error_abstain()))
    assert row.get("model_error") is True, f"the row holds model_error={row.get('model_error')!r}, not True"
    assert row["gate"] == "model_error" and row["overall"] == 0.0 and row["judge_error"] is False


def test_the_model_error_flag_is_a_real_bool_on_every_row(monkeypatch, tmp_path):
    install_judge(monkeypatch, lambda *a: (GOOD_SCORE, ["payload: the made-up parts match."]))
    row = row_of(tmp_path, make_prediction(make_label(1), steps=[reply_step()]))
    assert "model_error" in row, f"the row holds no model_error key: {sorted(row)}"
    assert row["model_error"] is False, f"a good stop is marked model_error={row['model_error']!r}"


def test_an_invalid_output_abstain_is_no_model_error_and_scores_zero(monkeypatch, tmp_path):
    install_judge(monkeypatch, lambda *a: (GOOD_SCORE, ["payload: the made-up parts match."]))
    row = row_of(tmp_path, abstained_prediction(invalid_abstain()))
    assert row.get("model_error") is False, f"an invalid_output abstain is marked model_error={row.get('model_error')!r}"
    assert row["gate"] == "invalid_output" and row["overall"] == 0.0 and row["payload"] == 0.0


def test_a_brief_abstain_is_no_model_error(monkeypatch, tmp_path):
    install_judge(monkeypatch, lambda *a: (GOOD_SCORE, ["payload: the made-up parts match."]))
    brief = require("priority.brief").Abstain(reason="no_stop", detail="made-up detail")
    row = row_of(tmp_path, make_prediction(make_label(1)), brief=brief)
    assert row["gate"] == "no_stop"
    assert row.get("model_error") is False, f"a brief abstain is marked model_error={row.get('model_error')!r}"


def test_a_brief_abstain_that_holds_a_model_error_marks_the_row(monkeypatch, tmp_path):
    install_judge(monkeypatch, lambda *a: (GOOD_SCORE, ["payload: the made-up parts match."]))
    brief = require("priority.brief").Abstain(reason="model_error", detail="made-up shrink fault")
    row = row_of(tmp_path, make_prediction(make_label(1)), brief=brief)
    assert row["gate"] == "model_error"
    assert row.get("model_error") is True, f"the prediction is a model_error abstain, the row holds {row.get('model_error')!r}"


def make_row(session: str, stop: str, overall: float, *, model_error: bool = False, judge_error: bool = False,
             ambiguous: bool = False, status_ok: bool = True, facts: float = 1.0, steps: float = 1.0,
             gate: str | None = None) -> dict:
    """One scored row in the shape `_score_stop` returns, plus the session and the stop."""
    return {"session": session, "stop": stop, "overall": overall, "payload": overall,
            "gate": gate or ("model_error" if model_error else "pass"), "ambiguous": ambiguous, "feedback": "ok",
            "fact_ok": {"status": status_ok, "needs_human": True}, "facts": facts, "steps": steps,
            "judge_error": judge_error, "model_error": model_error}


def report_of(rows: list) -> str:
    api = require("priority.evaluation.eval_report")
    out = io.StringIO()
    with contextlib.redirect_stdout(out):
        api.print_report("train", {row["session"] for row in rows}, rows)
    return out.getvalue()


def lines_of(printed: str, prefix: str) -> list[str]:
    return [line for line in printed.splitlines() if line.startswith(prefix)]


def test_the_report_prints_the_model_error_count():
    printed = report_of([make_row("s1", "001", 1.0), make_row("s1", "002", 0.0, model_error=True),
                         make_row("s1", "003", 0.0, model_error=True)])
    match = MODEL_LINE.search(printed)
    assert match, f"the report prints no `model errors: N` line: {printed}"
    assert match.group(1) == "2"


def test_the_report_prints_model_errors_zero_when_none_failed():
    printed = report_of([make_row("s1", "001", 1.0), make_row("s1", "002", 0.5)])
    match = MODEL_LINE.search(printed)
    assert match and match.group(1) == "0", f"the report prints no `model errors: 0` line: {printed}"


def test_the_model_errors_line_follows_the_judge_errors_line():
    printed = report_of([make_row("s1", "001", 1.0), make_row("s1", "002", 0.0, model_error=True)])
    lines = printed.splitlines()
    judge = [i for i, line in enumerate(lines) if ERRORS_LINE.match(line)]
    assert judge, f"the report prints no `judge errors: N` line: {printed}"
    assert MODEL_LINE.match(lines[judge[0] + 1]), f"the line after `judge errors:` is {lines[judge[0] + 1]!r}"


def test_the_two_error_counts_do_not_overlap():
    printed = report_of([make_row("s1", "001", 1.0), make_row("s1", "002", 0.0, judge_error=True),
                         make_row("s1", "003", 0.0, model_error=True), make_row("s1", "004", 0.0, model_error=True)])
    assert ERRORS_LINE.search(printed).group(1) == "1", f"judge errors count the model errors: {printed}"
    assert MODEL_LINE.search(printed).group(1) == "2", f"model errors count the judge error: {printed}"
    assert "overall including ambiguous: 1.000 (1 stops)" in printed


def test_a_model_error_row_stays_out_of_the_session_mean_and_stop_count():
    printed = report_of([make_row("s1", "001", 1.0), make_row("s1", "002", 0.0, model_error=True),
                         make_row("s2", "001", 0.5)])
    sessions = {m.group(1): m for m in SESSION_LINE.finditer(printed)}
    assert sessions["s1"].group(2) == "1.000", f"the s1 mean is {sessions['s1'].group(2)}, not 1.000"
    assert sessions["s1"].group(3) == "1", f"the s1 stop count is {sessions['s1'].group(3)}, not 1"
    assert sessions["s2"].group(2) == "0.500" and sessions["s2"].group(3) == "1"


def test_a_session_with_only_model_errors_has_no_session_line():
    printed = report_of([make_row("s1", "001", 0.0, model_error=True), make_row("s2", "001", 0.5)])
    assert not lines_of(printed, "session s1 overall"), f"a session of model errors has a mean line: {printed}"
    assert lines_of(printed, "session s2 overall")


def test_a_model_error_row_stays_out_of_the_fact_and_steps_lines():
    printed = report_of([make_row("s1", "001", 1.0),
                         make_row("s1", "002", 0.0, model_error=True, status_ok=False, steps=0.0)])
    assert "fact status: 1.000 (1/1)" in printed, f"the fact line counts the model error row: {printed}"
    assert "fact needs_human: 1.000 (1/1)" in printed
    assert "steps: 1.000" in lines_of(printed, "steps:"), f"the steps line counts the model error row: {printed}"


def test_a_model_error_row_stays_out_of_the_overall_lines():
    printed = report_of([make_row("s1", "001", 1.0), make_row("s1", "002", 0.0, model_error=True),
                         make_row("s1", "003", 0.5, ambiguous=True)])
    assert "overall including ambiguous: 0.750 (2 stops)" in printed, f"wrong overall line: {printed}"
    assert "overall excluding ambiguous: 1.000 (1 stops)" in printed, f"wrong overall line: {printed}"


def test_the_per_stop_lines_show_a_model_error_row_marked():
    printed = report_of([make_row("s1", "001", 1.0), make_row("s1", "002", 0.0, model_error=True)])
    marked = lines_of(printed, "score stop session=s1 stop=002 ")
    plain = lines_of(printed, "score stop session=s1 stop=001 ")
    assert len(marked) == 1 and len(plain) == 1, f"a per-stop line is missing: {printed}"
    assert marked[0].rstrip().endswith("model_error"), f"the row is not marked at the end: {marked[0]}"
    assert not plain[0].rstrip().endswith("model_error"), f"a good row is marked: {plain[0]}"
    assert "judge_error" not in marked[0], "a model error row is marked as a judge error"


def test_all_rows_model_errors_print_n_a_overall_lines():
    printed = report_of([make_row("s1", "001", 0.0, model_error=True), make_row("s1", "002", 0.0, model_error=True)])
    assert "overall including ambiguous: n/a (0 stops)" in printed, f"wrong overall line: {printed}"
    assert "overall excluding ambiguous: n/a (0 stops)" in printed, f"wrong overall line: {printed}"
    assert MODEL_LINE.search(printed).group(1) == "2"
    assert len(lines_of(printed, "score stop ")) == 2


def test_rows_of_both_error_kinds_leave_n_a_overall_lines():
    printed = report_of([make_row("s1", "001", 0.0, model_error=True), make_row("s1", "002", 0.0, judge_error=True)])
    assert "overall including ambiguous: n/a (0 stops)" in printed, f"wrong overall line: {printed}"


def test_an_invalid_output_row_counts_in_every_mean_as_a_zero():
    printed = report_of([make_row("s1", "001", 1.0), make_row("s1", "002", 0.0, gate="invalid_output")])
    assert MODEL_LINE.search(printed).group(1) == "0", f"an invalid_output row counts as a model error: {printed}"
    assert "overall including ambiguous: 0.500 (2 stops)" in printed, f"wrong overall line: {printed}"


def test_a_row_with_no_model_error_key_counts_as_a_good_row():
    row = make_row("s1", "002", 0.5)
    del row["model_error"]
    printed = report_of([make_row("s1", "001", 1.0), row])
    assert MODEL_LINE.search(printed).group(1) == "0"
    assert "overall including ambiguous: 0.750 (2 stops)" in printed, f"wrong overall line: {printed}"


class AlternatingModelErrors(StubInterpreter):
    """A stub program whose odd calls give a model_error abstain and whose even calls give one reply step.
    Use it with one thread."""

    def __init__(self, abstain: dict):
        super().__init__([])
        self.abstain, self.calls = abstain, 0

    def __call__(self, *args, **kwargs):
        self.calls += 1
        label = make_label(1)
        if self.calls % 2 == 1:
            return abstained_prediction(self.abstain)
        return make_prediction(label, steps=[reply_step()])


def run_cli(monkeypatch, tmp_path, program):
    install_judge(monkeypatch, lambda *a: (GOOD_SCORE, ["payload: the made-up parts match."]))
    manifest, labels, real_dir, _ = write_eval_world(tmp_path, payloads=[reply_step()])
    monkeypatch.setattr(require("priority.interpreter"), "Interpreter", lambda *a, **k: program)
    from priority.cli import main

    code, out = None, io.StringIO()
    with contextlib.suppress(SystemExit), contextlib.redirect_stdout(out):
        code = main(["eval", "--split", "train", "--manifest", str(manifest), "--labels", str(labels),
                     "--real-dir", str(real_dir), "--log-dir", str(tmp_path / "logs")])
    return code, out.getvalue()


def test_eval_with_some_model_errors_exits_zero_and_means_only_the_good_rows(monkeypatch, tmp_path):
    program = AlternatingModelErrors(model_error_abstain())
    code, printed = run_cli(monkeypatch, tmp_path, program)
    assert code == 0, printed[-600:]
    failed = (program.calls + 1) // 2
    good = program.calls - failed
    assert failed >= 1 and good >= 1, f"the stub program ran {program.calls} times"
    match = MODEL_LINE.search(printed)
    assert match, f"the eval printed no `model errors: N` line: {printed[-600:]}"
    assert int(match.group(1)) == failed, f"`model errors: {match.group(1)}`, not {failed}"
    assert f"overall including ambiguous: 0.800 ({good} stops)" in printed, \
        f"the mean holds more than the {good} good rows: {printed[-600:]}"
    marked = [line for line in lines_of(printed, "score stop ") if line.rstrip().endswith("model_error")]
    assert len(marked) == failed, f"{len(marked)} per-stop lines are marked model_error, not {failed}"


def test_eval_with_every_call_a_model_error_exits_zero_and_reports_n_a(monkeypatch, tmp_path):
    program = StubInterpreter([abstained_prediction(model_error_abstain())])
    code, printed = run_cli(monkeypatch, tmp_path, program)
    assert code == 0, printed[-600:]
    assert MODEL_LINE.search(printed), f"the eval printed no `model errors: N` line: {printed[-600:]}"
    assert "overall including ambiguous: n/a (0 stops)" in printed, printed[-600:]
    assert "overall excluding ambiguous: n/a (0 stops)" in printed, printed[-600:]


def test_eval_with_invalid_output_abstains_keeps_them_in_the_mean_as_zeros(monkeypatch, tmp_path):
    program = AlternatingModelErrors(invalid_abstain())
    code, printed = run_cli(monkeypatch, tmp_path, program)
    assert code == 0, printed[-600:]
    assert MODEL_LINE.search(printed) and MODEL_LINE.search(printed).group(1) == "0", printed[-600:]
    stops = program.calls
    assert f"overall including ambiguous: {GOOD_SCORE * (program.calls // 2) / stops:.3f} ({stops} stops)" in printed, \
        f"the invalid_output zeros are not in the mean: {printed[-600:]}"


# ---- Item 3: the metric and the optimise run --------------------------------------


def optimise_metrics():
    optimise = require("priority.optimise")
    return {"gepa_feedback": optimise.gepa_feedback, "plain_score": optimise.plain_score}


def score_of(value) -> float:
    return float(value["score"] if hasattr(value, "feedback") else value)


def test_model_failure_is_a_base_exception_beside_judge_failure():
    metric = require("priority.evaluation.metric")
    failure = getattr(metric, "ModelFailure", None)
    assert failure is not None, "metric holds no ModelFailure"
    assert issubclass(failure, BaseException) and not issubclass(failure, Exception), \
        "ModelFailure must not be an Exception, because dspy turns an Exception from a metric into a 0"
    assert not issubclass(failure, metric.JudgeFailure) and not issubclass(metric.JudgeFailure, failure)


def test_score_raises_model_failure_for_a_model_error_abstain(monkeypatch):
    install_judge(monkeypatch, lambda *a: (GOOD_SCORE, ["payload: the made-up parts match."]))
    metric = require("priority.evaluation.metric")
    value, raised = outcome(lambda: metric.score(example(), prediction(model_error_abstain())))
    assert raised is not None, f"score returned {value!r} for a model_error abstain, a false 0"
    assert type(raised).__name__ == "ModelFailure", f"score raised {type(raised).__name__}: {raised!r}"


def test_the_message_names_the_session_the_stop_and_the_error_text(monkeypatch):
    install_judge(monkeypatch, lambda *a: (GOOD_SCORE, ["payload: the made-up parts match."]))
    metric = require("priority.evaluation.metric")
    _, raised = outcome(lambda: metric.score(example(), prediction(model_error_abstain())))
    assert raised is not None, "score raised nothing for a model_error abstain"
    text = str(raised)
    assert "made-up-session" in text and "001" in text, f"the message does not name the stop: {text!r}"
    assert RATE_TEXT in text, f"the message does not hold the error text: {text!r}"
    assert "model" in text.lower(), f"the message does not say model: {text!r}"


@pytest.mark.parametrize("name", ("gepa_feedback", "plain_score"))
def test_both_optimise_metrics_raise_for_a_model_error_abstain(monkeypatch, name):
    install_judge(monkeypatch, lambda *a: (GOOD_SCORE, ["payload: the made-up parts match."]))
    value, raised = outcome(lambda: optimise_metrics()[name](example(), prediction(model_error_abstain())))
    assert raised is not None and not isinstance(raised, Exception), \
        f"{name} gave {value!r} / {raised!r}, not a BaseException that dspy lets through"


def test_a_model_error_is_not_retried_by_the_metric(monkeypatch):
    calls: list = []
    install_judge(monkeypatch, lambda *a: calls.append(a) or (GOOD_SCORE, ["payload: the made-up parts match."]))
    metric = require("priority.evaluation.metric")
    outcome(lambda: metric.score(example(), prediction(model_error_abstain())))
    assert len(calls) <= 1, f"the metric made {len(calls)} judge calls for a model error"


def test_a_failed_judge_does_not_hide_the_model_failure(monkeypatch):
    install_judge(monkeypatch, lambda *a: (0.0, ["judge error: the judge call failed (TimeoutError), scored 0"]))
    metric = require("priority.evaluation.metric")
    _, raised = outcome(lambda: metric.score(example(), prediction(model_error_abstain())))
    assert type(raised).__name__ == "ModelFailure", f"score raised {raised!r} when the judge also failed"


@pytest.mark.parametrize("name", ("gepa_feedback", "plain_score"))
@pytest.mark.parametrize("threads", (1, 3))
def test_dspy_evaluate_does_not_turn_a_model_error_into_a_failure_score(monkeypatch, name, threads):
    install_judge(monkeypatch, lambda *a: (GOOD_SCORE, ["payload: the made-up parts match."]))
    metric_fn = optimise_metrics()[name]

    def scored():
        evaluator = dspy.Evaluate(devset=[example()], metric=metric_fn, num_threads=threads, failure_score=0.0,
                                  provide_traceback=True, max_errors=100, display_progress=False)
        return evaluator(lambda brief_text: prediction(model_error_abstain()))

    result, raised = outcome(scored)
    assert raised is not None, f"dspy.Evaluate scored a model error with {name}: {result.results!r}"
    assert not isinstance(raised, Exception)


def test_score_checked_still_scores_a_model_error_abstain_zero_without_raising(monkeypatch):
    install_judge(monkeypatch, lambda *a: (GOOD_SCORE, ["payload: the made-up parts match."]))
    metric = require("priority.evaluation.metric")
    result, raised = outcome(lambda: metric.score_checked(example(), prediction(model_error_abstain())))
    assert raised is None, f"the eval path raised {raised!r}: it must return the row data"
    assert result[0] == 0.0, f"score_checked returned {result!r}"
    assert len(result) == 3, "score_checked must keep its 3-tuple, because other tests unpack three values"
    assert result[2] is False, "a model error is not a judge error"


@pytest.mark.parametrize("name", ("gepa_feedback", "plain_score"))
def test_an_invalid_output_abstain_still_scores_zero_in_the_optimise_metrics(monkeypatch, name):
    install_judge(monkeypatch, lambda *a: (GOOD_SCORE, ["payload: the made-up parts match."]))
    value, raised = outcome(lambda: optimise_metrics()[name](example(), prediction(invalid_abstain())))
    assert raised is None, f"{name} raised {raised!r} for an invalid_output abstain, a real model failure"
    assert score_of(value) == 0.0


def test_score_checked_scores_an_invalid_output_abstain_zero(monkeypatch):
    install_judge(monkeypatch, lambda *a: (GOOD_SCORE, ["payload: the made-up parts match."]))
    metric = require("priority.evaluation.metric")
    value, _, judge_error = metric.score_checked(example(), prediction(invalid_abstain()))
    assert (value, judge_error) == (0.0, False)


# ---- the run ------------------------------------------------------------------------


class CannedProgram:
    """A stub compiled program. It always returns the same Prediction."""

    def __init__(self, abstain=None):
        self.abstain = abstain

    def __call__(self, *args, **kwargs):
        return prediction(self.abstain)

    def named_predictors(self):
        return []


def run_rescore(monkeypatch, tmp_path, program):
    """Run `optimise.run` with a stub BootstrapFewShot, so only the rescore of the train stops scores a stop."""
    import dspy.teleprompt as teleprompt

    optimise = require("priority.optimise")
    interpreter_mod = require("priority.interpreter")
    manifest, labels, real_dir, _ = write_eval_world(tmp_path, payloads=[reply_step()])

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


def written(tmp_path) -> list:
    root = tmp_path / "probes"
    return sorted(str(path.relative_to(tmp_path)) for path in root.rglob("*") if path.is_file()) if root.exists() else []


def test_the_rescore_stops_the_run_for_a_model_error(monkeypatch, tmp_path):
    install_judge(monkeypatch, lambda *a: (GOOD_SCORE, ["payload: the made-up parts match."]))
    code, printed, raised = run_rescore(monkeypatch, tmp_path, CannedProgram(model_error_abstain()))
    assert raised is None, f"the run let {type(raised).__name__} escape instead of returning 1: {raised!r}"
    assert code == 1, f"the rescore scored a model error as 0 and the run went on: code {code!r}, {printed[-300:]!r}"
    lines = [line for line in printed.splitlines() if line.startswith("optimise failed:")]
    assert lines, f"no `optimise failed:` line: {printed[-400:]!r}"
    assert "model" in lines[-1].lower(), f"the line does not name the model: {lines[-1]!r}"
    assert lines[-1].endswith("The run stopped and saved nothing."), f"wrong ending: {lines[-1]!r}"
    assert re.search(r"session \S+ stop \S+", lines[-1]), f"the line does not name the stop: {lines[-1]!r}"
    assert RATE_TEXT in lines[-1], f"the line does not hold the error text: {lines[-1]!r}"
    assert "Traceback" not in printed and "train overall" not in printed


def test_the_stopped_rescore_writes_no_program_report_or_rows(monkeypatch, tmp_path):
    install_judge(monkeypatch, lambda *a: (GOOD_SCORE, ["payload: the made-up parts match."]))
    code, _, raised = run_rescore(monkeypatch, tmp_path, CannedProgram(model_error_abstain()))
    assert raised is None and code == 1, f"the run did not return 1: code {code!r}, raised {raised!r}"
    assert written(tmp_path) == [], f"a stopped run wrote files: {written(tmp_path)}"


def test_the_rescore_keeps_an_invalid_output_abstain_as_a_real_zero(monkeypatch, tmp_path):
    install_judge(monkeypatch, lambda *a: (GOOD_SCORE, ["payload: the made-up parts match."]))
    code, printed, raised = run_rescore(monkeypatch, tmp_path, CannedProgram(invalid_abstain()))
    assert raised is None and code == 0, f"an invalid_output abstain stopped the run: {code!r}, {printed[-300:]!r}"
    match = re.search(r"train overall (\d+\.\d+)", printed)
    assert match and float(match.group(1)) == 0.0, f"the train mean is not 0: {printed[-300:]!r}"


def test_the_rescore_recovers_a_stop_that_hit_a_rate_limit_and_scores_it_for_real(monkeypatch, tmp_path, waits):
    """The real Interpreter, with a model that fails two calls in three, so each stop needs two retries."""
    install_judge(monkeypatch, lambda *a: (GOOD_SCORE, ["payload: the made-up parts match."]))
    lm = ScriptedLM(lambda n: rate_limit() if n % 3 != 2 else None)
    program = require("priority.interpreter").Interpreter(lm=lm)
    code, printed, raised = run_rescore(monkeypatch, tmp_path, program)
    assert raised is None and code == 0, f"the run stopped: code {code!r}, raised {raised!r}, {printed[-300:]!r}"
    assert lm.count >= 3 and set(waits) == {5, 15}, f"the model got {lm.count} calls, waits {waits}"
    match = re.search(r"train overall (\d+\.\d+)", printed)
    assert match and float(match.group(1)) == pytest.approx(GOOD_SCORE), f"false zeros in the mean: {printed[-300:]!r}"


def gepa_world(monkeypatch, tmp_path, lm):
    optimise = require("priority.optimise")
    interpreter_mod = require("priority.interpreter")
    manifest, labels, real_dir, _ = write_eval_world(tmp_path, payloads=[step("reply")])
    monkeypatch.setattr(interpreter_mod, "interpreter_lm", lambda retries=0: lm)
    monkeypatch.setattr(optimise, "_reflection_lm", lambda: lm)
    monkeypatch.chdir(tmp_path)
    return optimise, manifest, labels, real_dir


@pytest.mark.parametrize("threads", (1, 3))
def test_gepa_stops_with_exit_1_when_the_model_never_answers(monkeypatch, tmp_path, threads):
    install_judge(monkeypatch, lambda *a: (GOOD_SCORE, ["payload: the made-up parts match."]))
    lm = ScriptedLM(always(rate_limit))
    optimise, manifest, labels, real_dir = gepa_world(monkeypatch, tmp_path, lm)
    out = io.StringIO()
    with contextlib.redirect_stdout(out):
        code, raised = outcome(lambda: optimise.run(manifest, labels, real_dir, "gepa", 1, 7, threads=threads))
    printed = out.getvalue()
    assert raised is None, f"the run let {type(raised).__name__} escape instead of returning 1: {raised!r}"
    assert code == 1, f"GEPA trained on model errors: code {code!r}, {lm.count} model calls, {printed[-300:]!r}"
    lines = [line for line in printed.splitlines() if line.startswith("optimise failed:")]
    assert lines and "model" in lines[-1].lower(), f"no failure line that names the model: {printed[-400:]!r}"
    assert lines[-1].endswith("The run stopped and saved nothing.")
    assert written(tmp_path) == [], f"a stopped run wrote files: {written(tmp_path)}"
