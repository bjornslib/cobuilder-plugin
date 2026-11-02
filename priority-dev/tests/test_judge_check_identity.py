"""A checkpoint row of another judge must not be reused by `priority judge-check`.

The contract, on top of `test_judge_check_progress.py`:

1. Each pair row and probe row holds the judge identity of the run that wrote
   it, built from the judge model, the endpoint, the temperature, the token
   cap, and a SHA-256 of the rubric. It never reads a key.
2. On resume with the same judge, the rows are reused: no judge call, no
   warning.
3. On resume after a change of the model, the token cap, the rubric, or the
   temperature, every row is ignored with one warning that names the changed
   part, and every unit is judged again.
4. A row without a `judge` field (an old checkpoint) is ignored with the same
   warning.
5. The identity holds a `scoring` version string. A row without it, or with another one, was scored under
   other rules (the old code pins). It is ignored with a warning that names `scoring`.

The judge is a stub and every file is made up, so no test makes a model call
and no test reads a key.
"""
from __future__ import annotations

import json

import pytest
from judge_check_progress_support import (ALL_CALLS, PAIRS, read_rows, report, run_cli, warnings,
                                          write_rows)
from judge_check_support import GradingJudge

IDENTITY_PARTS = ("model", "base_url", "temperature", "max_tokens", "rubric", "scoring")


def checkpoint_args(tmp_path) -> tuple:
    return ("--checkpoint", str(tmp_path / "checkpoint.jsonl"))


def fill_checkpoint(monkeypatch, tmp_path, pairs=PAIRS) -> list:
    """Run once with a checkpoint, so the file holds one row for each unit. Return the rows."""
    run_cli(monkeypatch, tmp_path, pairs, GradingJudge(), extra=checkpoint_args(tmp_path))
    rows = read_rows(tmp_path / "checkpoint.jsonl")
    assert rows, "the first run must write checkpoint rows"
    return rows


def identity_of(rows: list) -> dict:
    """The one judge identity that every row holds."""
    names = {json.dumps(row.get("judge"), sort_keys=True) for row in rows}
    assert len(names) == 1, f"the rows hold {len(names)} judge identities: {names}"
    identity = json.loads(names.pop())
    assert identity is not None, "every row must hold a judge identity"
    return identity


def test_each_row_holds_the_judge_identity_without_a_key(monkeypatch, tmp_path):
    rows = fill_checkpoint(monkeypatch, tmp_path)
    identity = identity_of(rows)
    assert sorted(identity) == sorted(IDENTITY_PARTS), f"the identity holds the wrong parts: {identity}"
    for part in IDENTITY_PARTS:
        assert identity[part] is not None, f"identity part {part} is missing"
    text = json.dumps(rows)
    assert "key" not in text.lower(), "a checkpoint row must never hold a key"


def test_a_resume_with_the_same_judge_reuses_the_rows(monkeypatch, tmp_path):
    fill_checkpoint(monkeypatch, tmp_path)
    judge = GradingJudge()
    result = run_cli(monkeypatch, tmp_path, PAIRS, judge, extra=checkpoint_args(tmp_path))
    assert judge.calls == [], f"the same judge must reuse every row: {len(judge.calls)} calls"
    assert warnings(result) == [], f"the same judge must not warn: {warnings(result)}"
    assert result.code == 0, result.code


@pytest.mark.parametrize("part,env,value", [("model", "JUDGE_MODEL", "other-judge-model"),
                                            ("base_url", "JUDGE_BASE_URL", "https://judge.example/v2"),
                                            ("temperature", "JUDGE_PROVIDER", "inception")])
def test_a_changed_judge_part_makes_the_run_judge_everything_again(monkeypatch, tmp_path, part, env, value):
    fill_checkpoint(monkeypatch, tmp_path)
    monkeypatch.setenv(env, value)
    judge = GradingJudge()
    result = run_cli(monkeypatch, tmp_path, PAIRS, judge, extra=checkpoint_args(tmp_path))
    assert len(judge.calls) == ALL_CALLS, f"a changed {part} must judge everything again: {warnings(result)}"
    assert report(result.text), report(result.text)
    names = warnings(result)
    assert any(part in line for line in names), \
        f"a changed {part} must name it in a warning: {names}"


