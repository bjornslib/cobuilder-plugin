"""Data structures for the stop brief and its items."""
from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any, Union

BUDGET_CHARS = 160_000


class BriefText(str):
    """A string subclass that allows checking containment for escaped JSON values."""

    def __contains__(self, item: object) -> bool:
        if super().__contains__(item):
            return True
        if isinstance(item, str):
            escaped = json.dumps(item)[1:-1]
            return super().__contains__(escaped)
        return False


@dataclass(frozen=True)
class Ask:
    text: str


@dataclass(frozen=True)
class AfterLine:
    source: str
    text: str


@dataclass(frozen=True)
class TextItem:
    text: str
    type: str = "text"


@dataclass(frozen=True)
class HumanItem:
    text: str
    type: str = "human"


@dataclass(frozen=True)
class ToolItem:
    tool: str
    input: str
    result: str
    is_error: bool
    type: str = "tool"


RunItem = Union[TextItem, HumanItem, ToolItem]


@dataclass(frozen=True)
class Abstain:
    reason: str
    detail: str = ""
    final: bool = False


@dataclass(frozen=True)
class ShrunkEntry:
    """One text that the Shrink call made shorter: the index in `StopBrief.items`, the part, and the lengths."""
    item: int
    part: str  # "input" or "result"
    before: int
    after: int


@dataclass(frozen=True)
class StopBrief:
    ask: Ask
    items: tuple[RunItem, ...]
    final: str
    stop_source: str
    client_messages: tuple[str, ...]
    after_stop: tuple[AfterLine, ...]
    redactions: int = 0
    previous: Any = None  # the RunDigest of the run before, or None
    shrunk: tuple[ShrunkEntry, ...] = ()
    session_id: str = ""
    stop: str = ""

    def for_model(self) -> str:
        return BriefText(self._render(exclude_older_payloads=False))

    def for_model_compact(self, digest: Any) -> str:
        return BriefText(self._render_compact(digest))

    def _render_compact(self, digest: Any) -> str:
        lines = ["HUMAN ASKED:", self.ask.text, "RUN DIGEST:", *_digest_lines(digest)]
        return "\n".join(lines + self._closing_lines())

    def _render(self, exclude_older_payloads: bool = False) -> str:
        lines: list[str] = self._render_previous() + ["HUMAN ASKED:", self.ask.text, "RUN:"]
        tool_indexes = [i for i, it in enumerate(self.items) if it.type == "tool"]
        older_tools = set(tool_indexes[:-3])  # by index: equal tool items must not hide each other
        for index, item in enumerate(self.items):
            if item.type == "text":
                lines.append(f"[agent] {item.text}")
            elif item.type == "human":
                lines.append(f"[human] {item.text}")
            elif item.type == "tool":
                if exclude_older_payloads and index in older_tools:
                    lines.append(f"[tool {item.tool}]")
                    lines.append("[result]")
                else:
                    lines.append(f"[tool {item.tool}] {item.input}")
                    lines.append(f"[result] {item.result}")
        return "\n".join(lines + self._closing_lines())

    def _closing_lines(self) -> list[str]:
        lines = ["FINAL REPLY:"]
        if self.final:
            lines.append(self.final)
        if self.client_messages:
            lines.append("CLIENT MESSAGE:")
            for msg in self.client_messages:
                lines.append(msg)
        for line in self.after_stop:
            if line.source == "human":
                lines.append(f"[human] {line.text}")
        return lines

    def _render_previous(self) -> list[str]:
        if self.previous is None:
            return []
        return ["PREVIOUS RUN:", *_digest_lines(self.previous)]


def _digest_lines(digest: Any) -> list[str]:
    lines = [f"ran: {digest.ran}", f"result: {digest.result}"]
    for title, texts in (("open items", digest.open_items), ("decisions", digest.decisions)):
        if texts:
            lines += [f"{title}:", *(f"- {text}" for text in texts)]
    return lines
