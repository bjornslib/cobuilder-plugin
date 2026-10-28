"""Helpers for the slice 16 RED tests: the metric and the eval command.

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

from fixtures_support import (SESSION_IDS, make_label, make_labels,
                              make_manifest, require, stop_key)
from probe_support import FIXTURES, PRIORITY_DEV  # noqa: F401 (re-exported)

if str(PRIORITY_DEV / "src") not in sys.path:
    sys.path.insert(0, str(PRIORITY_DEV / "src"))

# The metric contract: facts 0.5 (each of the five fields 0.10),
# step kinds 0.4 (first step 0.2, whole ordered list 0.2),
# validity 0.1 (no Abstain from a model fault). Quotes are not scored.
FACT_FIELDS = ("status", "needs_human", "answer_class", "risk", "priority_hint")
FACTS_WEIGHT = 0.5
EACH_FACT_SHARE = 0.10
FIRST_STEP_SHARE = 0.2
STEP_LIST_SHARE = 0.2
VALIDITY_SHARE = 0.1

BRIEF_TEXT = ("The blue widget trial ended in the north shed. "
              "The tally sheet lists four green valves. "
              "Only the human can pick the paint colour.")
QUOTE_IN_BRIEF = "four green valves"
QUOTE_NOT_IN_BRIEF = "words that never appear in the brief"

WRONG_FACTS = {"status": "done", "needs_human": False,
               "answer_class": "none", "risk": "high",
               "priority_hint": "never"}


def metric_api():
    """The metric module, or an assertion failure when it does not exist yet."""
    return require("priority.evaluation.metric")


def flatten_steps(steps: list) -> list[str]:
    """Take the first accepted kind at each label position."""
    return [entry[0] if isinstance(entry, list) else entry for entry in steps]


def make_example(label: dict, brief_text: str = BRIEF_TEXT) -> dict:
    """One metric example: the five fact fields, the label steps, and the brief text."""
    return {field: label[field] for field in FACT_FIELDS} | {
        "steps": label["steps"],
        "ambiguous": label["ambiguous"],
        "brief_text": brief_text,
    }


def make_prediction(label: dict, quotes=(QUOTE_IN_BRIEF,), abstain=None,
                    **overrides) -> dict:
    """One metric prediction that matches the label, unless an override changes it."""
    prediction = {field: label[field] for field in FACT_FIELDS} | {
        "steps": flatten_steps(label["steps"]),
        "quotes": list(quotes),
        "abstain": abstain,
    }
    prediction.update(overrides)
    return prediction


def as_namespace(mapping: dict) -> SimpleNamespace:
    """The same inputs as an attribute-style object, for the duck-typing pin."""
    return SimpleNamespace(**mapping)


def score_of(example: dict, prediction: dict, *gepa_args):
    """Run the metric. Extra args go through the five-argument GEPA call."""
    return metric_api().score(example, prediction, *gepa_args)


def write_eval_world(tmp_path: Path):
    """Write a made-up manifest, labels, and one transcript per session.

    Return the manifest path, the labels path, the transcripts dir, and the
    expected split parts. The transcripts copy a made-up fixture, so brief
    building stays offline.
    """
    from priority.evaluation.split import split

    manifest_path = tmp_path / "set-manifest.json"
    labels_path = tmp_path / "labels-confirmed.json"
    transcripts = tmp_path / "real"
    transcripts.mkdir(exist_ok=True)
    manifest_path.write_text(json.dumps(make_manifest(), indent=2) + "\n")
    labels_path.write_text(json.dumps(make_labels(), indent=2) + "\n")
    source = FIXTURES / "waiting-question.jsonl"
    for session_id in SESSION_IDS:
        shutil.copy(source, transcripts / f"{session_id}.jsonl")
    parts = split(list(SESSION_IDS))
    return manifest_path, labels_path, transcripts, parts


class StubInterpreter:
    """Stand in for the chain interpreter. It returns one perfect prediction
    per call, drawn from the labels in manifest order, with no model call."""

    def __init__(self, predictions) -> None:
        self._predictions = itertools.cycle(predictions)

    def __call__(self, brief):
        return next(self._predictions)


def stub_predictions_for(manifest_path: Path, labels_path: Path) -> list[dict]:
    """One perfect prediction per manifest stop, in manifest order."""
    manifest = json.loads(manifest_path.read_text())
    labels = json.loads(labels_path.read_text())["sessions"]
    out = []
    for entry in manifest:
        for number in entry["stops"]:
            label = labels[entry["session"]]["stops"][stop_key(number)]
            out.append(make_prediction(label, quotes=[]))
    return out
