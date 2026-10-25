"""The Digest call: one model call that sums up a finished run for the next stop brief of the same session."""
from __future__ import annotations

from pathlib import Path

import dspy
from pydantic import Field

from priority import config
from priority.interpreter.calls import CallRecorder, guarded
from priority.interpreter.models import Abstain, Strict
from priority.interpreter.module import MAX_TOKENS

DIGEST_MODEL = "openrouter/thinkingmachines/inkling-small"


def digest_lm() -> dspy.LM:
    """The real digest model. It has no response_format, so its calls use the text adapter.

    Only the command line calls this, because it reads the key.
    """
    return dspy.LM(DIGEST_MODEL, api_key=config.load_key(), temperature=0, max_tokens=MAX_TOKENS,
                   timeout=120, num_retries=0, cache=False)


class RunDigest(Strict):
    """A model summary of one finished run. The Digest call makes it at each stop."""
    ran: str = Field(max_length=600)  # what the agent did, in plain words
    result: str = Field(max_length=300)  # how the run ended
    open_items: tuple[str, ...] = Field(default=(), max_length=5)  # questions and tasks left open
    decisions: tuple[str, ...] = Field(default=(), max_length=5)  # choices made in the run


class Digest(dspy.Signature):
    """Sum up one finished run of a coding agent for the next stop brief of the same session.
    Keep each question that the agent left open."""
    brief_text: str = dspy.InputField()
    digest: RunDigest = dspy.OutputField()


class DigestRun(dspy.Module):
    """One Digest call. A failure ends as an Abstain with a logged reason. No exception leaves forward."""

    def __init__(self, lm: dspy.LM | None = None, *, log_dir: Path | str | None = None):
        super().__init__()
        self.lm, self.log_dir = lm, log_dir
        self.predict = dspy.Predict(Digest)

    def forward(self, brief) -> RunDigest | Abstain:
        recorder = CallRecorder(self.log_dir)
        # The fallback of ChatAdapter would make a second model call after a parse fault. A run makes one.
        adapter = dspy.ChatAdapter(use_json_adapter_fallback=False)
        with dspy.context(lm=self.lm or dspy.settings.lm, adapter=adapter, callbacks=[recorder]):
            reply = guarded(recorder, "digest", self.predict, brief_text=brief.for_model())
        return reply if isinstance(reply, Abstain) else reply.digest
