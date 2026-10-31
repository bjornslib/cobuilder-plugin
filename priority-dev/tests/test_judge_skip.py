"""The judge default model resolves offline with a stub key.

Slice 20 removed the payload skip rule: a stop with no reference payload
no longer reaches the metric, so the skip marker and the skip note are gone.
"""
from __future__ import annotations

from fixtures_support import require


def test_judge_default_lm_resolves_with_a_stub_key(monkeypatch):
    config = require("priority.config")
    monkeypatch.setenv("NVIDIA_API_KEY", "sk-test-stub-key")
    api = require("priority.evaluation.judge")
    lm = api._default_lm()
    assert lm.model == "nvidia_nim/mistralai/mistral-large-4-1t-a52b"
