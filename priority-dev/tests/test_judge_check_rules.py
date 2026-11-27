"""The scoring rules and the probe copies of `priority judge-check`.

1. The verdict of a pair uses the median score of its repeats on each side.
2. A repeat is a pick when its two scores differ by at least 0.05. A pair flips
   only when its repeats pick both sides. A tie against a pick is no flip. The
   report also prints how many pairs the old rule (any change of direction,
   a tie included) would flip: `flips under the old rule: N/M`.
3. The probe covers the stops of the pairs. Each reference gets one copy for
   each closed field that can change: `priority`, `until_event` (a snooze
   step), `kind_swap` (a reference with no ask_human step), `dropped_step` (two
   steps or more), and `inserted_step` (no step).
4. A pair row holds `notes`, and a probe row holds `base_notes` and
   `copy_notes`. A row with no notes still loads.

The judge is a stub and every file is made up, so no test makes a model call.
"""
from __future__ import annotations

import json
import re

import pytest
from judge_check_progress_support import read_rows, write_rows
from judge_check_support import GradingJudge, agreeing, first_text, run_check
from judge_ref_support import ask_step

FLIPS = re.compile(r"^repeat flips: (\d+)/(\d+) = ")
OLD_FLIPS = re.compile(r"^flips under the old rule: (\d+)/(\d+)$")


class ScriptedJudge(GradingJudge):
    """The grading judge, but a `script` reply scores the next number of its side's list, with a numbered note."""

    def __init__(self, scores: dict):
        super().__init__()
        self.scores, self.runs = scores, {"a": 0, "b": 0}

    def __call__(self, brief_text, predicted, expected):
        text = first_text(predicted)
        if not text.startswith("script "):
            return super().__call__(brief_text, predicted, expected)
        side = text[-1]
        self.calls.append({"brief_text": brief_text, "predicted": predicted, "expected": expected})
        number, self.runs[side] = self.runs[side], self.runs[side] + 1
        return (self.scores[side][number], [f"scripted {side}{number}"])


def scripted_pair(index: int, human: str = "a") -> dict:
    """One pair whose two sides the `ScriptedJudge` scores from a list."""
    def side(name):
        return {"priority": "P2", "steps": [{"kind": "reply", "text": f"script pair-{index}-{name}"}]}
    return {"session": f"judge-check-pair-{index:02d}", "stop": 1, "a": side("a"), "b": side("b"), "human": human}


def lines_of(printed: str) -> list:
    return printed.splitlines()


def counts(printed: str) -> tuple:
    """The flips of the report and its flips under the old rule."""
    flips = [FLIPS.match(line) for line in lines_of(printed) if FLIPS.match(line)]
    old = [OLD_FLIPS.match(line) for line in lines_of(printed) if OLD_FLIPS.match(line)]
    assert len(flips) == len(old) == 1, f"the report needs one flips line and one old-rule line: {printed}"
    assert flips[0].group(2) == old[0].group(2), "both flip lines count the same pairs"
    return int(flips[0].group(1)), int(old[0].group(1))


@pytest.mark.parametrize("case,a,b,flips,old_flips", [
    ("both sides picked", [0.9, 0.2], [0.2, 0.9], 1, 1),
    ("a gap of exactly 0.05 is a pick", [0.55, 0.5], [0.5, 0.55], 1, 1),
    ("a gap under 0.05 is a tie", [0.9, 0.5], [0.2, 0.54], 0, 1),
    ("a tie against a pick is no flip", [0.5, 0.9], [0.5, 0.2], 0, 1),
    ("one side picked twice", [0.9, 0.7], [0.2, 0.3], 0, 0),
])
def test_a_pair_flips_only_when_its_repeats_pick_both_sides(monkeypatch, tmp_path, case, a, b, flips, old_flips):
    _, printed = run_check(monkeypatch, tmp_path, agreeing(6) + [scripted_pair(6)], ScriptedJudge({"a": a, "b": b}))
    assert counts(printed) == (flips, old_flips), f"{case}: {counts(printed)}, want {(flips, old_flips)}"
    assert f"/7 = {flips / 7:.2f} (bar 0.10)" in printed, printed


def test_the_old_rule_line_follows_the_flip_line_and_goes_before_the_usage_line(monkeypatch, tmp_path):
    _, printed = run_check(monkeypatch, tmp_path, agreeing(6), GradingJudge())
    lines = lines_of(printed)
    assert "flips under the old rule: 0/6" in lines, lines
    flips = next(i for i, line in enumerate(lines) if FLIPS.match(line))
    assert lines[flips + 1] == "flips under the old rule: 0/6", lines
    assert lines[flips + 2].startswith("judge calls:"), lines


def test_the_verdict_uses_the_median_of_three_repeats(monkeypatch, tmp_path):
    # The mean of side a is 0.43, above 0.3, but its median is 0.2, below 0.3. The human picked b.
    judge = ScriptedJudge({"a": [0.9, 0.2, 0.2], "b": [0.3, 0.3, 0.3]})
    pairs = agreeing(5) + [scripted_pair(5, human="b")]
    _, printed = run_check(monkeypatch, tmp_path, pairs, judge, extra=("--repeats", "3"))
    assert "human agreement: 6/6 = 1.00 (bar 0.75, min 6 pairs)" in lines_of(printed), printed
    assert judge.runs == {"a": 3, "b": 3}, f"the pair must be judged 3 times on each side: {judge.runs}"


