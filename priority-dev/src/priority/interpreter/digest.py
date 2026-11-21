"""The Digest call: one model call that sums up a finished run for the next stop brief of the same session."""
from __future__ import annotations

from pathlib import Path

import dspy
from pydantic import Field, field_validator

from priority import config
from priority.interpreter.calls import CallRecorder, guarded
from priority.interpreter.models import Abstain, Strict
from priority.interpreter.module import MAX_TOKENS

DIGEST_MODEL = config.model()


def digest_lm(retries: int = 0) -> dspy.LM:
    """The real digest model. It has no response_format, so its calls use the text adapter.

    Only the command line calls this, because it reads the key.
    """
    return dspy.LM(DIGEST_MODEL, api_key=config.load_key(), api_base=config.base_url(),
                   temperature=config.temperature(), max_tokens=MAX_TOKENS, timeout=120, num_retries=retries, cache=False)


RAN_CAP, RESULT_CAP, LIST_CAP = 2400, 1200, 10


def clip(text: str, cap: int) -> str:
    """Cut a text at a word boundary to at most `cap` characters. A text with no space is cut at `cap`."""
    if len(text) <= cap:
        return text
    head = text[:cap]
    # The cut falls between two words: keep every whole word.
    if text[cap].isspace() or head[-1].isspace():
        return head.rstrip()
    cut = max(head.rfind(" "), head.rfind("\n"), head.rfind("\t"))
    kept = head[:cut].rstrip() if cut > 0 else ""
    # Only leading spaces before the first word: keep the cut word, not an empty text.
    return kept or head


class RunDigest(Strict):
    """A model summary of one finished run. The Digest call makes it at each stop."""
    ran: str = Field(max_length=RAN_CAP, description=f"What the agent did, in plain words. Up to {RAN_CAP} characters.")
    result: str = Field(max_length=RESULT_CAP, description=f"How the run ended. Up to {RESULT_CAP} characters.")
    open_items: tuple[str, ...] = Field(default=(), max_length=LIST_CAP,
                                        description=f"The questions and tasks left open. Up to {LIST_CAP} items.")
    decisions: tuple[str, ...] = Field(default=(), max_length=LIST_CAP,
                                       description=f"The choices made in the run. Up to {LIST_CAP} items.")

    # A reply over a cap is clipped, not rejected, so one long reply does not lose the digest.
    @field_validator("ran", "result", mode="before")
    @classmethod
    def _clip_text(cls, value, info):
        cap = RAN_CAP if info.field_name == "ran" else RESULT_CAP
        return clip(value, cap) if isinstance(value, str) else value

    @field_validator("open_items", "decisions", mode="before")
    @classmethod
    def _clip_list(cls, value):
        return value[:LIST_CAP] if isinstance(value, (list, tuple)) else value


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
        recorder = CallRecorder(self.log_dir, session_id=brief.session_id, stop=brief.stop)
        # The fallback of ChatAdapter would make a second model call after a parse fault. A run makes one.
        adapter = dspy.ChatAdapter(use_json_adapter_fallback=False)
        with dspy.context(lm=self.lm or dspy.settings.lm, adapter=adapter, callbacks=[recorder]):
            reply = guarded(recorder, "digest", self.predict, brief_text=brief.for_model())
        return reply if isinstance(reply, Abstain) else reply.digest
