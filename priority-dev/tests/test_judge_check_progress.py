"""`priority judge-check` shows progress, keeps finished work, and resumes.

The contract of this slice, on top of `test_judge_check.py`:

1. Progress. Each judge call (each side of a pair, each repeat, each probe
   call) prints one line to stdout, flushed at once, with what it scored and
   the seconds it took: `pair 2/8 side a repeat 1/2 done 142.3s`. A probe line
   starts with `probe` and ends with `done <seconds>s`. Pair and repeat numbers
   count from 1. The clock is the module attribute `judge_check.clock`.
2. Checkpoint. `--checkpoint PATH` appends one JSONL row for each finished pair
   and each finished probe copy, at once, after all its calls end. A pair row
   is `{"session", "stop", "a": [score per repeat], "b": [score per repeat]}`
   with the payloads or a fingerprint of them. A probe row is `{"session",
   "stop", "changed", "base", "copy"}`, one row for each copy.
3. Resume. Stored pairs and copies make no judge call, and their stored
   scores, base scores included, go into the bars as if computed now.
4. A row of another pairs file (an unknown session or stop, or other payload
   content) is ignored, with a printed line that names a warning.
5. Without `--checkpoint`, the report and the files stay as before.

The judge is a stub and every file is made up, so no test makes a model call.
"""
from __future__ import annotations

from collections import Counter

import pytest
from judge_check_progress_support import (ALL_CALLS, PAIR_CALLS, PAIR_LINE, PAIRS, PROBE_LINE, Clock, FlushedOut,
                                          SpyJudge, call_seconds, pair_number, progress, read_rows, report,
                                          run_cli, warnings, write_rows)
from judge_check_support import GradingJudge, pair

BASE_REPORT = ["human agreement: 5/6 = 0.83 (bar 0.75, min 6 pairs)",
               "closed-field probe: 7/7 = 1.00 (bar 0.90)",
               "repeat flips: 0/6 = 0.00 (bar 0.10)",
               "agreement bar: pass"]

def checkpoint_args(tmp_path) -> tuple:
    return ("--checkpoint", str(tmp_path / "checkpoint.jsonl"))


def test_each_pair_call_prints_one_line_with_side_repeat_and_seconds(monkeypatch, tmp_path):
    clock = Clock()
    judge = SpyJudge(clock=clock)
    result = run_cli(monkeypatch, tmp_path, PAIRS, judge, clock=clock)
    lines = [line for line in progress(result.text) if line.startswith("pair ")]
    assert len(lines) == PAIR_CALLS, f"6 pairs at 2 repeats made {PAIR_CALLS} calls, but {len(lines)} pair lines: {lines}"
    seen = Counter()
    for number, (line, call) in enumerate(zip(lines, judge.calls), 1):
        match = PAIR_LINE.match(line)
        assert match, f"progress line {number} does not match 'pair I/N side S repeat R/M done T.Ts': {line!r}"
        index, side = pair_number(call), call["predicted"]["steps"][0]["text"].rsplit("-", 1)[1]
        seen[index, side] += 1
        expected = (str(index + 1), "6", side, str(seen[index, side]), "2", f"{call_seconds(number):.1f}")
        assert match.groups() == expected, f"line {number} is {line!r}, but the call scored {expected}"


def test_each_probe_call_prints_one_line_with_the_seconds(monkeypatch, tmp_path):
    clock = Clock()
    judge = SpyJudge(clock=clock)
    result = run_cli(monkeypatch, tmp_path, PAIRS, judge, clock=clock)
    lines = [line for line in progress(result.text) if line.startswith("probe")]
    assert len(judge.calls) == ALL_CALLS, f"the run made {len(judge.calls)} judge calls, not {ALL_CALLS}"
    assert len(lines) == ALL_CALLS - PAIR_CALLS, f"9 probe calls but {len(lines)} probe lines: {lines}"
    for number, line in zip(range(PAIR_CALLS + 1, ALL_CALLS + 1), lines):
        match = PROBE_LINE.match(line)
        assert match, f"probe line for call {number} does not match 'probe ... done T.Ts': {line!r}"
        assert match.group(1) == f"{call_seconds(number):.1f}", f"{line!r} is not the {call_seconds(number)}s of call {number}"
    names = {line.rsplit(" done ", 1)[0] for line in lines}
    assert len(names) == len(lines), f"two probe calls print the same name: {lines}"


def test_each_progress_line_is_flushed_before_the_next_call(monkeypatch, tmp_path):
    out, flushed_counts = FlushedOut(), []
    judge = SpyJudge(spy=lambda number: flushed_counts.append(len(progress(out.flushed))))
    run_cli(monkeypatch, tmp_path, PAIRS, judge, out=out)
    assert flushed_counts == list(range(ALL_CALLS)), \
        f"at the start of each call, the flushed output must hold one line per earlier call: {flushed_counts}"