# Each pair stop gets its own reference. The default reference is one reply step with the priority P3.
REPLY, NOTIFY = {"kind": "reply", "text": "first"}, {"kind": "notify", "excerpt": "second"}
SNOOZE = {"kind": "snooze", "until_event": "session_idle"}
REFERENCES = {"judge-check-pair-01": ("P1", [REPLY, NOTIFY]), "judge-check-pair-02": ("P2", []),
              "judge-check-pair-03": ("P1", [SNOOZE]), "judge-check-pair-04": ("P3", [REPLY]),
              "judge-check-pair-05": ("P1", [ask_step(options=False)])}
NAMES = {"judge-check-pair-00": ["kind_swap", "priority"],
         "judge-check-pair-01": ["dropped_step", "kind_swap", "priority"],
         "judge-check-pair-02": ["inserted_step", "priority"],
         "judge-check-pair-03": ["kind_swap", "priority", "until_event"],
         "judge-check-pair-04": ["kind_swap", "priority"],
         "judge-check-pair-05": ["multi_select", "priority", "role"]}


def run_references(monkeypatch, tmp_path, judge=None, extra=()) -> tuple:
    judge = judge or GradingJudge()
    run_check(monkeypatch, tmp_path, agreeing(6), judge, extra=extra, references=REFERENCES)
    return judge, read_rows(tmp_path / "checkpoint.jsonl")


def test_each_reference_gets_one_copy_for_each_closed_field_that_can_change(monkeypatch, tmp_path):
    _, rows = run_references(monkeypatch, tmp_path, extra=("--checkpoint", str(tmp_path / "checkpoint.jsonl")))
    found = {session: sorted(row["changed"] for row in rows if "changed" in row and row["session"] == session)
             for session in NAMES}
    assert found == NAMES, f"the probe made these copies: {found}"


def test_the_copies_of_the_new_kinds_change_one_field_each(monkeypatch, tmp_path):
    judge, _ = run_references(monkeypatch, tmp_path)

    def copies_of(session):
        priority, steps = REFERENCES[session]
        expected = {"priority": priority, "steps": steps}
        return [call["predicted"] for call in judge.calls
                if call["expected"] == expected and call["predicted"] != expected
                and not first_text(call["predicted"]).startswith("grade ")]

    def made(priority, steps):
        return {"priority": priority, "steps": steps}

    def same(found, wanted):
        key = lambda payload: json.dumps(payload, sort_keys=True)  # noqa: E731
        return sorted(found, key=key) == sorted(wanted, key=key)

    found = copies_of("judge-check-pair-01")
    assert same(found, [made("P2", [REPLY, NOTIFY]),  # priority
                        made("P1", [{**REPLY, "kind": "interrupt"}, NOTIFY]),  # kind_swap
                        made("P1", [REPLY])]), found  # dropped_step: the last step goes
    found = copies_of("judge-check-pair-03")
    assert same(found, [made("P2", [SNOOZE]),  # priority on a snooze reference
                        made("P1", [{**SNOOZE, "until_event": "turn_end"}]),  # until_event
                        made("P1", [{**SNOOZE, "kind": "dismiss"}])]), found  # kind_swap
    found = copies_of("judge-check-pair-04")
    assert same(found, [made("P1", [REPLY]),  # priority on a reference that is not an ask step
                        made("P3", [{**REPLY, "kind": "interrupt"}])]), found
    found = copies_of("judge-check-pair-02")  # an empty reference: the next priority, and one inserted step
    inserted = [payload for payload in found if payload["steps"]]
    assert made("P3", []) in found and len(found) == 2, found
    assert len(inserted) == 1 and inserted[0]["priority"] == "P2", inserted
    assert [step["kind"] for step in inserted[0]["steps"]] == ["notify"], inserted


def notes_pairs() -> list:
    return agreeing(5) + [scripted_pair(5)]


def stored_rows(monkeypatch, tmp_path) -> list:
    """Run once with a checkpoint on the pairs of `notes_pairs`. Return the rows."""
    judge = ScriptedJudge({"a": [0.9, 0.9], "b": [0.2, 0.2]})
    run_check(monkeypatch, tmp_path, notes_pairs(), judge, extra=("--checkpoint", str(tmp_path / "checkpoint.jsonl")))
    return read_rows(tmp_path / "checkpoint.jsonl")


def test_a_pair_row_holds_the_notes_of_each_repeat_in_the_order_of_the_scores(monkeypatch, tmp_path):
    rows = [row for row in stored_rows(monkeypatch, tmp_path) if "changed" not in row]
    assert rows[0]["notes"] == {"a": ["graded reply"] * 2, "b": ["graded reply"] * 2}, rows[0]
    assert rows[5]["notes"] == {"a": ["scripted a0", "scripted a1"], "b": ["scripted b0", "scripted b1"]}, rows[5]


def test_a_probe_row_holds_the_notes_of_the_base_call_and_of_the_copy_call(monkeypatch, tmp_path):
    rows = [row for row in stored_rows(monkeypatch, tmp_path) if "changed" in row]
    assert len(rows) == 12, f"12 probe rows expected: {len(rows)}"
    for row in rows:
        assert row["base_notes"] == "the payload matches the reference", row
        assert row["copy_notes"] == "a closed field differs", row


def test_a_row_with_no_notes_still_loads_and_makes_no_judge_call(monkeypatch, tmp_path):
    rows = stored_rows(monkeypatch, tmp_path)
    for row in rows:
        for name in ("notes", "base_notes", "copy_notes"):
            row.pop(name, None)
    write_rows(tmp_path / "checkpoint.jsonl", rows)
    judge = GradingJudge()
    code, printed = run_check(monkeypatch, tmp_path, notes_pairs(), judge,
                              extra=("--checkpoint", str(tmp_path / "checkpoint.jsonl")))
    assert judge.calls == [], f"a row with no notes was judged again: {len(judge.calls)} calls"
    assert "warning" not in printed.lower(), f"a row with no notes must load with no warning: {printed}"
    assert code == 0, code
