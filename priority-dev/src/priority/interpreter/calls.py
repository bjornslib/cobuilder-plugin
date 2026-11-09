"""The call store: one JSON line for each model call, in log_dir/calls.jsonl."""
from __future__ import annotations

import hashlib
import json
import logging
import time
from pathlib import Path
from typing import Any

from dspy.utils.callback import BaseCallback
from dspy.utils.exceptions import AdapterParseError
from pydantic import ValidationError

from priority.interpreter.models import Abstain
from priority.run_folder import RunFolder

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


def _field(node: Any, name: str) -> Any:
    """A field of a response node: a key of a dict, or an attribute of a provider object."""
    if node is None:
        return None
    if isinstance(node, dict):
        return node.get(name)
    return getattr(node, name, None)


def _finish_reason(response: Any) -> Any:
    """The finish reason, such as `stop` or `length`, of the first choice or the native response."""
    if isinstance(response, tuple):
        response = response[0] if response else None
    choices = _field(response, "choices")
    if choices:
        return _field(choices[0], "finish_reason")
    return _field(response, "finish_reason")


def _usage(usage: Any) -> dict[str, Any]:
    """The token counts of a usage record. The reasoning tokens sit under completion_tokens_details."""
    details = _field(usage, "completion_tokens_details")
    return {"prompt_tokens": _field(usage, "prompt_tokens"),
            "completion_tokens": _field(usage, "completion_tokens"),
            "reasoning_tokens": _field(details, "reasoning_tokens")}


def _history_entry(lm: Any, outputs: Any) -> dict[str, Any]:
    """The LM history entry that holds these outputs, found by identity. It is empty when none matches.
    An explicit Request returns the lm15 response, which the entry keeps under "response"."""
    if outputs is None:
        return {}
    for entry in reversed(getattr(lm, "history", None) or []):
        if entry.get("outputs") is outputs or entry.get("response") is outputs:
            return entry
    return {}


def call_meta(lm: Any, outputs: Any) -> dict[str, Any]:
    """The finish reason and token counts of the LM call that made `outputs`. A missing value is None."""
    entry = _history_entry(lm, outputs)
    return {"finish_reason": _finish_reason(entry.get("response")), **_usage(entry.get("usage"))}


class CallRecorder(BaseCallback):
    """A DSPy callback. It writes each LM call, also a failed one, when `log_dir` is set.

    A row waits until `commit(valid)`, because the caller knows only after the call whether the reply parsed.
    """

    def __init__(self, log_dir: RunFolder | Path | str | None, adapter: str = "chat", session_id: str = "",
                 stop: str = ""):
        self.folder = log_dir if log_dir is None or isinstance(log_dir, RunFolder) else RunFolder(log_dir)
        self.adapter = adapter
        self.session_id = session_id or ""
        self.stop = stop or ""
        self.stage = ""
        self._open: dict[str, tuple[str, str, str, float, Any]] = {}
        self._pending: list[dict[str, Any]] = []

    def on_lm_start(self, call_id, instance, inputs):
        self._open[call_id] = (self.stage, str(getattr(instance, "model", "")), render(inputs),
                               time.perf_counter(), instance)

    def on_lm_end(self, call_id, outputs, exception=None):
        stage, model, rendered, started, lm = self._open.pop(call_id)
        record = {"session_id": self.session_id, "stop": self.stop, "stage": stage, "model_id": model,
                  "prompt_hash": hashlib.sha256(rendered.encode()).hexdigest(),
                  "rendered_input": rendered, "raw_reply": raw_reply(outputs), "adapter": self.adapter,
                  "seconds": time.perf_counter() - started}
        record.update(call_meta(lm, outputs))
        if exception is not None:
            record["error"] = f"{type(exception).__name__}: {exception}"
        self._pending.append(record)

    def commit(self, valid: bool, error: str = "") -> None:
        """Write the rows of the call. A row that holds an error is never valid. `error` fills in the rows
        that have none, such as a reply that did not parse."""
        pending, self._pending = self._pending, []
        if self.folder is None:
            return
        if error:
            for row in pending:
                row.setdefault("error", error)
        text = "".join(json.dumps({**row, "valid": valid and "error" not in row}) + "\n" for row in pending)
        if not text:
            return
        self.folder.append("calls.jsonl", text)


def guarded(recorder: CallRecorder, stage: str, predictor: Any, **inputs: Any) -> Any:
    """One model call. It returns the reply, or an Abstain, and it logs the Abstain. No exception escapes.

    A reply that does not parse or validate gives invalid_output, and any other error gives model_error.
    """
    recorder.stage = stage
    valid = False
    try:
        reply = predictor(**inputs)
        valid = True
        return reply
    except (AdapterParseError, ValidationError) as error:
        abstain = Abstain(reason="invalid_output", detail=f"{stage}: {type(error).__name__}: {error}")
    except Exception as error:  # noqa: BLE001  (a model call may raise anything, and none may escape)
        abstain = Abstain(reason="model_error", detail=f"{stage}: {type(error).__name__}: {error}")
    finally:
        recorder.commit(valid)
    log.warning("abstain %s: %s", abstain.reason, abstain.detail)
    return abstain
