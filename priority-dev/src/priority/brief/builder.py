"""Builds a StopBrief from a Claude Code JSONL transcript."""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from priority.brief.models import (
    BUDGET_CHARS,
    Abstain,
    Ask,
    BriefText,
    HumanItem,
    RunItem,
    StopBrief,
    TextItem,
    ToolItem,
)
from priority.brief.redact import redact_with_count
from priority.brief.shrink import shrink_brief
from priority.brief.transcript import (
    classify_records,
    collect_after_stop,
    collect_tool_results,
    find_ask,
    find_stops,
    read_records,
)


def _build_items_and_final(
    classified: list[dict[str, Any]],
    ask_idx: int | None,
    target_idx: int,
    tool_results: dict[str, tuple[str, bool]],
) -> tuple[tuple[RunItem, ...], str, int]:
    items: list[RunItem] = []
    redactions = 0
    run_start = ask_idx + 1 if ask_idx is not None else 0
    final_text_blocks: list[str] = []
    target_mid = classified[target_idx].get("mid")

    def clean(text: str) -> str:
        nonlocal redactions
        result, count = redact_with_count(text)
        redactions += count
        return result

    for j in range(run_start, target_idx + 1):
        record = classified[j]
        if record["kind"] == "human":
            items.append(HumanItem(text=clean(record["text"])))
        elif record["kind"] == "agent":
            is_target = j == target_idx or record.get("mid") == target_mid
            for block in record["blocks"]:
                block_type = block.get("type")
                if block_type == "text":
                    if is_target:
                        final_text_blocks.append(block.get("text", ""))
                    else:
                        items.append(TextItem(text=clean(block.get("text", ""))))
                elif block_type == "tool_use":
                    tool_id = block.get("id", "")
                    raw_result, is_error = tool_results.get(tool_id, ("", False))
                    tool_input = json.dumps(block.get("input", {}))
                    items.append(ToolItem(
                        tool=block.get("name", ""),
                        input=BriefText(clean(tool_input)),
                        result=clean(raw_result),
                        is_error=is_error,
                    ))

    final_text = clean("\n\n".join(final_text_blocks))
    return tuple(items), final_text, redactions


def _check_budget(brief: StopBrief) -> Abstain | None:
    model_text = brief.for_model()
    if len(model_text) <= BUDGET_CHARS:
        return None

    tool_items = [it for it in brief.items if it.type == "tool"]
    protected_size = len(brief._render(exclude_older_payloads=True))
    if protected_size > BUDGET_CHARS:
        return Abstain(
            reason="brief_too_large",
            detail=f"the parts that never shrink alone exceed the budget ({protected_size} > {BUDGET_CHARS})",
            final=True,
        )

    older_tools = tool_items[:-3] if len(tool_items) > 3 else []
    entries = []
    for it in older_tools:
        entries.append((len(it.result), f"{it.tool} result ({len(it.result)} chars): {it.result[:60]}"))
        entries.append((len(it.input), f"{it.tool} input ({len(it.input)} chars): {it.input[:60]}"))
    entries.sort(key=lambda x: x[0], reverse=True)

    detail_lines = [f"protected parts: {protected_size} chars. Older exchanges:"]
    for _, desc in entries:
        detail_lines.append(f"  {desc}")

    return Abstain(
        reason="brief_too_large",
        detail="\n".join(detail_lines),
        final=False,
    )


def build_brief(transcript: Path, stop: int | None = None, previous: Any = None, *,
                shrink_lm: Any = None, log_dir: Path | str | None = None) -> StopBrief | Abstain:
    """Build a StopBrief from a transcript path and optional 1-based stop index.

    `previous` is the RunDigest of the run before. With `shrink_lm`, an over-budget brief shrinks its largest
    older inputs and results, one call at a time, until it fits.
    """
    records = read_records(transcript)
    tool_results = collect_tool_results(records)
    classified = classify_records(records)
    stop_indices = find_stops(classified)

    if not stop_indices:
        return Abstain(reason="no_agent_reply")

    if stop is None:
        stop = len(stop_indices)
    elif stop < 1 or stop > len(stop_indices):
        return Abstain(reason="no_agent_reply")
    target_idx = stop_indices[stop - 1]

    is_last = target_idx == stop_indices[-1]

    after_stop, after_redactions = collect_after_stop(classified, target_idx, is_last)
    client_messages = tuple(line.text for line in after_stop if line.source == "client")
    stop_source = "client_error" if client_messages else "agent"

    ask_idx, ask_text, ask_redactions = find_ask(classified, target_idx)
    items, final_str, item_redactions = _build_items_and_final(classified, ask_idx, target_idx, tool_results)

    brief = StopBrief(
        ask=Ask(text=ask_text),
        items=items,
        final=final_str,
        stop_source=stop_source,
        client_messages=client_messages,
        after_stop=tuple(after_stop),
        redactions=after_redactions + ask_redactions + item_redactions,
        previous=previous,
        session_id=transcript.stem,
        stop=f"{stop:03d}",
    )

    abstain = _check_budget(brief)
    if abstain is None:
        return brief
    if shrink_lm is None or abstain.final:
        return abstain
    return shrink_brief(brief, shrink_lm, log_dir)
