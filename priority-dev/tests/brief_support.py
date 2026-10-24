"""Helpers for the slice 4 tests, the stop brief. No test here makes a model call.

The contract that these tests pin for the package `priority.brief` and the module `priority.cli`:

- `priority.brief` exports `build_brief`, `StopBrief`, `Abstain`, and `BUDGET_CHARS` (160_000).
- `build_brief(transcript: Path, stop: int | None = None) -> StopBrief | Abstain`. It has no other
  parameter, and it makes no model call. `stop` is the 1-based number of the stop, and None is the last.
- A stop is the last non-`<synthetic>` assistant message of each stretch of records between two human or
  client records. Records that share a message id are one message. A repeat of a record of the same message
  (same message id, same block) counts once. Sidechain records and `isMeta` records are not read.
- A human record is a `user` record that is not `isMeta` and holds text, not only tool results. A client
  record is an assistant record with the model `<synthetic>`.
- A bare continue is a human text that reads `continue` (case and trailing punctuation do not count). The
  ask is the last human text before the stop that is not a bare continue. The run starts after the ask.
  A bare continue inside the run is an item of the type `human`.
- `StopBrief` fields: `ask.text`, `items`, `final`, `stop_source` (`agent` or `client_error`),
  `client_messages` (tuple of str), `after_stop` (tuple of lines with `source` `client` or `human`, and
  `text`), and `for_model() -> str`.
- Each item has a `type`. `text` and `human` items have `text`. A `tool` item has `tool`, `input` (str),
  `result` (str), and `is_error`. The items exclude the final reply and the lines after the stop.
- `after_stop` holds the synthetic records after the stop that come before the next human record or the
  next agent message. For the last stop only, it also holds the human records after the stop, in order
  with the client records. No other stop shows a human line after it, because that line is the answer to
  the stop.
- `Abstain` fields: `reason`, `detail`, and `final` (bool, True when the parts that never shrink alone
  exceed the budget). The reasons used here are `no_agent_reply` and `brief_too_large`.
- `priority.cli.main(argv) -> int` runs `brief <transcript> [--stop N]`. It prints `for_model()` text, or
  for an Abstain one line that names the reason. It returns 0 in both cases.
"""
from __future__ import annotations

import importlib
import importlib.util
import json
import re
import sys
from pathlib import Path

from probe_support import FIXTURES, PRIORITY_DEV  # noqa: F401  (re-exported for the slice 4 tests)

if str(PRIORITY_DEV / "src") not in sys.path:
    sys.path.insert(0, str(PRIORITY_DEV / "src"))

SNAPSHOTS = PRIORITY_DEV / "tests" / "snapshots"
BUDGET = 160_000

# Made-up secrets for the redaction tests. Each one matches a pattern of the redactor.
PLANTED = {
    "ask": "sk-or-v1-" + "ab12" * 6,
    "agent_text": "ghp_" + "Zy9x" * 6,
    "tool_input": "AKIAIOSFODNN7EXAMPLE",
    "tool_result": "sk-or-v1-" + "cd34" * 16,
    "final": "ghp_" + "Qw3r" * 6,
    "client": "sk-" + "Lm5n" * 8,
    "after_human": "ghp_" + "Ty7u" * 9,
}


def require(module: str):
    """Import the module, or fail on an assertion when it does not exist yet."""
    try:
        found = importlib.util.find_spec(module)
    except ModuleNotFoundError:
        found = None
    assert found is not None, f"the module {module} does not exist yet"
    return importlib.import_module(module)


def brief_api():
    return require("priority.brief")


def build(path: Path, stop: int | None = None):
    return brief_api().build_brief(path, stop)


def filler(n: int, tag: str) -> str:
    """Exactly n characters of plain text with newlines, tabs, and double spaces. It holds no secret."""
    unit = f"{tag} lorem  ipsum\tdolor sit amet\n"
    return (unit * (n // len(unit) + 1))[: n - 1] + "."


def numbers(text: str) -> list[tuple[int, int]]:
    """(position, value) for each whole number in the text. A comma or an underscore inside a number is dropped."""
    return [(m.start(), int(re.sub(r"[,_]", "", m.group()))) for m in re.finditer(r"\d[\d,_]*", text)]


def first_position(text: str, low: int, high: int | None = None) -> int | None:
    """The position of the first number from low to high in the text, or None."""
    high = low if high is None else high
    return next((pos for pos, value in numbers(text) if low <= value <= high), None)


class Transcript:
    """Builds a transcript in the shape of a Claude Code JSONL file."""

    def __init__(self):
        self.records: list[dict] = []
        self._msg = 0
        self._tool = 0
        self._uuid = 0

    def _next_uuid(self) -> str:
        self._uuid += 1
        return f"r{self._uuid}"

    def _add(self, kind: str, message: dict, **extra) -> dict:
        record = {"type": kind, "uuid": self._next_uuid(), **extra, "message": message}
        self.records.append(record)
        return record

    def human(self, content, **extra) -> dict:
        """A human record. The content is a str, or a list of blocks."""
        return self._add("user", {"role": "user", "content": content}, origin=None, **extra)

    def assistant(self, *blocks: dict, msg_id: str | None = None, model: str = "claude-test-1", **extra) -> dict:
        if msg_id is None:
            self._msg += 1
            msg_id = f"msg_{self._msg:04d}"
        message = {"id": msg_id, "role": "assistant", "model": model, "stop_reason": None, "content": list(blocks)}
        return self._add("assistant", message, **extra)

    def synthetic(self, text: str) -> dict:
        return self.assistant({"type": "text", "text": text}, model="<synthetic>", isApiErrorMessage=True)

    def results(self, *blocks: dict, **extra) -> dict:
        """A user record that holds only tool results."""
        return self._add("user", {"role": "user", "content": list(blocks)}, **extra)

    def repeat(self, record: dict) -> dict:
        """The same message again, as a new record with a new uuid."""
        again = {**record, "uuid": self._next_uuid()}
        self.records.append(again)
        return again

    def reply(self, text: str) -> dict:
        return self.assistant(text_block(text))

    def exchange(self, name: str, tool_input: dict, result, is_error: bool = False) -> str:
        """One tool call and its result, as two records. Returns the tool use id."""
        self._tool += 1
        tool_id = f"toolu_{self._tool:04d}"
        self.assistant(tool_use_block(tool_id, name, tool_input))
        self.results(result_block(tool_id, result, is_error))
        return tool_id

    def write(self, path: Path) -> Path:
        path.write_text("".join(json.dumps(r) + "\n" for r in self.records))
        return path


def text_block(text: str) -> dict:
    return {"type": "text", "text": text}


def tool_use_block(tool_id: str, name: str, tool_input: dict) -> dict:
    return {"type": "tool_use", "id": tool_id, "name": name, "input": tool_input}


def result_block(tool_id: str, content, is_error: bool = False) -> dict:
    return {"type": "tool_result", "tool_use_id": tool_id, "content": content, "is_error": is_error}


def simple(path: Path, *, ask: str = "Check the logs.", final: str = "Done.", exchanges=(), after=()) -> Path:
    """A one-stop transcript. Each exchange is (name, input dict, result, is_error). Each after is
    ("client" | "human", text) and follows the final reply."""
    t = Transcript()
    t.human(ask)
    for name, tool_input, result, *flag in exchanges:
        t.exchange(name, tool_input, result, bool(flag and flag[0]))
    t.reply(final)
    for source, text in after:
        t.synthetic(text) if source == "client" else t.human(text)
    return t.write(path)
