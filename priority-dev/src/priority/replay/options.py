"""The options of `priority replay`. This module does not import dspy, so the parser stays fast."""
from __future__ import annotations

import argparse
from pathlib import Path

ADAPTERS = ("json", "chat")
DEFAULT_CONCURRENCY = 5
DEFAULT_OUT = Path("reports")
DEFAULT_GOAL = (Path(__file__).resolve().parents[4] / "docs" / "architecture" / "designs"
                / "priority-dev-spike" / "goal.json")


def parse_adapters(text: str) -> tuple[str, ...]:
    """The adapter names of `--adapters`, in the given order. Another name is an argument error."""
    names = tuple(dict.fromkeys(part.strip() for part in text.split(",")))
    for name in names:
        if name not in ADAPTERS:
            raise argparse.ArgumentTypeError(f"unknown adapter {name!r}: use {' or '.join(ADAPTERS)}")
    return names


def positive_int(text: str) -> int:
    try:
        value = int(text)
    except ValueError:
        value = 0
    if value < 1:
        raise argparse.ArgumentTypeError(f"{text!r} is not a whole number of 1 or more")
    return value
