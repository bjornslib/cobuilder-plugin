"""The adapter option of the Interpreter and the keys of each call row (slice 7, one call since slice 21).

The contract is in the docstring of `replay_support.py`. The tests here use DummyLM and never make a live call.
1. The adapter option: the default stays ChatAdapter with the fallback off, `json` runs JSONAdapter
2. Each call row has `adapter`, `seconds`, and `valid`
"""
from __future__ import annotations

import inspect
import time

import pytest

from digest_support import digest_reply, run_digest
from interpret_support import (FailingLM, RateLimited, dspy, dummy, interpret, interpreter_api, no_live_call,  # noqa: F401
                               propose, read_calls, step)

try:
    from dspy.utils import DummyLM
except ImportError:
    DummyLM = object

REPLIES = [propose([step("reply")])]


class SpyLM(DummyLM):
    """A DummyLM that records the adapter that DSPy has set at each call."""

    def __init__(self, replies, **kwargs):
        super().__init__(replies, **kwargs)
        self.adapters = []

    def forward(self, prompt=None, messages=None, **kwargs):
        self.adapters.append(dspy.settings.adapter)
        return super().forward(prompt=prompt, messages=messages, **kwargs)


class SleepyLM(DummyLM):
    def forward(self, prompt=None, messages=None, **kwargs):
        time.sleep(0.05)
        return super().forward(prompt=prompt, messages=messages, **kwargs)


def with_adapter(lm, adapter, **kwargs):
    """Run the Interpreter with the adapter option. A missing option fails on an assertion."""
    cls = interpreter_api().Interpreter
    assert "adapter" in inspect.signature(cls.__init__).parameters, "Interpreter has no adapter option"
    return interpret(lm, adapter=adapter, **kwargs)


def dummy_json(replies):
    return DummyLM(replies, adapter=dspy.JSONAdapter())


def reason_of(out):
    """The abstain reason of a forward result, or an assertion failure when it is no Prediction."""
    assert isinstance(out, dspy.Prediction), f"forward returned {type(out).__name__}, not a dspy.Prediction"
    return (out.abstain or {}).get("reason")


# ---- 1. the adapter option ---------------------------------------------------

def test_the_adapter_option_defaults_to_chat():
    parameter = inspect.signature(interpreter_api().Interpreter.__init__).parameters.get("adapter")
    assert parameter is not None, "Interpreter has no adapter option"
    assert parameter.default == "chat"
    assert parameter.kind is inspect.Parameter.KEYWORD_ONLY


def test_the_default_run_uses_chat_adapter_with_the_fallback_off():
    lm = SpyLM(REPLIES)
    assert reason_of(interpret(lm)) is None
    assert len(lm.adapters) == 1
    assert type(lm.adapters[0]) is dspy.ChatAdapter
    assert lm.adapters[0].use_json_adapter_fallback is False


def test_chat_by_name_is_the_same_as_the_default():
    lm = SpyLM(REPLIES)
    assert reason_of(with_adapter(lm, "chat")) is None
    assert all(type(a) is dspy.ChatAdapter and a.use_json_adapter_fallback is False for a in lm.adapters)


def test_json_runs_the_json_adapter_for_the_one_call():
    lm = SpyLM(REPLIES, adapter=dspy.JSONAdapter())
    result = with_adapter(lm, "json")
    assert reason_of(result) is None, result.abstain
    assert len(result.steps) == 1
    assert len(lm.adapters) == 1 and type(lm.adapters[0]) is dspy.JSONAdapter


def test_json_reads_json_replies_only():
    """Chat-format replies do not parse as JSON, so the run is an Abstain. This shows that the adapter really changed."""
    assert reason_of(with_adapter(dummy(REPLIES), "json")) == "invalid_output"


def test_chat_does_not_read_json_replies():
    assert reason_of(with_adapter(dummy_json(REPLIES), "chat")) == "invalid_output"


@pytest.mark.parametrize("name", ["xml", "JSON", "", None])
def test_an_unknown_adapter_raises_a_value_error_that_names_it(name):
    cls = interpreter_api().Interpreter
    assert "adapter" in inspect.signature(cls.__init__).parameters, "Interpreter has no adapter option"
    with pytest.raises(ValueError) as error:
        cls(lm=dummy(REPLIES), adapter=name)
    assert repr(name) in str(error.value) or str(name) in str(error.value)


# ---- 2. the keys of a call row -----------------------------------------------

def test_the_row_has_the_adapter_the_seconds_and_valid(tmp_path):
    assert reason_of(interpret(dummy(REPLIES), log_dir=tmp_path)) is None
    [row] = read_calls(tmp_path)
    assert row.get("adapter") == "chat", row
    assert isinstance(row.get("seconds"), float) and 0 <= row["seconds"] < 5, row
    assert row.get("valid") is True, row


def test_rows_name_the_json_adapter(tmp_path):
    with_adapter(dummy_json(REPLIES), "json", log_dir=tmp_path)
    assert {r.get("adapter") for r in read_calls(tmp_path)} == {"json"}


def test_seconds_is_the_time_of_the_call(tmp_path):
    interpret(SleepyLM(REPLIES), log_dir=tmp_path)
    [row] = read_calls(tmp_path)
    assert 0.05 <= row.get("seconds", -1) < 2, row


def test_a_reply_that_does_not_parse_is_not_valid(tmp_path):
    assert reason_of(interpret(dummy([propose(steps="this is not JSON")]), log_dir=tmp_path)) == "invalid_output"
    assert [r.get("valid") for r in read_calls(tmp_path)] == [False]


def test_a_reply_that_fails_validation_is_not_valid(tmp_path):
    assert reason_of(interpret(dummy([propose([{"kind": "launch_missile"}])]), log_dir=tmp_path)) == "invalid_output"
    assert [r.get("valid") for r in read_calls(tmp_path)] == [False]


def test_a_call_that_raised_is_not_valid(tmp_path):
    lm = FailingLM(REPLIES, RateLimited("429 Too Many Requests"), fail_at=1)
    assert reason_of(interpret(lm, log_dir=tmp_path)) == "model_error"
    [row] = read_calls(tmp_path)
    assert row.get("valid") is False
    assert "429" in row["error"]
    assert isinstance(row.get("seconds"), float)
    assert row.get("adapter") == "chat"


def test_the_digest_row_has_the_new_keys(tmp_path):
    run_digest(dummy([digest_reply()]), log_dir=tmp_path)
    [row] = read_calls(tmp_path)
    assert row["stage"] == "digest"
    assert row.get("adapter") == "chat"
    assert isinstance(row.get("seconds"), float)
    assert row.get("valid") is True


def test_a_digest_that_does_not_parse_is_not_valid(tmp_path):
    run_digest(dummy([{"digest": "this is not JSON"}]), log_dir=tmp_path)
    [row] = read_calls(tmp_path)
    assert row.get("valid") is False
    assert row.get("stage") == "digest"
