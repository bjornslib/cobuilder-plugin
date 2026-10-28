"""Slice 16 RED: `priority eval` scores each split apart.

Each test fails until the `eval` command exists. The contract: `priority
eval --split train` prints the train sessions with per-session scores and
an overall score, `--split holdout` prints the held-out sessions, a run
never names a session of the other part, the report breaks the score into
facts, step kinds, and overall, and ambiguous stops are counted
both with and without them. All sessions, labels, and transcripts here are
made up, and the interpreter is a stub, so no test makes a model call.
"""
from __future__ import annotations

import contextlib
import io
import re

from eval_support import (metric_api, require, stub_predictions_for,
                          StubInterpreter, write_eval_world)


def run_eval(monkeypatch, capsys, tmp_path, split_name: str):
    """Run `priority eval` in process with a stub interpreter.

    Return the exit code and the printed report. The SystemExit guard covers
    the run before the `eval` subcommand exists, so the tests fail on their
    assertions and not on the missing parser.
    """
    metric_api()
    interpreter = require("priority.interpreter")
    config = require("priority.config")
    manifest_path, labels_path, real_dir, parts = write_eval_world(tmp_path)
    monkeypatch.setattr(config, "load_key",
                        lambda *args, **kwargs: (_ for _ in ()).throw(
                            AssertionError("a test reached for the real key")))
    monkeypatch.setattr(interpreter, "Interpreter",
                        lambda *args, **kwargs: StubInterpreter(
                            stub_predictions_for(manifest_path, labels_path)))
    from priority.cli import main

    code = None
    out = io.StringIO()
    with contextlib.suppress(SystemExit):
        with contextlib.redirect_stdout(out):
            code = main(["eval", "--split", split_name,
                         "--manifest", str(manifest_path),
                         "--labels", str(labels_path),
                         "--real-dir", str(real_dir)])
    return code, out.getvalue(), parts


def test_eval_train_prints_train_sessions_with_scores_and_no_holdout(
        monkeypatch, capsys, tmp_path):
    code, printed, parts = run_eval(monkeypatch, capsys, tmp_path, "train")
    assert code == 0
    lowered = printed.lower()
    for token in ("train", "facts", "step", "overall"):
        assert token in lowered
    for session_id in parts["train"]:
        assert session_id in printed
    for session_id in parts["holdout"]:
        assert session_id not in printed


def test_eval_holdout_prints_holdout_sessions_with_scores_and_no_train(
        monkeypatch, capsys, tmp_path):
    code, printed, parts = run_eval(monkeypatch, capsys, tmp_path, "holdout")
    assert code == 0
    lowered = printed.lower()
    for token in ("holdout", "facts", "step", "overall"):
        assert token in lowered
    for session_id in parts["holdout"]:
        assert session_id in printed
    for session_id in parts["train"]:
        assert session_id not in printed


def test_eval_train_and_holdout_never_mix_parts(monkeypatch, capsys, tmp_path):
    _, train_printed, parts = run_eval(monkeypatch, capsys, tmp_path, "train")
    _, holdout_printed, _ = run_eval(monkeypatch, capsys, tmp_path, "holdout")
    train_ids = {sid for sid in parts["train"] if sid in train_printed}
    holdout_ids = {sid for sid in parts["holdout"] if sid in holdout_printed}
    assert train_ids == set(parts["train"])
    assert holdout_ids == set(parts["holdout"])
    assert all(sid not in holdout_printed for sid in parts["train"])
    assert all(sid not in train_printed for sid in parts["holdout"])


def test_eval_reports_ambiguous_stops_with_and_without(
        monkeypatch, capsys, tmp_path):
    _, train_printed, _ = run_eval(monkeypatch, capsys, tmp_path, "train")
    _, holdout_printed, _ = run_eval(monkeypatch, capsys, tmp_path, "holdout")
    for printed in (train_printed, holdout_printed):
        lowered = printed.lower()
        assert "including ambiguous" in lowered
        assert "excluding ambiguous" in lowered


def test_eval_prints_one_score_line_per_stop(monkeypatch, capsys, tmp_path):
    _, printed, parts = run_eval(monkeypatch, capsys, tmp_path, "train")
    score_lines = re.findall(
        r"^score stop session=(\S+) stop=(\d+) overall=([\d.]+) ambiguous=(yes|no)$",
        printed, re.M)
    stop_lines = re.findall(r"^stop (\S+) 0*(\d+): ", printed, re.M)
    assert score_lines
    assert len(score_lines) == len(stop_lines)
    assert {session for session, *_ in score_lines} == set(parts["train"])
