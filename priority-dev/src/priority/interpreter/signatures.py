"""The DSPy signatures of Triage, Pick, Fill, and Card, and the values that Triage maps to numbers."""
from __future__ import annotations

from typing import Literal

import dspy
from pydantic import BaseModel, Field, create_model, field_validator

from priority.interpreter.models import ACTION_CLASS, ACTION_KINDS, ActionBase, Question, Strict

RISK = {"low": 0.15, "medium": 0.5, "high": 0.85}
HINT = {"can_wait": 0.15, "soon": 0.5, "now": 0.85}
ANSWER_DUE = {"waiting_answer", "waiting_permission", "blocked", "failed"}


class TriageLM(dspy.Signature):
    """Read the end of a run of a coding agent. Report the state of the session.

    status is one of done, waiting_answer, waiting_permission, blocked, failed, continuing. answer_class is one of none, approve_continue, pick_default, provide_fact, decide, external_action. risk is one of low, medium, high. priority_hint is one of can_wait, soon, now. Output uses exactly the declared fields."""

    brief_text: str = dspy.InputField()
    status: Literal["done", "waiting_answer", "waiting_permission", "blocked", "failed", "continuing"] = \
        dspy.OutputField(desc="What the session does now")
    needs_human: bool = dspy.OutputField(desc="True only when no rule or agent can give the answer")
    answer_class: Literal["none", "approve_continue", "pick_default", "provide_fact", "decide",
                          "external_action"] = dspy.OutputField(desc="The kind of answer that is due")
    risk: Literal["low", "medium", "high"] = dspy.OutputField(desc="The cost of a wrong answer")
    priority_hint: Literal["can_wait", "soon", "now"] = dspy.OutputField(desc="How soon the human should look")
    unsure: list[str] = dspy.OutputField(
        desc="Names of the fields above that you are unsure about, or an empty list")


FACT_FIELDS = tuple(n for n in TriageLM.output_fields if n != "unsure")


class PickedStep(BaseModel):
    kind: str = Field(description="The kind of this step")
    evidence_quote: str = Field(default="", description="Exact words from the stop brief. Empty for a human task")
    confidence: float = Field(default=0.0, description="0 to 1")

    @field_validator("kind")
    @classmethod
    def known_kind(cls, value: str) -> str:
        if value not in ACTION_KINDS:
            raise ValueError(f"{value!r} is not an action kind")
        return value


class PickStep(dspy.Signature):
    """Choose the next steps for a waiting coding session, one to three, in the order to do them.
    Quote the words of the stop brief that support each step.

    Choose the kind of each step from allowed_kinds only. Each step has exactly the fields kind, evidence_quote, confidence. Output uses exactly the declared fields."""
    brief_text: str = dspy.InputField()
    facts: str = dspy.InputField(desc="The facts from the triage step, as JSON")
    allowed_kinds: list[str] = dspy.InputField(desc="Choose the kind of each step from these kinds only")
    steps: list[PickedStep] = dspy.OutputField(desc="One to three steps, in order")


class Fill(dspy.Signature):
    """Write the fields of one action for a waiting coding session. Use only facts in the stop brief.

    Write only the payload fields of the action schema for the given kind. Output uses exactly the declared fields."""
    brief_text: str = dspy.InputField()
    kind: str = dspy.InputField(desc="The kind of action to write")
    evidence_quote: str = dspy.InputField(desc="The words of the stop brief that this step answers")
    payload: Strict = dspy.OutputField()  # the type is replaced for each kind


class WriteCard(dspy.Signature):
    """Write the question card that a busy human reads. Be short. Give options only if the agent gave them.

    The card has exactly the fields ask, options, multi_select, free_text, agent_recommendation, helps. Each help has kind one of copy_command, open_file, open_url, explain, plus label and value. Output uses exactly the declared fields."""
    brief_text: str = dspy.InputField()
    card: Question = dspy.OutputField()


class CombinedAction(BaseModel):
    """One step of the one-call variant. The kind stays plain so the code check names the step."""
    kind: str = Field(description="The kind of this step")
    evidence_quote: str = Field(default="", description="Exact words from the stop brief. Empty for a human task")
    confidence: float = Field(default=0.0, description="0 to 1")
    payload: dict = Field(default_factory=dict, description="The fields of the action")


class WriteCombined(dspy.Signature):
    """Write the steps, their payloads, and the question card in one call.

    Choose the kind of each step from allowed_kinds only. Each action has exactly the fields kind, evidence_quote, confidence, payload. The card is null when no card is due. Output uses exactly the declared fields."""
    brief_text: str = dspy.InputField()
    facts: str = dspy.InputField(desc="The facts from the triage step, as JSON")
    allowed_kinds: list[str] = dspy.InputField(desc="Choose the kind of each step from these kinds only")
    actions: list[CombinedAction] = dspy.OutputField(desc="One to three steps with payloads, in order")
    card: Question | None = dspy.OutputField(desc="The question card, or null when no card is due")


def payload_model(cls: type[ActionBase]) -> type[Strict]:
    """The fields of an action that the model writes. Code sets the session, author, quote, and confidence."""
    skip = set(ActionBase.model_fields) | {"kind"}
    fields = {n: (f.annotation, f) for n, f in cls.model_fields.items() if n not in skip}
    return create_model(cls.__name__ + "Payload", __base__=Strict, **fields)


FILL = {k: Fill.with_updated_fields("payload", type_=payload_model(c)) for k, c in ACTION_CLASS.items()}
