"""Reads and checks the open question file of `priority interpret --open-question`."""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any


class QuestionFileError(ValueError):
    """The question file is not a non-empty list of questions in the AskUserQuestion shape."""


def _has_text(value: Any) -> bool:
    return isinstance(value, str) and value.strip() != ""


def _check_question(item: Any, number: int) -> None:
    if not isinstance(item, dict):
        raise QuestionFileError(f"question {number} is not an object")
    if not _has_text(item.get("question")):
        raise QuestionFileError(f"question {number} has no question text")
    options = item.get("options")
    if not isinstance(options, list) or not options:
        raise QuestionFileError(f"question {number} has no options")
    if not all(isinstance(option, dict) and _has_text(option.get("label")) for option in options):
        raise QuestionFileError(f"question {number} has an option with no label")


def load_open_questions(path: Path) -> list[dict[str, Any]]:
    """Read the question file and check its shape. Raise QuestionFileError, with one line, when it is bad."""
    try:
        data = json.loads(path.read_text())
    except (OSError, ValueError) as exc:
        raise QuestionFileError(f"cannot read the question file {path}: {exc}") from exc
    if not isinstance(data, list) or not data:
        raise QuestionFileError(f"the question file {path} must hold a non-empty JSON list")
    for number, item in enumerate(data, start=1):
        _check_question(item, number)
    return data
