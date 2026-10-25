"""The call store: one JSON line for each model call, in log_dir/calls.jsonl."""
from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any

from dspy.utils.callback import BaseCallback


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
