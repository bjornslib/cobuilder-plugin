"""Slice RED: a failed judge call is told apart from a real score of 0.

The contract. When the judge call fails, `judge.judge` returns 0 with a note that starts `judge error:`.
Today that 0 looks like a real 0, so it drags every mean down. This slice marks those rows and keeps them
out of the means.

1. `runner._score_stop` rows gain a boolean `judge_error`. It is True when the judge call failed (the
   feedback holds `judge error:`) and no pinned rule fixed the value. It is False otherwise.
2. `eval_report.print_report` prints one line `judge errors: N` before the overall lines, always, also for 0.
   Rows with `judge_error` stay out of every mean and count: session means and stop counts, the fact lines,
   the steps line, and the overall lines. The per-stop `score stop` lines still show them, marked
   `judge_error`. When every row is a judge error, the overall lines print `n/a (0 stops)`.
3. A stop pinned by a code rule (an abstain, a missing step, a spurious step, two empty lists) is not a
   judge error, even when the judge also failed on it.
4. The eval exit code stays 0 when some stops had judge errors.

Every judge, program, and world here is a stub, so no test makes a live model call.
"""
from __future__ import annotations

import contextlib
import io
import re
import threading
from pathlib import Path

from brief_support import Transcript, build
from eval_support import StubInterpreter, make_prediction
from fixtures_support import SESSION_IDS, make_label, make_labels, require
from judge_ref_support import ask_step, install_judge, reply_step

ERROR_NOTE = "judge error: the judge call failed (TimeoutError), scored 0"
ERRORS_LINE = re.compile(r"^judge errors: (\d+)\s*$", re.M)
SESSION_LINE = re.compile(r"^session (\S+) overall (\S+) \((\d+) stops\) facts (\S+) steps (\S+)\s*$", re.M)


class FailingJudge:
    """A stub judge whose every call fails the way `judge.judge` reports a failed call."""

    def __init__(self):
        self.calls = 0

    def __call__(self, brief_text, predicted, expected):
        self.calls += 1
        return (0.0, [ERROR_NOTE])


class AlternatingJudge:
    """A stub judge whose odd calls fail and whose even calls score 0.8. Use it with one thread."""

    def __init__(self):
        self.calls = 0
        self._lock = threading.Lock()

    def __call__(self, brief_text, predicted, expected):
        with self._lock:
            self.calls += 1
            n = self.calls
        if n % 2 == 1:
            return (0.0, [ERROR_NOTE])
        return (0.8, ["payload: the made-up parts match."])


# ---- Item 1: the row of `_score_stop` -----------------------------------------


def stop_brief(tmp_path: Path):
    """One real StopBrief, built from a made-up transcript."""
    t = Transcript()
    t.human("Made-up question?")
    t.reply("Made-up answer.")
    path = tmp_path / "made-up-session.jsonl"
    t.write(path)
    brief = build(path, stop=1)
    assert type(brief).__name__ == "StopBrief", "the made-up transcript built no brief"
    return brief


def label_with(payloads: list) -> dict:
    """One made-up label whose reference payload list is `payloads`."""
    return make_label(1) | {"payloads": payloads}


def row_of(tmp_path: Path, prediction, label: dict, brief=None) -> dict:
    """The row that `_score_stop` returns for one stop with a stub program."""
    runner = require("priority.evaluation.runner")
    brief = stop_brief(tmp_path) if brief is None else brief
    return runner._score_stop(StubInterpreter([prediction]), brief, label, "made-up-session", "001")


def test_a_failed_judge_call_on_an_unpinned_stop_is_a_judge_error(monkeypatch, tmp_path):
    install_judge(monkeypatch, FailingJudge())
    label = label_with([reply_step()])
    row = row_of(tmp_path, make_prediction(label, steps=[reply_step()]), label)
    assert row.get("judge_error") is True, f"the row holds judge_error={row.get('judge_error')!r}, not True"
    assert row["overall"] == 0.0 and "judge error:" in row["feedback"]


def test_a_judge_error_row_holds_a_real_bool(monkeypatch, tmp_path):
    install_judge(monkeypatch, FailingJudge())
    label = label_with([ask_step()])
    row = row_of(tmp_path, make_prediction(label, steps=[ask_step()]), label)
    assert "judge_error" in row, f"the row holds no judge_error key: {sorted(row)}"
    assert isinstance(row["judge_error"], bool), f"judge_error is {type(row['judge_error']).__name__}, not bool"


