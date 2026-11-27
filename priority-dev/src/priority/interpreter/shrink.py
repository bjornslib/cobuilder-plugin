"""The Shrink call: one model call that shortens one older tool input or result of a stop brief."""
from __future__ import annotations

import dspy

from priority.interpreter.calls import CallRecorder, guarded
from priority.interpreter.models import Abstain


class Shrink(dspy.Signature):
    """Shorten one tool input or result from a run of a coding agent.
    Keep errors, file names, numbers, and the last lines."""
    tool: str = dspy.InputField()
    part: str = dspy.InputField(desc="input or result")
    text: str = dspy.InputField()
    short: str = dspy.OutputField(desc="The shorter text")


_shrink = dspy.Predict(Shrink)


def shorten(lm: dspy.LM, recorder: CallRecorder, tool: str, part: str, text: str) -> str | Abstain:
    """The shorter text, or an Abstain. The call is in the call store with the stage `shrink`."""
    adapter = dspy.ChatAdapter(use_json_adapter_fallback=False)
    with dspy.context(lm=lm, adapter=adapter, callbacks=[recorder]):
        reply = guarded(recorder, "shrink", _shrink, tool=tool, part=part, text=text)
    return reply if isinstance(reply, Abstain) else reply.short
