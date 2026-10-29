"""Slice 20 RED: `priority judge-check` measures the judge against three bars.

The contract. `priority judge-check --pairs PATH --labels PATH --real-dir DIR
[--repeats 2]` scores each side of each pair with `metric.score` against the
stop's reference, `--repeats` times, on the brief built from the transcript.
It prints the human agreement, the closed-field probe, and the repeat flips,
then the judge usage line, then `agreement bar: pass` or `agreement bar: fail`.
A fail exits 1. Each pair names stop 1 as an integer. The judge is a stub
and every file is made up, so no test makes a model call.
"""
from __future__ import annotations

import re

from judge_check_support import (LABEL, MULTI, PROBE_REFERENCES, ROLE, TRANSCRIPT, GradingJudge,
                                 agreeing, diff_paths, pair, run_check)
from judge_ref_support import as_json, require, stripped

USAGE = re.compile(r"^judge calls: \d+ prompt_tokens: \d+ completion_tokens: \d+$")


def line_index(lines: list, text: str) -> int:
    """The index of one exact line, or an assertion failure naming the report."""
    assert text in lines, f"the report has no line {text!r}: {lines}"
    return lines.index(text)


def test_passing_run_prints_three_bars_then_usage_then_pass(monkeypatch, tmp_path):
    code, printed = run_check(monkeypatch, tmp_path, agreeing(6), GradingJudge())
    lines = printed.splitlines()
    agreement = line_index(lines, "human agreement: 6/6 = 1.00 (bar 0.75, min 6 pairs)")
    probe = line_index(lines, "closed-field probe: 5/5 = 1.00 (bar 0.90)")
    flips = line_index(lines, "repeat flips: 0/6 = 0.00 (bar 0.10)")
    verdict = line_index(lines, "agreement bar: pass")
    usage = [index for index, line in enumerate(lines) if USAGE.match(line)]
    assert usage, f"the report has no judge usage line: {lines}"
    assert agreement < probe < flips < usage[-1] < verdict, f"the report lines are out of order: {lines}"
    assert code == 0, f"a passing run exited {code}"


def test_each_side_is_judged_twice_by_default_on_the_built_brief(monkeypatch, tmp_path):
    judge = GradingJudge()
    pairs = agreeing(6)
    run_check(monkeypatch, tmp_path, pairs, judge)
    brief = require("priority.brief").build_brief(TRANSCRIPT, stop=1).for_model()
    for entry in pairs:
        for side in ("a", "b"):
            calls = [call for call in judge.calls if as_json(call["predicted"]) == as_json(entry[side])]
            assert len(calls) == 2, f"pair {entry['session']} side {side} was judged {len(calls)} times"
            assert all(call["brief_text"] == brief for call in calls), "a pair was judged on another brief"
            assert all(call["expected"] == stripped([{"kind": "reply", "text":
                       "The reference answer for the made-up stop."}]) for call in calls), \
                "a pair was judged against another reference"


def test_repeats_flag_sets_the_judge_count_per_side(monkeypatch, tmp_path):
    judge = GradingJudge()
    pairs = agreeing(6)
    run_check(monkeypatch, tmp_path, pairs, judge, extra=("--repeats", "3"))
    calls = [call for call in judge.calls if as_json(call["predicted"]) == as_json(pairs[0]["a"])]
    assert len(calls) == 3, f"--repeats 3 judged one side {len(calls)} times"


def test_fewer_than_six_picked_pairs_fails(monkeypatch, tmp_path):
    code, printed = run_check(monkeypatch, tmp_path, agreeing(5), GradingJudge())
    lines = printed.splitlines()
    line_index(lines, "human agreement: 5/5 = 1.00 (bar 0.75, min 6 pairs)")
    line_index(lines, "agreement bar: fail")
    assert code == 1, f"a run with 5 picked pairs exited {code}"


def test_agreement_under_the_bar_fails(monkeypatch, tmp_path):
    pairs = agreeing(4) + [pair(4, 0.9, 0.2, "b"), pair(5, 0.1, 0.8, "a")]
    code, printed = run_check(monkeypatch, tmp_path, pairs, GradingJudge())
    lines = printed.splitlines()
    line_index(lines, "human agreement: 4/6 = 0.67 (bar 0.75, min 6 pairs)")
    line_index(lines, "agreement bar: fail")
    assert code == 1, f"a run under the agreement bar exited {code}"


def test_a_tie_is_no_match_and_an_unpicked_pair_is_not_counted(monkeypatch, tmp_path):
    pairs = agreeing(6) + [pair(6, 0.5, 0.5, "a"), pair(7, 0.9, 0.2, None)]
    code, printed = run_check(monkeypatch, tmp_path, pairs, GradingJudge())
    lines = printed.splitlines()
    line_index(lines, "human agreement: 6/7 = 0.86 (bar 0.75, min 6 pairs)")
    line_index(lines, "agreement bar: pass")
    assert code == 0, f"a run over every bar exited {code}"


def test_a_judge_blind_to_closed_fields_fails_the_probe(monkeypatch, tmp_path):
    code, printed = run_check(monkeypatch, tmp_path, agreeing(6), GradingJudge(probe_blind=True))
    lines = printed.splitlines()
    line_index(lines, "closed-field probe: 0/5 = 0.00 (bar 0.90)")
    line_index(lines, "agreement bar: fail")
    assert code == 1, f"a run under the probe bar exited {code}"


def test_probe_copies_change_exactly_one_closed_field(monkeypatch, tmp_path):
    judge = GradingJudge()
    run_check(monkeypatch, tmp_path, agreeing(6), judge)
    wanted = {0: {MULTI, ROLE, LABEL}, 1: {MULTI, ROLE}}
    for index, reference in enumerate(PROBE_REFERENCES):
        expected = stripped([reference])
        copies = [call["predicted"] for call in judge.calls
                  if call["expected"] == expected and call["predicted"] != expected]
        changed = [diff_paths(copy, expected) for copy in copies]
        assert changed, f"probe reference {index} was never judged against a changed copy"
        assert all(len(paths) == 1 for paths in changed), f"a probe copy changed more than one field: {changed}"
        assert set().union(*changed) == wanted[index], \
            f"probe reference {index} changed {set().union(*changed)}, want {wanted[index]}"
        assert any(call["expected"] == expected and call["predicted"] == expected
                   for call in judge.calls), f"probe reference {index} was never judged against itself"


def test_a_judge_that_flips_between_repeats_fails(monkeypatch, tmp_path):
    pairs = agreeing(6) + [pair(6, "flaky", 0.5, "a")]
    code, printed = run_check(monkeypatch, tmp_path, pairs, GradingJudge())
    lines = printed.splitlines()
    line_index(lines, "repeat flips: 1/7 = 0.14 (bar 0.10)")
    line_index(lines, "agreement bar: fail")
    assert code == 1, f"a run over the flip bar exited {code}"
