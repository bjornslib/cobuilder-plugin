"""The call store: one JSON line for each model call, in log_dir/calls.jsonl."""
from __future__ import annotations

import hashlib
import json
import logging
from pathlib import Path
from typing import Any

from dspy.utils.callback import BaseCallback
from dspy.utils.exceptions import AdapterParseError
from pydantic import ValidationError

from priority.interpreter.models import Abstain

log = logging.getLogger("priority.interpreter")


def render(inputs: dict[str, Any]) -> str:
    """The exact text that the model received, as one string."""
    messages = inputs.get("messages") or [{"role": "user", "content": inputs.get("prompt") or ""}]
    parts = []
    for message in messages:
        content = message.get("content")
        parts.append(f"[{message.get('role')}]\n{content if isinstance(content, str) else json.dumps(content)}")
    return "\n\n".join(parts)


def raw_reply(outputs: Any) -> str:
    if outputs is None:
        return ""
    if isinstance(outputs, (list, tuple)) and all(isinstance(o, str) for o in outputs):
        return "\n".join(outputs)
    return json.dumps(outputs, default=str)


class CallRecorder(BaseCallback):
    """A DSPy callback. It writes each LM call, also a failed one, when `log_dir` is set."""

    def __init__(self, log_dir: Path | str | None):
        self.path = Path(log_dir) / "calls.jsonl" if log_dir is not None else None
        self.stage = ""
        self._open: dict[str, tuple[str, str, str]] = {}

    def on_lm_start(self, call_id, instance, inputs):
        self._open[call_id] = (self.stage, str(getattr(instance, "model", "")), render(inputs))

    def on_lm_end(self, call_id, outputs, exception=None):
        stage, model, rendered = self._open.pop(call_id)
        if self.path is None:
            return
        record = {"stage": stage, "model_id": model, "prompt_hash": hashlib.sha256(rendered.encode()).hexdigest(),
                  "rendered_input": rendered, "raw_reply": raw_reply(outputs)}
        if exception is not None:
            record["error"] = f"{type(exception).__name__}: {exception}"
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with self.path.open("a") as handle:
            handle.write(json.dumps(record) + "\n")


def guarded(recorder: CallRecorder, stage: str, predictor: Any, **inputs: Any) -> Any:
    """One model call. It returns the reply, or an Abstain, and it logs the Abstain. No exception escapes.

    A reply that does not parse or validate gives invalid_output, and any other error gives model_error.
    """
    recorder.stage = stage
    try:
        return predictor(**inputs)
    except (AdapterParseError, ValidationError) as error:
        abstain = Abstain(reason="invalid_output", detail=f"{stage}: {type(error).__name__}: {error}")
    except Exception as error:  # noqa: BLE001  (a model call may raise anything, and none may escape)
        abstain = Abstain(reason="model_error", detail=f"{stage}: {type(error).__name__}: {error}")
    log.warning("abstain %s: %s", abstain.reason, abstain.detail)
    return abstain
