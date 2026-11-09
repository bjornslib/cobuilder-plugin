"""Each calls.jsonl row carries the finish reason and the token counts of its model call."""
import json

import dspy

from priority.interpreter.calls import CallRecorder, guarded
from priority.interpreter.models import Abstain

REPLY = "[[ ## answer ## ]]\nOn Friday\n\n[[ ## completed ## ]]"
USAGE = {"prompt_tokens": 11, "completion_tokens": 7, "total_tokens": 18,
         "completion_tokens_details": {"reasoning_tokens": 4}}


class Node(dict):
    """A response node. It answers key and attribute access, as a provider response object does."""

    def __getattr__(self, name):
        try:
            return self[name]
        except KeyError as error:
            raise AttributeError(name) from error


def node(value):
    if isinstance(value, dict):
        return Node({key: node(item) for key, item in value.items()})
    if isinstance(value, list):
        return [node(item) for item in value]
    return value


def response(text, finish_reason="stop", usage=None):
    body = {"choices": [{"index": 0, "finish_reason": finish_reason,
                         "message": {"role": "assistant", "content": text}}]}
    if usage is not None:
        body["usage"] = usage
    return node(body)


class StubLM(dspy.BaseLM):
    """A chat model that returns one given response. It makes no network call."""

    def __init__(self, reply):
        super().__init__("stub/stub-model", cache=False)
        self.reply = reply

    def forward(self, prompt=None, messages=None, **kwargs):
        return self.reply


def call_rows(tmp_path, reply, question):
    """Run one guarded call through a recorder, and return the reply and the rows that it wrote."""
    recorder = CallRecorder(tmp_path, adapter="chat", session_id="made-up-session")
    predictor = dspy.Predict("question -> answer")
    with dspy.context(lm=StubLM(reply), callbacks=[recorder]):
        result = guarded(recorder, "propose", predictor, question=question)
    lines = (tmp_path / "calls.jsonl").read_text().splitlines()
    return result, [json.loads(line) for line in lines]


def test_normal_reply_records_stop_reason_and_token_counts(tmp_path):
    result, rows = call_rows(tmp_path, response(REPLY, "stop", USAGE), "normal reply")
    assert not isinstance(result, Abstain)
    assert len(rows) == 1
    assert rows[0]["finish_reason"] == "stop"
    assert rows[0]["prompt_tokens"] == 11
    assert rows[0]["completion_tokens"] == 7
    assert rows[0]["reasoning_tokens"] == 4


def test_cut_reply_is_abstained_and_keeps_the_usage_fields(tmp_path):
    result, rows = call_rows(tmp_path, response("The team must", "length", USAGE), "cut reply")
    assert isinstance(result, Abstain)
    assert result.reason == "invalid_output"
    assert rows
    for row in rows:
        assert row["finish_reason"] == "length"
        assert row["prompt_tokens"] == 11
        assert row["completion_tokens"] == 7
        assert row["reasoning_tokens"] == 4


def test_missing_usage_records_nulls_and_the_call_succeeds(tmp_path):
    result, rows = call_rows(tmp_path, response(REPLY, "stop"), "no usage")
    assert not isinstance(result, Abstain)
    assert len(rows) == 1
    assert rows[0]["finish_reason"] == "stop"
    assert rows[0]["prompt_tokens"] is None
    assert rows[0]["completion_tokens"] is None
    assert rows[0]["reasoning_tokens"] is None
