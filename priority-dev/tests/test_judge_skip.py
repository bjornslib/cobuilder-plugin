"""The payload skip rule: no expected payloads means no judge call.

When the example carries no `expected_payloads`, the metric scores the
legacy parts only and names the skipped payload part in the feedback.
"""
from __future__ import annotations

import pytest

from eval_support import BRIEF_TEXT, make_example, make_prediction, score_of
from fixtures_support import make_label, require


def test_no_expected_payloads_means_no_judge_call(monkeypatch):
    api = require("priority.evaluation.judge")
    calls = []

    def stub(brief_text, predicted, expected):
        calls.append((brief_text, predicted, expected))
        return (0.75, ["payload: the questions match."])

    monkeypatch.setattr(api, "judge", stub)
    label = make_label(1)
    example = make_example(label)
    assert "expected_payloads" not in example
    prediction = make_prediction(label)
    value, feedback = score_of(example, prediction)
    assert calls == [], "the metric called the judge with no payload labels"
    assert value == pytest.approx(1.0)
    assert "payload" in feedback.lower()
    assert "skip" in feedback.lower()


def test_skip_note_keeps_the_legacy_score_on_a_mismatch(monkeypatch):
    api = require("priority.evaluation.judge")
    calls = []

    def stub(brief_text, predicted, expected):
        calls.append((brief_text, predicted, expected))
        return (1.0, ["payload: all match."])

    monkeypatch.setattr(api, "judge", stub)
    label = make_label(1)
    example = make_example(label)
    prediction = make_prediction(label, status="done")
    value, feedback = score_of(example, prediction)
    assert calls == [], "the metric called the judge with no payload labels"
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