def test_a_working_judge_leaves_judge_error_false(monkeypatch, tmp_path):
    install_judge(monkeypatch, lambda brief_text, predicted, expected: (0.7, ["payload: the made-up parts match."]))
    label = label_with([reply_step()])
    row = row_of(tmp_path, make_prediction(label, steps=[reply_step()]), label)
    assert row.get("judge_error") is False, f"the row holds judge_error={row.get('judge_error')!r}, not False"
    assert row["overall"] == 0.7


def test_a_real_zero_from_a_working_judge_is_not_a_judge_error(monkeypatch, tmp_path):
    install_judge(monkeypatch, lambda brief_text, predicted, expected: (0.0, ["payload: every part differs."]))
    label = label_with([reply_step()])
    row = row_of(tmp_path, make_prediction(label, steps=[reply_step()]), label)
    assert row["overall"] == 0.0
    assert row.get("judge_error") is False, f"a real 0 was marked judge_error={row.get('judge_error')!r}"


def test_an_abstain_pinned_to_zero_is_not_a_judge_error_when_the_judge_failed(monkeypatch, tmp_path):
    install_judge(monkeypatch, FailingJudge())
    abstain_brief = require("priority.brief").Abstain(reason="no_stop", detail="made-up detail")
    label = label_with([reply_step()])
    row = row_of(tmp_path, make_prediction(label), label, brief=abstain_brief)
    assert row["overall"] == 0.0 and row["gate"] == "no_stop", f"the stop was not an abstain: {row}"
    assert "judge error:" in row["feedback"], "the stub judge error note did not reach the feedback"
    assert row.get("judge_error") is False, "an abstain pinned the 0, but the row is marked judge_error"


def test_missing_steps_pinned_to_zero_is_not_a_judge_error_when_the_judge_failed(monkeypatch, tmp_path):
    install_judge(monkeypatch, FailingJudge())
    label = label_with([reply_step()])
    row = row_of(tmp_path, make_prediction(label, steps=[]), label)
    assert row["overall"] == 0.0 and "payload: missing" in row["feedback"], f"no pinned rule fired: {row}"
    assert row.get("judge_error") is False, "the missing-steps rule pinned the 0, but the row is marked judge_error"


def test_a_spurious_step_pinned_to_zero_is_not_a_judge_error_when_the_judge_failed(monkeypatch, tmp_path):
    install_judge(monkeypatch, FailingJudge())
    label = label_with([])
    row = row_of(tmp_path, make_prediction(label, steps=[reply_step()]), label)
    assert row["overall"] == 0.0 and "none is due" in row["feedback"], f"no pinned rule fired: {row}"
    assert row.get("judge_error") is False, "the spurious-step rule pinned the 0, but the row is marked judge_error"


def test_two_empty_lists_pinned_to_one_is_not_a_judge_error_when_the_judge_failed(monkeypatch, tmp_path):
    install_judge(monkeypatch, FailingJudge())
    label = label_with([])
    row = row_of(tmp_path, make_prediction(label, steps=[]), label)
    assert row["overall"] == 1.0, f"the empty-lists rule did not pin 1: {row}"
    assert row.get("judge_error") is False, "the empty-lists rule pinned the score, but the row is marked judge_error"


# ---- Item 2: the report ---------------------------------------------------------


def make_row(session: str, stop: str, overall: float, *, judge_error: bool = False, ambiguous: bool = False,
             status_ok: bool = True, facts: float = 1.0, steps: float = 1.0) -> dict:
    """One scored row in the shape `_score_stop` returns, plus the session and the stop."""
    return {"session": session, "stop": stop, "overall": overall, "payload": overall,
            "gate": "pass", "ambiguous": ambiguous, "feedback": ERROR_NOTE if judge_error else "ok",
            "fact_ok": {"status": status_ok, "needs_human": True}, "facts": facts, "steps": steps,
            "judge_error": judge_error}


def report_of(rows: list, wanted: set | None = None) -> str:
    """The text that `print_report` prints for the rows."""
    api = require("priority.evaluation.eval_report")
    out = io.StringIO()
    with contextlib.redirect_stdout(out):
        api.print_report("train", wanted if wanted is not None else {r["session"] for r in rows}, rows)
    return out.getvalue()


def lines_of(printed: str, prefix: str) -> list[str]:
    return [line for line in printed.splitlines() if line.startswith(prefix)]


def test_the_report_prints_the_judge_error_count():
    printed = report_of([make_row("s1", "001", 1.0), make_row("s1", "002", 0.0, judge_error=True),
                         make_row("s1", "003", 0.0, judge_error=True)])
    match = ERRORS_LINE.search(printed)
    assert match, f"the report prints no `judge errors: N` line: {printed}"
    assert match.group(1) == "2"


