"""The Interpreter: one typed DSPy call, ProposeStop, for each stop. The design is probes/program-flow-v2.svg.

The adapter parse and the pydantic validation of the reply are the only gate. Code sets the session and the
author of each step. Every failure ends as an abstain with a logged reason. No exception leaves forward.
"""
from __future__ import annotations

import logging
from pathlib import Path
from time import sleep

import dspy
from dspy.utils.exceptions import AdapterParseError
from pydantic import ValidationError

from priority import config
from priority.interpreter.calls import CallRecorder
from priority.interpreter.signatures import ProposeStop
from priority.run_folder import RunFolder

INTERPRETER_MODEL = config.model()
MAX_TOKENS = 64000  # reasoning spends tokens first; at 16000 it used the whole cap on some calls. Mercury 3 allows 131072
STAGE = "propose"
WAITS = (5, 15, 45)  # seconds between the 4 tries of a rate-limited call
log = logging.getLogger("priority.interpreter")
# The fallback of ChatAdapter would make a second model call after a parse fault. A run makes one.
ADAPTERS = {"chat": lambda: dspy.ChatAdapter(use_json_adapter_fallback=False), "json": dspy.JSONAdapter}


def interpreter_lm(retries: int = 0) -> dspy.LM:
    """The real interpreter model. Only the command line calls this, because it reads the key."""
    return dspy.LM(INTERPRETER_MODEL, api_key=config.load_key(), api_base=config.base_url(),
                   temperature=config.temperature(), max_tokens=MAX_TOKENS, timeout=120, num_retries=retries, cache=False)


def _abstain(reason: str, error: Exception, raw: str = "") -> dict:
    return {"reason": reason, "detail": f"{type(error).__name__}: {error}", "raw": raw}


def _row_error(abstain: dict | None) -> str:
    """The error text of a call row that has none of its own, such as a reply that did not parse."""
    if abstain is None:
        return ""
    return f"{abstain['reason']}: {abstain['detail'].partition(':')[0]}"


def _is_rate_limit(error: Exception) -> bool:
    return (type(error).__name__.endswith("RateLimitError") or "Rate limit reached" in str(error)
            or getattr(error, "status_code", None) == 429)


class Interpreter(dspy.Module):
    def __init__(self, lm: dspy.LM | None = None, *, log_dir: RunFolder | Path | str | None = None,
                 session_id: str = "", adapter: str = "chat", stop: str = "", waits: tuple[float, ...] = WAITS):
        super().__init__()
        if adapter not in ADAPTERS:
            raise ValueError(f"unknown adapter {adapter!r}: use one of {', '.join(map(repr, ADAPTERS))}")
        self.lm, self.log_dir, self.session_id, self.adapter_name = lm, log_dir, session_id, adapter
        self.stop, self.waits = stop, tuple(waits)
        self.propose = dspy.Predict(ProposeStop)

    def forward(self, brief_text: str, *, session_id: str | None = None, stop: str | None = None) -> dspy.Prediction:
        """One model call. A reply that does not parse or validate gives invalid_output, any other error model_error.
        A rate-limit error gets one more try after each wait in `waits`, 4 tries by default (see WAITS).

        `session_id` and `stop` name this call and override the constructor values. They are per call, because
        threads share one Interpreter.
        """
        session_id = self.session_id if session_id is None else session_id
        stop = self.stop if stop is None else stop
        recorder = CallRecorder(self.log_dir, self.adapter_name, session_id, stop)
        recorder.stage = STAGE
        reply, abstain = self._try_calls(brief_text, recorder)
        recorder.commit(abstain is None, error=_row_error(abstain))
        if abstain is not None:
            return self._abstained(brief_text, abstain)
        steps = [step.model_dump(mode="json") | {"session_id": session_id, "author": "interpreter"}
                 for step in reply.steps.root]
        return dspy.Prediction(status=reply.status, needs_human=reply.needs_human, priority=reply.priority,
                               steps=steps, abstain=None)

    def _try_calls(self, brief_text: str, recorder: CallRecorder) -> tuple[dspy.Prediction | None, dict | None]:
        """Call the model, and call it again after each wait in `self.waits` for a rate-limit error.
        Return `(reply, abstain)`."""
        for attempt in range(len(self.waits) + 1):
            try:
                with dspy.context(lm=self.lm or dspy.settings.lm, adapter=ADAPTERS[self.adapter_name](),
                                  callbacks=[recorder]):
                    return self.propose(brief_text=brief_text), None
            except AdapterParseError as error:
                return None, _abstain("invalid_output", error, error.lm_response or "")
            except ValidationError as error:
                return None, _abstain("invalid_output", error)
            except Exception as error:  # noqa: BLE001  (a model call may raise anything, and none may escape)
                if not _is_rate_limit(error) or attempt == len(self.waits):
                    return None, _abstain("model_error", error)
                sleep(self.waits[attempt])
        raise AssertionError("unreachable: the last try always returns")

    def _abstained(self, brief_text: str, abstain: dict) -> dspy.Prediction:
        """Log the abstain, and put it in the dspy trace, so that GEPA reflects on a failed call too."""
        log.warning("abstain %s: %s", abstain["reason"], abstain["detail"])
        trace = dspy.settings.trace
        if trace is not None and dspy.settings.max_trace_size > 0:
            if len(trace) >= dspy.settings.max_trace_size:
                trace.pop(0)
            trace.append((self.propose, {"brief_text": brief_text},
                          dspy.Prediction(raw_reply=abstain["raw"], error=abstain["detail"])))
        return dspy.Prediction(status=None, needs_human=None, priority=None, steps=[], abstain=abstain)