def test_a_changed_token_cap_makes_the_run_judge_everything_again(monkeypatch, tmp_path):
    from priority.evaluation import judge as judge_module

    fill_checkpoint(monkeypatch, tmp_path)
    monkeypatch.setattr(judge_module, "JUDGE_MAX_TOKENS", 4000)
    judge = GradingJudge()
    result = run_cli(monkeypatch, tmp_path, PAIRS, judge, extra=checkpoint_args(tmp_path))
    assert len(judge.calls) == ALL_CALLS, "a changed token cap must judge everything again"
    names = warnings(result)
    assert any("max_tokens" in line for line in names), \
        f"a changed token cap must name max_tokens in a warning: {names}"


def test_a_changed_rubric_makes_the_run_judge_everything_again(monkeypatch, tmp_path):
    from priority.evaluation import judge as judge_module

    fill_checkpoint(monkeypatch, tmp_path)
    monkeypatch.setattr(judge_module, "RUBRIC", judge_module.RUBRIC + " Grade strictly.")
    judge = GradingJudge()
    result = run_cli(monkeypatch, tmp_path, PAIRS, judge, extra=checkpoint_args(tmp_path))
    assert len(judge.calls) == ALL_CALLS, "a changed rubric must judge everything again"
    names = warnings(result)
    assert any("rubric" in line for line in names), \
        f"a changed rubric must name rubric in a warning: {names}"


def test_a_row_without_an_identity_is_ignored_with_a_warning(monkeypatch, tmp_path):
    fill_checkpoint(monkeypatch, tmp_path)
    rows = read_rows(tmp_path / "checkpoint.jsonl")
    for row in rows:
        row.pop("judge", None)
    write_rows(tmp_path / "checkpoint.jsonl", rows)
    judge = GradingJudge()
    result = run_cli(monkeypatch, tmp_path, PAIRS, judge, extra=checkpoint_args(tmp_path))
    assert len(judge.calls) == ALL_CALLS, "a row without an identity must be judged again"
    names = warnings(result)
    assert any("no judge identity" in line for line in names), \
        f"a row without an identity must warn about it: {names}"


def test_the_identity_holds_one_fixed_scoring_version():
    from priority.evaluation import judge as judge_module

    first, second = judge_module.judge_identity(), judge_module.judge_identity()
    assert isinstance(first.get("scoring"), str) and first["scoring"], f"the identity has no scoring version: {first}"
    assert first["scoring"] == second["scoring"], "the scoring version must be a fixed string, not a clock or a count"
    assert "key" not in first["scoring"].lower()


def test_a_row_made_under_the_old_pins_is_ignored_with_a_warning_that_names_scoring(monkeypatch, tmp_path):
    fill_checkpoint(monkeypatch, tmp_path)
    rows = read_rows(tmp_path / "checkpoint.jsonl")
    for row in rows:
        row["judge"].pop("scoring", None)  # an old row has every other identity part, and no scoring part
    write_rows(tmp_path / "checkpoint.jsonl", rows)
    judge = GradingJudge()
    result = run_cli(monkeypatch, tmp_path, PAIRS, judge, extra=checkpoint_args(tmp_path))
    assert len(judge.calls) == ALL_CALLS, "a row made under the old pins must be judged again"
    names = warnings(result)
    assert any("scoring" in line for line in names), f"the warning must name scoring: {names}"
    assert not any("no judge identity" in line for line in names), f"the old row did hold an identity: {names}"


def test_a_row_made_under_another_scoring_version_is_ignored_with_a_warning(monkeypatch, tmp_path):
    fill_checkpoint(monkeypatch, tmp_path)
    rows = read_rows(tmp_path / "checkpoint.jsonl")
    for row in rows:
        row["judge"]["scoring"] = "pinned-v0"
    write_rows(tmp_path / "checkpoint.jsonl", rows)
    judge = GradingJudge()
    result = run_cli(monkeypatch, tmp_path, PAIRS, judge, extra=checkpoint_args(tmp_path))
    assert len(judge.calls) == ALL_CALLS, "a row of another scoring version must be judged again"
    assert any("scoring" in line for line in warnings(result)), f"the warning must name scoring: {warnings(result)}"