def test_the_report_prints_judge_errors_zero_when_none_failed():
    printed = report_of([make_row("s1", "001", 1.0), make_row("s1", "002", 0.5)])
    match = ERRORS_LINE.search(printed)
    assert match, f"the report prints no `judge errors: 0` line: {printed}"
    assert match.group(1) == "0"


def test_the_judge_errors_line_comes_before_the_overall_lines():
    printed = report_of([make_row("s1", "001", 1.0), make_row("s1", "002", 0.0, judge_error=True)])
    lines = printed.splitlines()
    marks = [i for i, line in enumerate(lines) if ERRORS_LINE.match(line)]
    assert marks, f"the report prints no `judge errors: N` line: {printed}"
    overall = [i for i, line in enumerate(lines) if line.startswith("overall ")]
    assert overall, "the report prints no overall line"
    assert marks[0] < min(overall), "`judge errors:` comes after an overall line"


def test_a_judge_error_row_stays_out_of_the_session_mean_and_stop_count():
    printed = report_of([make_row("s1", "001", 1.0), make_row("s1", "002", 0.0, judge_error=True),
                         make_row("s2", "001", 0.5)])
    sessions = {m.group(1): m for m in SESSION_LINE.finditer(printed)}
    assert "s1" in sessions, f"no session line for s1: {printed}"
    assert sessions["s1"].group(2) == "1.000", f"the s1 mean is {sessions['s1'].group(2)}, not 1.000"
    assert sessions["s1"].group(3) == "1", f"the s1 stop count is {sessions['s1'].group(3)}, not 1"
    assert sessions["s2"].group(2) == "0.500" and sessions["s2"].group(3) == "1"


def test_a_judge_error_row_stays_out_of_the_fact_and_steps_lines():
    printed = report_of([make_row("s1", "001", 1.0),
                         make_row("s1", "002", 0.0, judge_error=True, status_ok=False, steps=0.0)])
    assert "fact status: 1.000 (1/1)" in printed, f"the fact line counts the judge error row: {printed}"
    assert "fact needs_human: 1.000 (1/1)" in printed
    assert "steps: 1.000" in lines_of(printed, "steps:"), f"the steps line counts the judge error row: {printed}"


def test_a_judge_error_row_stays_out_of_the_overall_lines():
    printed = report_of([make_row("s1", "001", 1.0), make_row("s1", "002", 0.0, judge_error=True),
                         make_row("s1", "003", 0.5, ambiguous=True)])
    assert "overall including ambiguous: 0.750 (2 stops)" in printed, f"wrong overall line: {printed}"
    assert "overall excluding ambiguous: 1.000 (1 stops)" in printed, f"wrong overall line: {printed}"


def test_the_overall_excluding_ambiguous_line_drops_judge_errors_before_it_drops_ambiguous():
    printed = report_of([make_row("s1", "001", 0.0, judge_error=True), make_row("s1", "002", 0.5, ambiguous=True)])
    assert "overall including ambiguous: 0.500 (1 stops)" in printed, f"wrong overall line: {printed}"
    assert "overall excluding ambiguous: n/a (0 stops)" in printed, f"wrong overall line: {printed}"


def test_the_per_stop_lines_still_show_judge_error_rows_marked():
    printed = report_of([make_row("s1", "001", 1.0), make_row("s1", "002", 0.0, judge_error=True)])
    marked = lines_of(printed, "score stop session=s1 stop=002 ")
    plain = lines_of(printed, "score stop session=s1 stop=001 ")
    assert len(marked) == 1 and len(plain) == 1, f"a per-stop line is missing: {printed}"
    assert "judge_error" in marked[0], f"the judge error row is not marked: {marked[0]}"
    assert "judge_error" not in plain[0], f"a good row is marked judge_error: {plain[0]}"
    assert "overall=0.000" in marked[0], "the per-stop line no longer shows the score"


def test_all_rows_judge_errors_print_n_a_overall_lines_with_no_division_by_zero():
    printed = report_of([make_row("s1", "001", 0.0, judge_error=True), make_row("s1", "002", 0.0, judge_error=True)])
    assert "overall including ambiguous: n/a (0 stops)" in printed, f"wrong overall line: {printed}"
    assert "overall excluding ambiguous: n/a (0 stops)" in printed, f"wrong overall line: {printed}"
    assert ERRORS_LINE.search(printed).group(1) == "2"
    assert len(lines_of(printed, "score stop ")) == 2, "the per-stop lines must still show every row"


