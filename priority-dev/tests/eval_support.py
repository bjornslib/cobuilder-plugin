"""Helpers for the eval command tests.

Everything here is made up. The brief sentences, the labels, and the
predictions below are synthetic filler. No test makes a model call and no
test reads real transcript text.
"""
from __future__ import annotations

import itertools
import json
import shutil
import sys
from pathlib import Path
from types import SimpleNamespace

from fixtures_support import (SESSION_IDS, make_labels, make_manifest,  # noqa: F401 (re-exported)
                              require, stop_key)
from probe_support import FIXTURES, PRIORITY_DEV  # noqa: F401 (re-exported)

if str(PRIORITY_DEV / "src") not in sys.path:
    sys.path.insert(0, str(PRIORITY_DEV / "src"))


def metric_api():
    """The metric module, or an assertion failure when it does not exist yet."""
    return require("priority.evaluation.metric")


class StubPrediction(dict):
    """A made-up program output. It reads by key and by attribute, as a dspy Prediction does."""

    def __getattr__(self, name):
        try:
            return self[name]
        except KeyError:
            raise AttributeError(name) from None


def make_prediction(label: dict, **overrides) -> StubPrediction:
    """One program output with the label status and priority and no step, unless an override changes it."""
    prediction = StubPrediction(status=label["status"], needs_human=label["needs_human"],
                                priority=label.get("priority", "P3"), steps=[], abstain=None)
    prediction.update(overrides)
    return prediction


def with_payloads(labels: dict, payloads: list) -> dict:
    """The labels document with one reference payload list on every stop."""
    for per_session in labels["sessions"].values():
        for label in per_session["stops"].values():
            label["payloads"] = json.loads(json.dumps(payloads))
    return labels


def write_eval_world(tmp_path: Path, payloads: list | None = None):
    """Write a made-up manifest, labels, and one transcript per session.

    Return the manifest path, the labels path, the transcripts dir, and the
    expected split parts. The transcripts copy a made-up fixture, so brief
    building stays offline. Every stop label carries the reference payload
    list `payloads` (default `[]`, "no payload due"), so no stop is excluded.
    """
    from priority.evaluation.split import split

    manifest_path = tmp_path / "set-manifest.json"
    labels_path = tmp_path / "labels-confirmed.json"
    transcripts = tmp_path / "real"
    transcripts.mkdir(exist_ok=True)
    manifest_path.write_text(json.dumps(make_manifest(), indent=2) + "\n")
    labels = with_payloads(make_labels(), [] if payloads is None else payloads)
    labels_path.write_text(json.dumps(labels, indent=2) + "\n")
    source = FIXTURES / "waiting-question.jsonl"
    for session_id in SESSION_IDS:
        shutil.copy(source, transcripts / f"{session_id}.jsonl")
    parts = split(list(SESSION_IDS))
    return manifest_path, labels_path, transcripts, parts


class StubInterpreter:
    """Stand in for the interpreter program. It returns one prepared output
    per call, in order, with no model call. It loads a saved program file
    as the real program does, and it holds the demos of that file."""

    def __init__(self, predictions) -> None:
        self._predictions = itertools.cycle(predictions)
        self.propose = SimpleNamespace(demos=[])

    def __call__(self, *args, **kwargs):
        return next(self._predictions)

    def named_predictors(self):
        return [("propose", self.propose)]

    def load(self, path) -> None:
        state = json.loads(Path(path).read_text())
        self.propose.demos = list((state.get("propose") or {}).get("demos") or [])


def stub_predictions_for(manifest_path: Path, labels_path: Path) -> list[StubPrediction]:
    """One program output per manifest stop, in manifest order, with no step."""
    manifest = json.loads(manifest_path.read_text())
    labels = json.loads(labels_path.read_text())["sessions"]
    out = []
    for entry in manifest:
        for number in entry["stops"]:
            out.append(make_prediction(labels[entry["session"]]["stops"][stop_key(number)]))
    return out
