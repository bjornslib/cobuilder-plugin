"""Transcript parsing and classification for stop brief extraction."""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from priority.brief.models import AfterLine
from priority.brief.redact import redact_with_count


def is_bare_continue(text: str) -> bool:
    """True if text is 'continue' ignoring case and trailing punctuation."""
    return text.strip().rstrip(".!?:;, \t\n\r").lower() == "continue"


def read_records(path: Path) -> list[dict[str, Any]]:
    """Read user and assistant JSONL records, skipping sidechains and meta."""
    records: list[dict[str, Any]] = []
    for line in path.read_text(errors="replace").splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            r = json.loads(line)
        except json.JSONDecodeError:
            continue
        if r.get("isSidechain") or r.get("isMeta"):
            continue
        if r.get("type") in ("user", "assistant"):
            records.append(r)
    return records


def collect_tool_results(records: list[dict[str, Any]]) -> dict[str, tuple[str, bool]]:
    """Index tool results by tool_use_id -> (content, is_error)."""
    tool_results: dict[str, tuple[str, bool]] = {}
    for r in records:
        if r.get("type") == "user":
            content = r.get("message", {}).get("content")
            if isinstance(content, list):
                for b in content:
                    if isinstance(b, dict) and b.get("type") == "tool_result":
                        tid = b.get("tool_use_id", "")
                        cnt = b.get("content", "")
                        if isinstance(cnt, list):
                            cnt = "".join(x.get("text", "") for x in cnt if isinstance(x, dict))
                        elif not isinstance(cnt, str):
                            cnt = str(cnt) if cnt is not None else ""
                        tool_results[tid] = (cnt, bool(b.get("is_error", False)))
    return tool_results


def _extract_blocks(content: Any, mid: str, seen: dict[str, set[tuple[Any, ...]]]) -> list[dict[str, Any]]:
    blocks = [{"type": "text", "text": content}] if isinstance(content, str) else []
    if isinstance(content, list):
        blocks = [b for b in content if isinstance(b, dict)]
    if mid not in seen:
        seen[mid] = set()
    new_blocks = []
    for b in blocks:
        inp = json.dumps(b.get("input"), sort_keys=True) if b.get("input") is not None else None
        b_key = (b.get("type"), b.get("id"), b.get("name"), inp, b.get("text"))
        if b_key not in seen[mid]:
            seen[mid].add(b_key)
            new_blocks.append(b)
    return new_blocks


def classify_records(records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Classify records into human, client, tool_results, or agent messages."""
    classified: list[dict[str, Any]] = []
    seen_blocks: dict[str, set[tuple[Any, ...]]] = {}

    for r in records:
        t = r.get("type")
        msg = r.get("message") or {}
        mid = msg.get("id") or r.get("uuid") or str(len(classified))
        content = msg.get("content")

        if t == "user":
            if isinstance(content, str):
                classified.append({"kind": "human", "text": content, "raw": r})
            elif isinstance(content, list):
                texts = [b.get("text", "") for b in content if isinstance(b, dict) and b.get("type") == "text"]
                tool_res = [b for b in content if isinstance(b, dict) and b.get("type") == "tool_result"]
                if texts or not tool_res:
                    classified.append({"kind": "human", "text": "\n".join(texts), "raw": r})
                else:
                    classified.append({"kind": "tool_results", "raw": r})
            else:
                classified.append({"kind": "tool_results", "raw": r})
        elif t == "assistant":
            model = msg.get("model", "")
            is_synthetic = (model == "<synthetic>") or bool(r.get("isApiErrorMessage"))
            if is_synthetic:
                txt = content if isinstance(content, str) else ""
                if isinstance(content, list):
                    txt = "\n".join(b.get("text", "") for b in content if isinstance(b, dict) and b.get("type") == "text")
                classified.append({"kind": "client", "text": txt, "raw": r})
            else:
                new_blocks = _extract_blocks(content, mid, seen_blocks)
                if new_blocks:
                    classified.append({"kind": "agent", "mid": mid, "blocks": new_blocks, "raw": r})

    return classified


def find_stops(classified: list[dict[str, Any]]) -> list[int]:
    """Find the indices of the last non-synthetic assistant message in each stretch."""
    boundaries = [-1]
    for idx, c in enumerate(classified):
        if c["kind"] in ("human", "client"):
            boundaries.append(idx)
    boundaries.append(len(classified))

    stop_indices: list[int] = []
    for i in range(len(boundaries) - 1):
        start = boundaries[i] + 1
        end = boundaries[i + 1]
        agent_idxs = [j for j in range(start, end) if classified[j]["kind"] == "agent"]
        if agent_idxs:
            stop_indices.append(agent_idxs[-1])
    return stop_indices


def collect_after_stop(
    classified: list[dict[str, Any]], target_idx: int, is_last_stop: bool
) -> tuple[list[AfterLine], int]:
    """Collect client and trailing human lines, with their redaction count."""
    after: list[AfterLine] = []
    redactions = 0
    if is_last_stop:
        relevant = classified[target_idx + 1:]
    else:
        relevant = []
        for record in classified[target_idx + 1:]:
            if record["kind"] in ("human", "agent"):
                break
            relevant.append(record)
    for record in relevant:
        if record["kind"] not in ("client", "human"):
            continue
        text, count = redact_with_count(record["text"])
        after.append(AfterLine(source=record["kind"], text=text))
        redactions += count
    return after, redactions


def find_ask(classified: list[dict[str, Any]], target_idx: int) -> tuple[int | None, str, int]:
    """Find and redact the last human ask before the stop."""
    ask_idx = None
    for j in range(target_idx - 1, -1, -1):
        if classified[j]["kind"] == "human" and not is_bare_continue(classified[j]["text"]):
            ask_idx = j
            break
    if ask_idx is None:
        for j in range(target_idx - 1, -1, -1):
            if classified[j]["kind"] == "human":
                ask_idx = j
                break
    text, count = redact_with_count(classified[ask_idx]["text"]) if ask_idx is not None else ("", 0)
    return ask_idx, text, count