# ---- Items 2 and 4 end to end: the runner and the CLI ---------------------------


def write_world(tmp_path: Path, stops: int = 3):
    """A made-up world whose every stop builds a brief and carries the reference payload `[reply_step()]`."""
    import json

    from priority.evaluation.split import split

    manifest_path = tmp_path / "set-manifest.json"
    labels_path = tmp_path / "labels-confirmed.json"
    real_dir = tmp_path / "real"
    real_dir.mkdir(exist_ok=True)
    sessions = list(SESSION_IDS)
    manifest = [{"session": sid, "stops_in_session": stops, "stops": list(range(1, stops + 1)), "skipped": []}
                for sid in sessions]
    manifest_path.write_text(json.dumps(manifest) + "\n")
    labels = make_labels(session_ids=sessions, stops_per=stops)
    for per_session in labels["sessions"].values():
        for label in per_session["stops"].values():
            label["payloads"] = [reply_step()]
            label["ambiguous"] = False
    labels_path.write_text(json.dumps(labels) + "\n")
    for index, sid in enumerate(sessions):
        t = Transcript()
        for n in range(1, stops + 1):
            t.human(f"Made-up question {n} of session {index}?")
            t.reply(f"Made-up answer {n}.")
        t.write(real_dir / f"{sid}.jsonl")
    return manifest_path, labels_path, real_dir, split(sessions)


def run_cli(monkeypatch, tmp_path, judge):
    """Run `priority eval --split train` with a stub program (one reply step per stop) and the stub judge."""
    install_judge(monkeypatch, judge)
    manifest_path, labels_path, real_dir, parts = write_world(tmp_path)
    label = make_label(1)
    monkeypatch.setattr(require("priority.interpreter"), "Interpreter",
                        lambda *a, **k: StubInterpreter([make_prediction(label, steps=[reply_step()])]))
    from priority.cli import main

    code, out = None, io.StringIO()
    with contextlib.suppress(SystemExit), contextlib.redirect_stdout(out):
        code = main(["eval", "--split", "train", "--manifest", str(manifest_path), "--labels", str(labels_path),
                     "--real-dir", str(real_dir), "--log-dir", str(tmp_path / "logs")])
    return code, out.getvalue()


def test_eval_with_every_judge_call_failing_exits_zero_and_reports_n_a(monkeypatch, tmp_path):
    judge = FailingJudge()
    code, printed = run_cli(monkeypatch, tmp_path, judge)
    assert code == 0, printed[-600:]
    assert judge.calls > 0, "the stub judge was never called"
    match = ERRORS_LINE.search(printed)
    assert match, f"the eval printed no `judge errors: N` line: {printed[-600:]}"
    assert int(match.group(1)) == judge.calls, f"`judge errors: {match.group(1)}` for {judge.calls} failed calls"
    assert "overall including ambiguous: n/a (0 stops)" in printed, printed[-600:]
    assert "overall excluding ambiguous: n/a (0 stops)" in printed, printed[-600:]


def test_eval_with_some_judge_calls_failing_exits_zero_and_means_only_the_good_rows(monkeypatch, tmp_path):
    judge = AlternatingJudge()
    code, printed = run_cli(monkeypatch, tmp_path, judge)
    assert code == 0, printed[-600:]
    failed = (judge.calls + 1) // 2
    good = judge.calls - failed
    assert failed >= 1 and good >= 1, f"the stub judge ran {judge.calls} times"
    match = ERRORS_LINE.search(printed)
    assert match, f"the eval printed no `judge errors: N` line: {printed[-600:]}"
    assert int(match.group(1)) == failed, f"`judge errors: {match.group(1)}`, not {failed}"
    assert f"overall including ambiguous: 0.800 ({good} stops)" in printed, \
        f"the mean does not hold only the {good} good rows at 0.800: {printed[-600:]}"
    marked = [line for line in lines_of(printed, "score stop ") if "judge_error" in line]
    assert len(marked) == failed, f"{len(marked)} per-stop lines are marked judge_error, not {failed}"


def test_eval_with_a_working_judge_prints_judge_errors_zero(monkeypatch, tmp_path):
    code, printed = run_cli(monkeypatch, tmp_path,
                            lambda brief_text, predicted, expected: (0.8, ["payload: the made-up parts match."]))
    assert code == 0, printed[-600:]
    match = ERRORS_LINE.search(printed)
    assert match and match.group(1) == "0", f"the eval printed no `judge errors: 0` line: {printed[-600:]}"
    assert not [line for line in lines_of(printed, "score stop ") if "judge_error" in line]
