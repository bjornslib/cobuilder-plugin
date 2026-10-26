"""The figures of the report. Each one comes from the stored call rows."""
from __future__ import annotations

import json
import re
from collections import Counter

# USD for a million tokens, as (input, output). The interpreter model runs triage, pick, fill, and card.
PRICES = {"interpreter": (0.15, 0.60), "digest": (0.45, 1.20)}
CHARS_PER_TOKEN = 4
INTERPRETER_STAGES = ("triage", "pick", "fill", "card")
DIGEST_STAGES = ("digest", "shrink")
_CHAT_STEPS = re.compile(r"\[\[ ## steps ## \]\]\s*(.*?)\s*(?:\[\[ ## completed|$)", re.S)


def share(count: int, total: int) -> str:
    """A rate as text: `0.833 (10/12)`, or `n/a (0/0)` when there is nothing to count."""
    return f"{count / total:.3f} ({count}/{total})" if total else "n/a (0/0)"


def valid_rate(rows: list[dict]) -> str:
    return share(sum(1 for row in rows if row.get("valid")), len(rows))


def rate_limit_errors(rows: list[dict]) -> int:
    return sum(1 for row in rows if "RateLimitError" in row.get("error", "") or "429" in row.get("error", ""))


def stage_table(rows: list[dict], stages: tuple[str, ...], model: str) -> list[str]:
    """A Markdown table with one row for each stage: calls, characters sent, seconds, and estimated cost."""
    price_in, price_out = PRICES[model]
    lines = ["| stage | calls | chars sent | seconds | cost USD |", "|---|---|---|---|---|"]
    for stage in stages:
        mine = [row for row in rows if row["stage"] == stage]
        sent = sum(len(row["rendered_input"]) for row in mine)
        received = sum(len(row["raw_reply"]) for row in mine)
        cost = (sent * price_in + received * price_out) / CHARS_PER_TOKEN / 1e6
        seconds = sum(row["seconds"] for row in mine)
        lines.append(f"| {stage} | {len(mine)} | {sent} | {seconds:.3f} | {cost:.6f} |")
    return lines


def _unwrap(reply: str) -> str:
    """A live LM stores its raw reply as a JSON list of outputs, `[{"text": ...}]`. Return the first text."""
    try:
        outputs = json.loads(reply)
    except ValueError:
        return reply
    if isinstance(outputs, list) and outputs and isinstance(outputs[0], dict) and isinstance(outputs[0].get("text"), str):
        return outputs[0]["text"]
    return reply


def picked_steps(row: dict) -> list[dict]:
    """The steps in the raw reply of a Pick row, in the JSON format or in the chat format. [] if unreadable."""
    reply = _unwrap(row["raw_reply"])
    try:
        value = json.loads(reply)["steps"]
    except (ValueError, KeyError, TypeError):
        found = _CHAT_STEPS.search(reply)
        value = found.group(1) if found else None
    try:
        steps = json.loads(value) if isinstance(value, str) else value
    except ValueError:
        return []
    return [step for step in steps if isinstance(step, dict)] if isinstance(steps, list) else []


def _valid_steps(rows: list[dict]):
    for row in rows:
        if row["stage"] == "pick" and row.get("valid"):
            for step in picked_steps(row):
                yield row, step


def kinds_picked(rows: list[dict]) -> Counter:
    return Counter(step.get("kind") for _, step in _valid_steps(rows))


def quote_found(rows: list[dict], texts: list[str]) -> tuple[int, int]:
    """(found, total) over the steps of the valid Pick rows, except ask_human steps, which need no quote.

    A quote is found when it is not empty and it is in the stop brief that the row sent.
    """
    found = total = 0
    for row, step in _valid_steps(rows):
        if step.get("kind") == "ask_human":
            continue
        total += 1
        brief = next((text for text in texts if text in row["rendered_input"]), "")
        quote = step.get("evidence_quote") or ""
        found += bool(quote) and quote in brief
    return found, total
