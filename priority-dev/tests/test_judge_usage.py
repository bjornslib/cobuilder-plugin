"""Slice 20 RED: the judge meters its calls and tokens.

The contract. `priority.evaluation.judge` holds `USAGE`, a dict with
`calls`, `prompt_tokens`, and `completion_tokens`, plus `reset_usage()` and
`usage_line()`. Each judge model call adds 1 call and the tokens of the
model's last history entry `usage`, when present. The stub path adds
nothing. The model here is a DummyLM, so no test makes a live call.
"""
from __future__ import annotations

import dspy
from dspy.utils import DummyLM

from judge_ref_support import STUB_NOTE, reply_step, require

REPLY = {"score": 0.7, "notes": ["payload: the made-up parts match."]}


class MeteredLM(DummyLM):
    """A DummyLM whose history entries carry fixed token counts, or no usage."""

    def __init__(self, replies, usage):
        super().__init__(replies)
        self._usage = usage

    def __call__(self, *args, **kwargs):
        out = super().__call__(*args, **kwargs)
        if self._usage is None:
            self.history[-1].pop("usage", None)
        else:
            self.history[-1]["usage"] = dict(self._usage)
        return out


def judge_api():
    """The judge module with its usage meter, or an assertion failure."""
    api = require("priority.evaluation.judge")
    for name in ("USAGE", "reset_usage", "usage_line"):
        assert hasattr(api, name), f"priority.evaluation.judge has no {name}"
    return api


def judge_once(api, lm):
    """One judge call on made-up payloads through the given model."""
    return api.judge("A made-up brief.", [reply_step()], [reply_step()], lm=lm)


def test_usage_starts_from_zero_after_a_reset():
    api = judge_api()
    api.reset_usage()
    assert api.USAGE == {"calls": 0, "prompt_tokens": 0, "completion_tokens": 0}
    assert api.usage_line() == "judge calls: 0 prompt_tokens: 0 completion_tokens: 0"


def test_each_judge_call_adds_one_call_and_its_tokens():
    api = judge_api()
    api.reset_usage()
    lm = MeteredLM([REPLY, REPLY], {"prompt_tokens": 120, "completion_tokens": 30})
    for _ in range(2):
        score, _ = judge_once(api, lm)
        assert score == 0.7, "the metered model did not answer the judge"
    assert api.USAGE == {"calls": 2, "prompt_tokens": 240, "completion_tokens": 60}
    assert api.usage_line() == "judge calls: 2 prompt_tokens: 240 completion_tokens: 60"


def test_a_call_with_no_usage_entry_adds_the_call_only():
    api = judge_api()
    api.reset_usage()
    judge_once(api, MeteredLM([REPLY], None))
    assert api.USAGE == {"calls": 1, "prompt_tokens": 0, "completion_tokens": 0}


def test_the_stub_path_adds_nothing(monkeypatch):
    api = judge_api()
    api.reset_usage()

    def no_model():
        raise RuntimeError("no judge model in the made-up world")

    monkeypatch.setattr(api, "_default_lm", no_model)
    with dspy.context(lm=None):
        score, notes = api.judge("A made-up brief.", [reply_step()], [reply_step()])
    assert (score, notes) == (0.0, [STUB_NOTE])
    assert api.USAGE == {"calls": 0, "prompt_tokens": 0, "completion_tokens": 0}