def test_the_checkpoint_option_is_accepted_and_the_file_is_written(monkeypatch, tmp_path):
    result = run_cli(monkeypatch, tmp_path, PAIRS, GradingJudge(), extra=checkpoint_args(tmp_path))
    assert result.code == 0, f"--checkpoint did not run: exit {result.code}, stderr {result.err!r}"
    assert len(read_rows(tmp_path / "checkpoint.jsonl")) == 13, "6 pair rows and 7 probe rows must be written"


def test_a_row_is_appended_once_all_its_calls_finish_and_at_once(monkeypatch, tmp_path):
    path, counts = tmp_path / "checkpoint.jsonl", {}
    judge = SpyJudge(spy=lambda number: counts.__setitem__(number, len(read_rows(path))))
    run_cli(monkeypatch, tmp_path, PAIRS, judge, extra=checkpoint_args(tmp_path))
    # Calls 1-4 are pair 1, call 25 is the base call of probe reference 0, and calls 26-29 are its copies.
    expected = {1: 0, 4: 0, 5: 1, 8: 1, 9: 2, 24: 5, 25: 6, 26: 6, 27: 7, 29: 9, 30: 10, 31: 10, 32: 11, 33: 12}
    assert {number: counts.get(number) for number in expected} == expected, \
        f"rows on disk at the start of each call: {counts}"


def test_pair_rows_hold_session_stop_and_the_scores_of_each_repeat(monkeypatch, tmp_path):
    run_cli(monkeypatch, tmp_path, PAIRS, GradingJudge(), extra=checkpoint_args(tmp_path))
    rows = [row for row in read_rows(tmp_path / "checkpoint.jsonl") if "changed" not in row]
    grades = [(0.9, 0.2), (0.1, 0.8), (0.9, 0.2), (0.1, 0.8), (0.9, 0.2), (0.5, 0.5)]
    assert len(rows) == 6, f"6 pair rows expected, got {len(rows)}"
    for index, (row, (a, b)) in enumerate(zip(rows, grades)):
        assert (row.get("session"), int(row.get("stop", -1))) == (f"judge-check-pair-{index:02d}", 1), row
        assert (row.get("a"), row.get("b")) == ([a, a], [b, b]), f"pair row {index} holds the wrong scores: {row}"


def test_probe_rows_hold_one_copy_with_the_changed_field_and_both_scores(monkeypatch, tmp_path):
    run_cli(monkeypatch, tmp_path, PAIRS, GradingJudge(), extra=checkpoint_args(tmp_path))
    rows = [row for row in read_rows(tmp_path / "checkpoint.jsonl") if "changed" in row]
    assert len(rows) == 7, f"7 probe copy rows expected, got {len(rows)}"
    for session, count in (("judge-check-probe-00", 4), ("judge-check-probe-01", 3)):
        own = [row for row in rows if row.get("session") == session]
        assert len(own) == count, f"{session} must have {count} copy rows, got {len(own)}"
        assert len({str(row["changed"]) for row in own}) == count, f"each copy of {session} changes one other field"
        assert all(int(row["stop"]) == 1 and row.get("base") == 1.0 and row.get("copy") == 0.4 for row in own), own


def test_a_killed_pair_run_resumes_the_pairs_it_did_not_finish(monkeypatch, tmp_path):
    check_resume(monkeypatch, tmp_path, kill_at=7, rows_kept=1, calls_left=29, pairs_left={1, 2, 3, 4, 5})


def test_a_killed_probe_run_resumes_only_the_copies_it_did_not_finish(monkeypatch, tmp_path):
    check_resume(monkeypatch, tmp_path, kill_at=28, rows_kept=8, calls_left=6, pairs_left=set())


def check_resume(monkeypatch, tmp_path, kill_at, rows_kept, calls_left, pairs_left):
    """Kill a run at one call, then resume it. The report must equal the one of an uninterrupted run."""
    extra, path = checkpoint_args(tmp_path), tmp_path / "checkpoint.jsonl"
    with pytest.raises(KeyboardInterrupt):
        run_cli(monkeypatch, tmp_path, PAIRS, SpyJudge(kill_at=kill_at), extra=extra)
    assert len(read_rows(path)) == rows_kept, f"a run killed at call {kill_at} must keep {rows_kept} rows"
    resumed, whole = GradingJudge(), GradingJudge()
    result = run_cli(monkeypatch, tmp_path, PAIRS, resumed, extra=extra)
    plain = run_cli(monkeypatch, tmp_path, PAIRS, whole)
    assert len(resumed.calls) == calls_left, f"the resumed run judged {len(resumed.calls)} times, not {calls_left}"
    judged = {pair_number(call) for call in resumed.calls} - {None}
    assert judged == pairs_left, f"the resumed run judged pairs {judged}, not {pairs_left}"
    assert len(progress(result.text)) == calls_left, "a resumed run prints one line for each call it makes"
    assert report(result.text) == report(plain.text) == BASE_REPORT, report(result.text)
    assert result.code == plain.code == 0
    assert len(read_rows(path)) == 13, "the resumed run must append only the missing rows"


