"""The figures of the report. Each one comes from the stored call rows."""
from __future__ import annotations

# USD for a million tokens, as (input, output). The interpreter model runs the one propose call.
PRICES = {"interpreter": (0.15, 0.60), "digest": (0.45, 1.20)}
CHARS_PER_TOKEN = 4
INTERPRETER_STAGES = ("propose",)
DIGEST_STAGES = ("digest", "shrink")


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
