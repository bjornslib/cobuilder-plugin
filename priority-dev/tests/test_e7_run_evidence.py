"""Epic E7 run evidence: an optimiser run leaves a call log, names its reflection model, and prints its split.

The contract, on made-up stub models only:
- `calls.jsonl` in the run folder holds one row for each propose or judge call.
- A failed propose call keeps its raw reply and its error in its row.
- Each `reflection-NNN.json` names the reflection model from the config.
- The run prints the split counts, then the stops of each split.
- A judge failure ends the run, and it removes the folder that the run created.

The real judge runs on a stub judge LM set on DSPy, so no test makes a model call.
"""
from __future__ import annotations

import contextlib
import io
import itertools
import json
import re

from fixtures_support import require
from interpret_support import DummyLM, dspy
from judge_ref_support import install_judge
from probe_support import read_calls
from test_e7_reflection_evidence import BAD_REPLY, DEFAULT_LOG, GOOD_NOTE, GOOD_SCORE, gepa_world, no_sleep  # noqa: F401 (no_sleep is autouse)

JUDGE_REPLY = {"score": GOOD_SCORE, "notes": [GOOD_NOTE]}
JUDGE_FAILURE_NOTE = "judge error: the judge call failed (TimeoutError), scored 0"
SESSION_ID = re.compile(r"made-up-session-\d{2}")
STOP = r"[^\s/]{8}/\d{3}"  # the printed session shows eight characters, then the zero-padded stop
TRAINSET_LINE = re.compile(r"^trainset: (\d+) stops \((\d+) sessions\); valset: (\d+) stops \((\d+) sessions\); "
                           r"minibatch: (\d+)$", re.M)


@contextlib.contextmanager
def stub_judge_lm():
    """Set a stub judge reply as the DSPy LM for the run, so the real judge makes no model call."""
    with dspy.context(lm=DummyLM(itertools.cycle([JUDGE_REPLY]))):
        yield


def run_gepa_cli(monkeypatch, tmp_path, judge=None):
    """Run `priority optimise --optimiser gepa` on stub models. A `judge` stub replaces the judge. Return (code, printed, run_dir)."""
    manifest, labels, real_dir, _ = gepa_world(monkeypatch, tmp_path)
    if judge is not None:
        install_judge(monkeypatch, judge)
    argv = ["optimise", "--optimiser", "gepa", "--manifest", str(manifest), "--labels", str(labels),
            "--real-dir", str(real_dir), "--budget", "2", "--seed", "7", "--threads", "1", "--minibatch", "3"]
    out = io.StringIO()
    with contextlib.redirect_stdout(out), contextlib.redirect_stderr(out), stub_judge_lm():
        code = require("priority.cli").main(argv)
    return code, out.getvalue(), tmp_path / DEFAULT_LOG


def printed_stops(printed, label):
    """The (session, stop) pairs on the line that starts with `label`, in print order. `(none)` gives no pair."""
    match = re.search(rf"^{label}: ({STOP}(?: {STOP})*|\(none\))$", printed, re.M)
    assert match, f"the printed output has no `{label}` line: {printed[:400]!r}"
    return [] if match.group(1) == "(none)" else [tuple(token.split("/")) for token in match.group(1).split()]


def test_the_call_log_holds_propose_and_judge_rows_for_the_stops_the_run_printed(monkeypatch, tmp_path):
    code, printed, run_dir = run_gepa_cli(monkeypatch, tmp_path)
    assert code == 0, f"optimise failed: {printed[-500:]}"
    rows = read_calls(run_dir)
    stages = {row["stage"] for row in rows}
    assert stages == {"propose", "judge"}, f"the call log holds the stages {sorted(stages)}"
    for row in rows:
        assert SESSION_ID.fullmatch(row["session_id"]), f"the row session is {row['session_id']!r}"
        assert re.fullmatch(r"\d{3}", row["stop"]), f"the row stop is {row['stop']!r}"
    shown = set(printed_stops(printed, "train stops")) | set(printed_stops(printed, "valset stops"))
    row_pairs = {(row["session_id"][:8], row["stop"]) for row in rows}
    assert row_pairs <= shown, f"the rows name stops the run did not print: {sorted(row_pairs - shown)}"


def test_a_failed_propose_call_keeps_its_raw_reply_and_error_in_the_call_log(monkeypatch, tmp_path):
    code, printed, run_dir = run_gepa_cli(monkeypatch, tmp_path)
    assert code == 0, f"optimise failed: {printed[-500:]}"
    failed = [row for row in read_calls(run_dir) if row["stage"] == "propose" and row["valid"] is False]
    assert failed, f"no propose row is invalid, though the first reply is {BAD_REPLY!r}"
    assert "this is not JSON" in failed[0]["raw_reply"], f"the raw reply is {failed[0]['raw_reply']!r}"
    assert str(failed[0].get("error", "")).startswith("invalid_output"), f"the error is {failed[0].get('error')!r}"


def test_each_reflection_file_names_the_reflection_model_from_the_config(monkeypatch, tmp_path):
    code, printed, run_dir = run_gepa_cli(monkeypatch, tmp_path)
    assert code == 0, f"optimise failed: {printed[-500:]}"
    reflections = sorted(run_dir.glob("reflection-*.json"))
    assert reflections, "the run wrote no reflection file"
    expected = require("priority.config").reflection_model()
    for path in reflections:
        assert json.loads(path.read_text())["model"] == expected, f"{path.name} names another model"


def test_the_printed_split_gives_counts_that_match_its_stop_lists(monkeypatch, tmp_path):
    code, printed, _ = run_gepa_cli(monkeypatch, tmp_path)
    assert code == 0, f"optimise failed: {printed[-500:]}"
    found = TRAINSET_LINE.search(printed)
    assert found, f"no trainset line in: {printed[:400]!r}"
    train_n, train_s, val_n, val_s, minibatch = map(int, found.groups())
    train, val = printed_stops(printed, "train stops"), printed_stops(printed, "valset stops")
    assert (train_n, val_n) == (len(train), len(val)), \
        f"the counts are {train_n} and {val_n}, but the stop lists hold {len(train)} and {len(val)}"
    assert 0 < train_s <= train_n and val_s <= val_n, f"the session counts are {train_s} and {val_s}"
    assert minibatch == 3, f"the minibatch is {minibatch}, not the 3 the run passed"


def test_a_judge_failure_ends_the_run_and_removes_the_folder_it_created(monkeypatch, tmp_path):
    def failing_judge(brief_text, predicted, expected):
        return (0.0, [JUDGE_FAILURE_NOTE])

    code, printed, run_dir = run_gepa_cli(monkeypatch, tmp_path, judge=failing_judge)
    assert code == 1, f"the exit code is {code}, not 1"
    assert "optimise failed" in printed, f"no stop message in: {printed[-400:]!r}"
    assert not run_dir.exists(), f"the failed run kept its folder {run_dir}"