def test_a_complete_checkpoint_makes_no_judge_call(monkeypatch, tmp_path):
    first = run_cli(monkeypatch, tmp_path, PAIRS, GradingJudge(), extra=checkpoint_args(tmp_path))
    judge = GradingJudge()
    second = run_cli(monkeypatch, tmp_path, PAIRS, judge, extra=checkpoint_args(tmp_path))
    assert judge.calls == [], f"a complete checkpoint still made {len(judge.calls)} judge calls"
    assert report(second.text) == report(first.text) == BASE_REPORT
    assert len(read_rows(tmp_path / "checkpoint.jsonl")) == 13, "a skipped unit must not be written again"
    assert warnings(second) == [], f"a checkpoint of this pairs file must not warn: {warnings(second)}"


def test_stored_scores_enter_the_bars_as_if_computed(monkeypatch, tmp_path):
    path = tmp_path / "checkpoint.jsonl"
    run_cli(monkeypatch, tmp_path, PAIRS, GradingJudge(), extra=checkpoint_args(tmp_path))
    rows = read_rows(path)
    assert len(rows) == 13, f"the first run must write 13 rows, wrote {len(rows)}"
    rows[0]["a"], rows[0]["b"] = [0.9, 0.1], [0.2, 0.2]  # repeat 2 flips: the sum still prefers a
    next(row for row in rows if "changed" in row)["copy"] = 1.0  # one copy no longer scores lower
    write_rows(path, rows)
    judge = GradingJudge()
    result = run_cli(monkeypatch, tmp_path, PAIRS, judge, extra=checkpoint_args(tmp_path))
    assert judge.calls == [], "every unit is stored, so no judge call is needed"
    assert report(result.text) == ["human agreement: 5/6 = 0.83 (bar 0.75, min 6 pairs)",
                                   "closed-field probe: 6/7 = 0.86 (bar 0.90)",
                                   "repeat flips: 1/6 = 0.17 (bar 0.10)",
                                   "agreement bar: fail"], report(result.text)


def test_a_row_of_unknown_session_or_stop_is_ignored_with_a_warning(monkeypatch, tmp_path):
    foreign = [{"session": "no-such-session", "stop": 1, "a": [0.9, 0.9], "b": [0.2, 0.2]},
               {"session": "judge-check-pair-00", "stop": 9, "a": [0.1, 0.1], "b": [0.9, 0.9]}]
    write_rows(tmp_path / "checkpoint.jsonl", foreign)
    judge = GradingJudge()
    result = run_cli(monkeypatch, tmp_path, PAIRS, judge, extra=checkpoint_args(tmp_path))
    assert len(judge.calls) == ALL_CALLS, f"a foreign row skipped work: {len(judge.calls)} calls, not {ALL_CALLS}"
    assert report(result.text) == BASE_REPORT, report(result.text)
    assert warnings(result), "a checkpoint row of another pairs file must print a warning"


def test_a_row_with_other_payload_content_is_ignored_and_the_pair_is_judged_again(monkeypatch, tmp_path):
    run_cli(monkeypatch, tmp_path, PAIRS, GradingJudge(), extra=checkpoint_args(tmp_path))
    changed = [pair(0, 0.1, 0.2, "a")] + PAIRS[1:]  # same session and stop, other payload text for side a
    judge = GradingJudge()
    result = run_cli(monkeypatch, tmp_path, changed, judge, extra=checkpoint_args(tmp_path))
    assert [pair_number(call) for call in judge.calls] == [0, 0, 0, 0], \
        f"only the changed pair must be judged again: {[pair_number(call) for call in judge.calls]}"
    assert report(result.text)[0] == "human agreement: 4/6 = 0.67 (bar 0.75, min 6 pairs)", \
        f"the stored scores of the old payload were used: {report(result.text)}"
    assert warnings(result), "a row with other payload content must print a warning"


def test_without_the_option_the_report_is_the_same_and_no_file_is_written(monkeypatch, tmp_path):
    plain = run_cli(monkeypatch, tmp_path, PAIRS, GradingJudge())
    names = {item.name for item in tmp_path.iterdir()}
    kept = run_cli(monkeypatch, tmp_path, PAIRS, GradingJudge(), extra=checkpoint_args(tmp_path))
    assert plain.code == 0 and report(plain.text) == BASE_REPORT, (plain.code, report(plain.text))
    assert names == {"pairs.json", "labels-confirmed.json", "real"}, f"a run with no --checkpoint wrote {names}"
    assert kept.code == 0 and report(kept.text) == report(plain.text), "--checkpoint must not change the report"
    assert warnings(plain) == [], "a run with no --checkpoint must print no warning"
