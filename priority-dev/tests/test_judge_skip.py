"""The judge default model resolves offline with a stub key.

Slice 20 removed the payload skip rule: a stop with no reference payload
no longer reaches the metric, so the skip marker and the skip note are gone.
"""
from __future__ import annotations

from fixtures_support import require


def test_judge_default_lm_resolves_with_a_stub_key(monkeypatch):
    config = require("priority.config")
    monkeypatch.setattr(config, "load_key", lambda: "sk-test-stub-key")
    api = require("priority.evaluation.judge")
    lm = api._default_lm()
    assert lm.model == "openai/mercury-3"
