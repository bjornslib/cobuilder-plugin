"""`priority eval --split all` scores every session of the manifest.

The contract: `--split all` scores the sessions of both parts, in manifest
order, and no session twice. The report header reads `eval all`, and the
`sessions:` line counts all of them. The `train` and `holdout` runs stay
exactly as they are. All sessions, labels, and transcripts here are made
up, the interpreter is a stub, and the judge is a stub, so no test makes
a model call.
"""
from __future__ import annotations

import contextlib
import io
import json
import re

from eval_support import (require, stub_predictions_for, StubInterpreter,
                          write_eval_world)
from fixtures_support import stop_key
from judge_ref_support import JudgeRecorder, install_judge

SCORE_STOP = re.compile(r"^score stop session=(\S+) stop=(\d{3}) ", re.M)
STOP_SCORE = re.compile(r"^stop (\S+) (\d{3}): ([\d.]+)$", re.M)
SESSIONS_LINE = re.compile(r"^sessions: (\d+)$", re.M)


def run_eval(monkeypatch, tmp_path, split_name: str, world=None):
    """Run `priority eval --split <name>` in process with a stub interpreter and judge.

    Return the exit code, the printed report, and the split parts.
    """
    install_judge(monkeypatch, JudgeRecorder())
    api = require("priority.interpreter")
    if world is None:
        manifest_path, labels_path, real_dir, parts = write_eval_world(tmp_path)
    else:
        manifest_path, labels_path, real_dir, parts = world
    monkeypatch.setattr(api, "Interpreter", lambda *a, **k: StubInterpreter(
        stub_predictions_for(manifest_path, labels_path)))
    from priority.cli import main

    code, out = None, io.StringIO()
    with contextlib.suppress(SystemExit), contextlib.redirect_stdout(out):
        code = main(["eval", "--split", split_name, "--manifest", str(manifest_path),
                     "--labels", str(labels_path), "--real-dir", str(real_dir)])
    return code, out.getvalue(), parts


def manifest_stops(manifest_path):
    """Every (session, stop) pair of the manifest, in manifest order."""
    manifest = json.loads(manifest_path.read_text())
    return [(entry["session"], stop_key(number))
            for entry in manifest for number in entry["stops"]]


def stop_scores(printed: str) -> dict[tuple[str, str], float]:
    """The per-stop overall scores of one report, keyed by (session, stop)."""
    return {(session, stop): float(value) for session, stop, value in STOP_SCORE.findall(printed)}


def test_eval_all_prints_the_all_header(monkeypatch, tmp_path):
    code, printed, _ = run_eval(monkeypatch, tmp_path, "all")
    assert code == 0
    assert "eval all" in printed, f"the header is not `eval all`: {printed[:200]}"


def test_eval_all_scores_the_union_of_both_parts(monkeypatch, tmp_path):
    code, printed, parts = run_eval(monkeypatch, tmp_path, "all")
    assert code == 0
    scored = {(session, stop) for session, stop in SCORE_STOP.findall(printed)}
    both = {(session, stop) for session in (*parts["train"], *parts["holdout"])
            for stop in (stop_key(n) for n in range(1, 6))}
    assert scored == both, "all did not score exactly the union of train and holdout stops"


def test_eval_all_scores_no_session_twice(monkeypatch, tmp_path):
    code, printed, _ = run_eval(monkeypatch, tmp_path, "all")
    assert code == 0
    scored = SCORE_STOP.findall(printed)
    assert len(scored) == len(set(scored)), f"a stop was scored twice: {sorted(scored)[:5]}"


def test_eval_all_keeps_manifest_order(monkeypatch, tmp_path):
    manifest_path, _, _, _ = write_eval_world(tmp_path)
    code, printed, _ = run_eval(monkeypatch, tmp_path, "all")
    assert code == 0
    assert SCORE_STOP.findall(printed) == manifest_stops(manifest_path), \
        "all did not score the stops in manifest order"


def test_eval_all_counts_all_sessions_in_the_sessions_line(monkeypatch, tmp_path):
    code, printed, parts = run_eval(monkeypatch, tmp_path, "all")
    assert code == 0
    match = SESSIONS_LINE.search(printed)
    assert match, f"no `sessions:` line: {printed[:300]}"
    assert int(match.group(1)) == len(parts["train"]) + len(parts["holdout"])


def test_eval_all_leaves_train_scores_unchanged(monkeypatch, tmp_path):
    _, train_printed, _ = run_eval(monkeypatch, tmp_path, "train")
    _, all_printed, _ = run_eval(monkeypatch, tmp_path, "all")
    train_scores = stop_scores(train_printed)
    all_scores = stop_scores(all_printed)
    assert train_scores and all_scores
    assert {pair: value for pair, value in all_scores.items() if pair in train_scores} == train_scores, \
        "the train stop scores changed under --split all"


def test_eval_all_leaves_holdout_scores_unchanged(monkeypatch, tmp_path):
    _, holdout_printed, _ = run_eval(monkeypatch, tmp_path, "holdout")
    _, all_printed, _ = run_eval(monkeypatch, tmp_path, "all")
    holdout_scores = stop_scores(holdout_printed)
    all_scores = stop_scores(all_printed)
    assert holdout_scores and all_scores
    assert {pair: value for pair, value in all_scores.items() if pair in holdout_scores} == holdout_scores, \
        "the holdout stop scores changed under --split all"
