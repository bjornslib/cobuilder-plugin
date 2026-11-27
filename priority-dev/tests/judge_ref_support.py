"""Helpers for the judge and metric tests: the payload object `{"priority", "steps"}`.

Every step, label, brief, and judge reply here is made up. The tests stub
`priority.evaluation.judge.judge`, which the metric resolves at call time,
so no helper makes a model call.
"""
from __future__ import annotations

import json

from fixtures_support import require

BRIEF_TEXT = ("The blue widget trial ended in the north shed. "
              "The tally sheet lists four green valves. "
              "Only the human can pick the paint colour.")
CODE_FIELDS = ("session_id", "author", "confidence", "evidence_quote", "prompt_id")
CODE = {"session_id": "made-up-session", "author": "interpreter", "confidence": 0.9,
        "evidence_quote": "four green valves", "prompt_id": "made-up-prompt"}
STUB_NOTE = "judge stub: no judge model reached, scored 0"


def reply_step(text: str = "Use the blue paint.", **extra) -> dict:
    """One made-up reply step dict."""
    return {"kind": "reply", "text": text} | extra


def ask_step(options: bool = True, role: str = "decide", multi: bool = False, **extra) -> dict:
    """One made-up ask_human step dict with one question."""
    choices = [{"label": "blue", "detail": ""}, {"label": "green", "detail": ""}] if options else []
    question = {"ask": "Which paint colour goes on the north shed?", "options": choices,
                "multi_select": multi, "free_text": True}
    return {"kind": "ask_human", "detail": {"role": role, "questions": [question]},
            "why_escalated": "Only the human can pick the paint colour."} | extra


def stripped(steps: list) -> list:
    """The steps as the judge must see them: the code-set fields removed."""
    return [{key: value for key, value in step.items() if key not in CODE_FIELDS} for step in steps]


class JudgeRecorder:
    """A stub judge that records each call and returns a fixed score."""

    def __init__(self, score: float = 0.6, notes=("payload: the made-up parts match.",)):
        self.score, self.notes, self.calls = score, list(notes), []

    def __call__(self, brief_text, predicted, expected):
        self.calls.append({"brief_text": brief_text, "predicted": predicted, "expected": expected})
        return (self.score, list(self.notes))


def install_judge(monkeypatch, judge) -> object:
    """Put a stub judge on the judge module. Return the stub."""
    api = require("priority.evaluation.judge")
    monkeypatch.setattr(api, "judge", judge)
    return judge


def as_json(value: object) -> str:
    """A stable JSON text for one payload, used as a dict key."""
    return json.dumps(value, sort_keys=True)
