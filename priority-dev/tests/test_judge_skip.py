"""The payload skip rule: no expected payloads still goes through the judge.

When the example carries no `expected_payloads`, the metric calls the judge
with facts and steps against their labels and an explicit skipped-payload
marker, and the feedback names the skipped payload part.
"""
from __future__ import annotations

import pytest

from eval_support import BRIEF_TEXT, FACT_FIELDS, make_example, make_prediction, score_of
from fixtures_support import make_label, require


def test_no_expected_payloads_still_calls_the_judge_with_skip_marker(monkeypatch):
    api = require("priority.evaluation.judge")
    metric = require("priority.evaluation.metric")
    calls = []

    def stub(brief_text, predicted, expected):
        calls.append({"brief_text": brief_text, "predicted": predicted,
                      "expected": expected})
        return (1.0, ["facts: all facts match.",
                       "steps: the kinds match.",
                       "payload: skipped (no expected payload labels)."])

    monkeypatch.setattr(api, "judge", stub)
    label = make_label(1)
    example = make_example(label)
    assert "expected_payloads" not in example
    prediction = make_prediction(label)
    value, feedback = score_of(example, prediction)
    assert len(calls) == 1, "the metric skipped the judge with no payload labels"
    assert calls[0]["brief_text"] == BRIEF_TEXT
    assert calls[0]["predicted"]["facts"] == {field: label[field] for field in FACT_FIELDS}
    assert calls[0]["predicted"]["steps"] == prediction["steps"]
    assert calls[0]["predicted"]["payload_skipped"] is True
    assert calls[0]["expected"]["facts"] == {field: label[field] for field in FACT_FIELDS}
    assert calls[0]["expected"]["steps"] == label["steps"]
    assert calls[0]["expected"]["payloads"] == metric.SKIPPED_PAYLOADS
    assert calls[0]["expected"]["payload_skipped"] is True
    assert value == pytest.approx(1.0)
    assert "payload" in feedback.lower()
    assert "skip" in feedback.lower()


def test_skip_note_keeps_facts_and_steps_before_the_judge(monkeypatch):
    api = require("priority.evaluation.judge")
    calls = []

    def stub(brief_text, predicted, expected):
        calls.append({"brief_text": brief_text, "predicted": predicted,
                      "expected": expected})
        return (0.9, ["fact status: predicted 'done', label 'continuing'.",
                      "payload: skipped (no expected payload labels)."])

    monkeypatch.setattr(api, "judge", stub)
    label = make_label(1)
    example = make_example(label)
    prediction = make_prediction(label, status="done")
    value, feedback = score_of(example, prediction)
    assert len(calls) == 1, "the metric skipped the judge with no payload labels"
    assert calls[0]["predicted"]["facts"]["status"] == "done"
    assert calls[0]["expected"]["facts"]["status"] == label["status"]
    assert value == pytest.approx(0.9)
    assert "status" in feedback
    assert "skip" in feedback.lower()


def test_skip_note_stays_with_a_named_predictor(monkeypatch):
    api = require("priority.evaluation.judge")
    monkeypatch.setattr(api, "judge", lambda *a, **k: (1.0, ["payload: all match."]))
    metric = require("priority.evaluation.metric")
    label = make_label(1)
    example = make_example(label)
    prediction = make_prediction(label)
    plain_value, _ = score_of(example, prediction)
    value, feedback = score_of(example, prediction, None, "pick", None)
    assert value == pytest.approx(plain_value)
    assert feedback.startswith("predictor pick:")
    assert "skip" in feedback.lower()
    assert "payload" in feedback.lower()
    assert metric.PAYLOAD_SKIP_NOTE in feedback


def test_judge_default_lm_resolves_with_a_stub_key(monkeypatch):
    config = require("priority.config")
    monkeypatch.setattr(config, "load_key", lambda: "sk-test-stub-key")
    api = require("priority.evaluation.judge")
    lm = api._default_lm()
    assert lm.model == "openai/mercury-3"
