"""Slice 15 RED: the label loader reads the confirmed shape and rejects bad stops.

Each test fails until `priority.evaluation.labels` exists with `load_labels`.
"""
from __future__ import annotations

import pytest

from fixtures_support import (
    LABEL_FIELDS,
    SESSION_IDS,
    STOPS_PER_SESSION,
    labels_api,
    make_labels,
    stop_key,
    write_set,
)


def load_labels_of(labels: dict, tmp_path):
    """Write the labels document next to a matching manifest, and load it."""
    _, labels_path = write_set(tmp_path, labels=labels)
    return labels_api().load_labels(labels_path)


def test_loader_reads_labels_in_the_confirmed_shape(tmp_path):
    stops = load_labels_of(make_labels(), tmp_path)
    flat = [(sid, key) for sid, per_session in stops.items() for key in per_session]
    assert len(flat) == len(SESSION_IDS) * STOPS_PER_SESSION
    assert set(stops) == set(SESSION_IDS)
    for sid, per_session in stops.items():
        assert set(per_session) == {stop_key(n) for n in range(1, STOPS_PER_SESSION + 1)}, sid
        for key, label in per_session.items():
            assert set(label) == set(LABEL_FIELDS), (sid, key)


def test_loader_rejects_a_stop_missing_confirmed_by(tmp_path):
    labels = make_labels()
    labels["sessions"][SESSION_IDS[0]]["stops"][stop_key(2)].pop("confirmed_by")
    with pytest.raises(ValueError) as excinfo:
        load_labels_of(labels, tmp_path)
    message = str(excinfo.value)
    assert "confirmed_by" in message
    assert SESSION_IDS[0] in message
    assert stop_key(2) in message


def test_loader_rejects_a_stop_missing_confirmed_on(tmp_path):
    labels = make_labels()
    labels["sessions"][SESSION_IDS[3]]["stops"][stop_key(4)].pop("confirmed_on")
    with pytest.raises(ValueError) as excinfo:
        load_labels_of(labels, tmp_path)
    message = str(excinfo.value)
    assert "confirmed_on" in message
    assert SESSION_IDS[3] in message
    assert stop_key(4) in message


def test_loader_rejects_an_unknown_step_kind(tmp_path):
    labels = make_labels()
    labels["sessions"][SESSION_IDS[1]]["stops"][stop_key(1)]["steps"] = ["teleport"]
    with pytest.raises(ValueError) as excinfo:
        load_labels_of(labels, tmp_path)
    message = str(excinfo.value)
    assert "teleport" in message
    assert SESSION_IDS[1] in message
    assert stop_key(1) in message


def test_loader_rejects_steps_over_the_three_step_limit(tmp_path):
    labels = make_labels()
    labels["sessions"][SESSION_IDS[2]]["stops"][stop_key(5)]["steps"] = [
        "reply", "continue", "snooze", "dismiss"]
    with pytest.raises(ValueError) as excinfo:
        load_labels_of(labels, tmp_path)
    message = str(excinfo.value)
    assert SESSION_IDS[2] in message
    assert stop_key(5) in message
