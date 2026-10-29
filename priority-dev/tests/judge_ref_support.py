"""Helpers for the slice 20 RED tests: reference payloads and judge validation.

Every step, label, brief, and judge reply here is made up. The tests stub
`priority.evaluation.judge.judge`, which the metric resolves at call time,
so no helper makes a model call.
"""
from __future__ import annotations

import json

from eval_support import BRIEF_TEXT, FACT_FIELDS, make_example, make_prediction  # noqa: F401
from fixtures_support import make_label, require

CODE_FIELDS = ("session_id", "author", "confidence", "evidence_quote")
CODE = {"session_id": "made-up-session", "author": "interpreter",
        "confidence": 0.9, "evidence_quote": "four green valves"}
STUB_NOTE = "judge stub: no judge model reached, scored 0"
MISSING = object()


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


def ref_example(reference: object, label_number: int = 1) -> dict:
    """One metric example for a made-up stop with the given reference payloads."""
    return make_example(make_label(label_number)) | {"expected_payloads": reference}


def candidate(payloads: object = MISSING, label_number: int = 1, **overrides) -> dict:
    """One flat prediction dict; `payloads` stays absent unless given."""
    prediction = make_prediction(make_label(label_number), **overrides)
    if payloads is not MISSING:
        prediction["payloads"] = payloads
    return prediction


def made_steps() -> list:
    """Two real model steps with every code-set field filled."""
    models = require("priority.interpreter.models")
    return [models.Reply(text="Use the blue paint.", **CODE),
            models.Dismiss(reason="done", **CODE)]


def made_interp(steps: list | None = None, status: str = "continuing",
                abstain: str | None = None) -> object:
    """A real Interpretation: with steps, with no advice, or abstained."""
    models = require("priority.interpreter.models")
    signatures = require("priority.interpreter.signatures")
    facts = models.Facts(status=status, needs_human=False, answer_class="none",
                         risk=signatures.RISK["low"], priority_hint=signatures.HINT["can_wait"],
                         confidence={name: 0.9 for name in FACT_FIELDS})
    if abstain is not None:
        return models.Interpretation(brief_id="b-made-up", facts=facts, abstained=models.Abstain(
            reason=abstain, detail="made-up detail"))
    if steps is None:
        return models.Interpretation(brief_id="b-made-up", facts=facts)
    proposal = models.Proposal(proposal_id="p-made-up", brief_id="b-made-up", steps=tuple(steps))
    return models.Interpretation(brief_id="b-made-up", facts=facts,
                                 advice=models.Advice(proposal=proposal))


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


def score_of(example, prediction, *gepa_args):
    """Run the metric. Extra args go through the five-argument GEPA call."""
    return require("priority.evaluation.metric").score(example, prediction, *gepa_args)


def as_json(value: object) -> str:
    """A stable JSON text for one payload list, used as a dict key."""
    return json.dumps(value, sort_keys=True)
