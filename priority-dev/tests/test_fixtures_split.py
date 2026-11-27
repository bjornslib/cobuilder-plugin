"""Slice 15 RED: the split is by session, with no overlap and a stable held-out part.

Each test fails until `priority.evaluation.split` exists with `split`.
"""
from __future__ import annotations

from fixtures_support import SESSION_IDS, STOPS_PER_SESSION, make_manifest, split_api


def run_split(session_ids=None):
    """Split the made-up session ids. Return the mapping with train and holdout lists."""
    return split_api().split(list(SESSION_IDS if session_ids is None else session_ids))


def test_split_covers_every_session_with_no_overlap():
    out = run_split()
    train, holdout = set(out["train"]), set(out["holdout"])
    assert train | holdout == set(SESSION_IDS)
    assert train & holdout == set()


def test_split_holds_out_at_least_three_sessions():
    out = run_split()
    assert len(set(out["holdout"])) >= 3
    assert len(set(out["train"])) >= 1


def test_split_is_stable_across_runs_and_input_order():
    first = run_split()
    again = run_split()
    assert first == again
    assert set(run_split(list(reversed(SESSION_IDS)))["train"]) == set(first["train"])
    assert set(run_split(list(reversed(SESSION_IDS)))["holdout"]) == set(first["holdout"])


def test_split_keeps_every_stop_in_its_session_part():
    out = run_split()
    part_of = {sid: "train" for sid in out["train"]}
    part_of.update({sid: "holdout" for sid in out["holdout"]})
    stop_parts = {}
    for entry in make_manifest():
        for number in entry["stops"]:
            stop_parts[(entry["session"], number)] = part_of[entry["session"]]
    assert len(stop_parts) == len(SESSION_IDS) * STOPS_PER_SESSION
    by_session = {}
    for (session_id, _), part in stop_parts.items():
        by_session.setdefault(session_id, set()).add(part)
    assert all(parts == {part_of[sid]} for sid, parts in by_session.items())
