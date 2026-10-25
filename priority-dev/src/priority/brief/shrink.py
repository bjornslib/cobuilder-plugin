"""Shrink: the digest model shortens the largest older tool inputs and results, one at a time, until the brief fits."""
from __future__ import annotations

from dataclasses import replace
from pathlib import Path
from typing import Any

from priority.brief.models import BUDGET_CHARS, Abstain, BriefText, ShrunkEntry, StopBrief


def _largest_left(brief: StopBrief, done: set[tuple[int, str]]) -> tuple[int, str] | None:
    """The (item index, part) of the largest older input or result that is not shrunk yet."""
    tool_indexes = [i for i, item in enumerate(brief.items) if item.type == "tool"]
    older = tool_indexes[:-3]  # the last three tool items are never older
    left = [(i, part) for i in older for part in ("input", "result") if (i, part) not in done]
    if not left:
        return None
    return max(left, key=lambda c: (len(getattr(brief.items[c[0]], c[1])), -c[0]))


def shrink_brief(brief: StopBrief, lm: Any, log_dir: Path | str | None = None) -> StopBrief | Abstain:
    """Shrink one text for each call, and stop at the first size that fits. The brief records each one.

    Over the budget after every older input and result shrank, the result is the Abstain brief_too_large.
    A failed call gives the Abstain of the call. No exception escapes.
    """
    # A lazy import: only a run with a shrink model needs dspy.
    from priority.interpreter.calls import CallRecorder
    from priority.interpreter.models import Abstain as CallAbstain
    from priority.interpreter.shrink import shorten

    recorder = CallRecorder(log_dir)
    done: set[tuple[int, str]] = set()
    while len(brief.for_model()) > BUDGET_CHARS:
        target = _largest_left(brief, done)
        if target is None:
            return Abstain(reason="brief_too_large", detail=(
                f"over the budget after every older input and result shrank ({len(brief.for_model())} > {BUDGET_CHARS})"))
        index, part = target
        item = brief.items[index]
        before = getattr(item, part)
        short = shorten(lm, recorder, item.tool, part, before)
        if isinstance(short, CallAbstain):
            return Abstain(reason=short.reason, detail=short.detail)
        done.add(target)
        items = list(brief.items)
        items[index] = replace(item, **{part: BriefText(short) if part == "input" else short})
        brief = replace(brief, items=tuple(items),
                        shrunk=(*brief.shrunk, ShrunkEntry(item=index, part=part, before=len(before), after=len(short))))
    return brief
