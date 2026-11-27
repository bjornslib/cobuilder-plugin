"""Slice 15 RED: `priority fixtures check` passes on a good set and fails with a reason.

Each test fails until the `fixtures check` command exists. The report pins the
contract: `fixtures ok` plus `sessions:` and `stops:` counts, one
`train <session>` or `holdout <session>` line for each session, and one
`stop <session> <number> <part>` line for each stop. Real paths given through
`--real-dir` must be Git-ignored.
"""
from __future__ import annotations

from fixtures_support import (
    PRIORITY_DEV,
    SESSION_IDS,
    STOPS_PER_SESSION,
    combined,
    make_labels,
    make_manifest,
    run_check,
    split_parts,
    stop_key,
    write_set,
)

REAL_DIR = PRIORITY_DEV / "fixtures" / "real"


def check_args(tmp_path, labels=None, manifest=None, real_dir=REAL_DIR):
    """Write a made-up set into a temp folder. Return the CLI args that check it."""
    manifest_path, labels_path = write_set(tmp_path, labels=labels, manifest=manifest)
    return ["--manifest", str(manifest_path), "--labels", str(labels_path),
            "--real-dir", str(real_dir)]


def test_fixtures_check_passes_on_a_good_made_up_set(tmp_path):
    args = check_args(tmp_path)
    first = run_check(*args)
    assert first.returncode == 0, combined(first)
    assert "fixtures ok" in first.stdout
    assert f"sessions: {len(SESSION_IDS)}" in first.stdout
    assert f"stops: {len(SESSION_IDS) * STOPS_PER_SESSION}" in first.stdout

    train, holdout, stop_part = split_parts(first.stdout)
    assert train | holdout == set(SESSION_IDS)
    assert train & holdout == set()
    assert len(holdout) >= 3
    for entry in make_manifest():
        part = "train" if entry["session"] in train else "holdout"
        for number in entry["stops"]:
            assert stop_part[(entry["session"], stop_key(number))] == part

    again = run_check(*args)
    assert again.returncode == 0, combined(again)
    assert split_parts(again.stdout)[:2] == (train, holdout)


def test_fixtures_check_fails_on_an_unconfirmed_label(tmp_path):
    labels = make_labels()
    labels["sessions"][SESSION_IDS[4]]["stops"][stop_key(3)].pop("confirmed_on")
    result = run_check(*check_args(tmp_path, labels=labels))
    assert result.returncode != 0
    text = combined(result)
    assert SESSION_IDS[4] in text
    assert stop_key(3) in text


def test_fixtures_check_fails_when_a_manifest_stop_has_no_label(tmp_path):
    labels = make_labels()
    labels["sessions"][SESSION_IDS[5]]["stops"].pop(stop_key(2))
    result = run_check(*check_args(tmp_path, labels=labels))
    assert result.returncode != 0
    text = combined(result)
    assert SESSION_IDS[5] in text
    assert stop_key(2) in text


def test_fixtures_check_fails_on_a_session_in_both_parts(tmp_path):
    labels = make_labels()
    labels["train"] = list(SESSION_IDS)
    labels["holdout"] = [SESSION_IDS[0], SESSION_IDS[1]]
    result = run_check(*check_args(tmp_path, labels=labels))
    assert result.returncode != 0
    assert SESSION_IDS[0] in combined(result)


def test_fixtures_check_fails_on_steps_over_the_three_step_limit(tmp_path):
    labels = make_labels()
    labels["sessions"][SESSION_IDS[6]]["stops"][stop_key(1)]["steps"] = [
        "reply", "continue", "snooze", "dismiss"]
    result = run_check(*check_args(tmp_path, labels=labels))
    assert result.returncode != 0
    text = combined(result)
    assert SESSION_IDS[6] in text
    assert stop_key(1) in text


def test_fixtures_check_fails_on_an_unknown_step_kind(tmp_path):
    labels = make_labels()
    labels["sessions"][SESSION_IDS[7]]["stops"][stop_key(4)]["steps"] = ["teleport"]
    result = run_check(*check_args(tmp_path, labels=labels))
    assert result.returncode != 0
    text = combined(result)
    assert SESSION_IDS[7] in text
    assert "teleport" in text


def test_fixtures_check_fails_when_a_real_path_is_not_git_ignored(tmp_path):
    real_dir = tmp_path / "real"
    real_dir.mkdir()
    (real_dir / "session.jsonl").write_text("{}\n")
    result = run_check(*check_args(tmp_path, real_dir=real_dir))
    assert result.returncode != 0
    assert "ignor" in combined(result).lower()
