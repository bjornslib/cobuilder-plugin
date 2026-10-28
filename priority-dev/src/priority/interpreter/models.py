"""The typed output of the interpreter: facts, question card, the 14 actions, and the Interpretation.

The types follow docs/design/schemas/interpreter_schemas.py, sections 2 to 5.
"""
from __future__ import annotations

import hashlib
from typing import Annotated, Literal, Union, get_args

from pydantic import BaseModel, ConfigDict, Field, model_validator


class Strict(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)


def digest(*parts: str) -> str:
    return hashlib.sha256("\x1f".join(parts).encode()).hexdigest()[:16]


# ---- Facts and the question card ---------------------------------------------

class Facts(Strict):
    status: str
    needs_human: bool
    answer_class: str
    risk: float
    priority_hint: float
    confidence: dict[str, float]  # one entry for each field above


class Option(Strict):
    label: str = Field(max_length=120)
    detail: str = ""


class Help(Strict):
    """A button that helps the human answer."""
    kind: Literal["copy_command", "open_file", "open_url", "explain"]
    label: str
    value: str


class Question(Strict):
    ask: str = Field(max_length=300)
    options: tuple[Option, ...] = ()
    multi_select: bool = False
    free_text: bool = True
    agent_recommendation: str | None = None  # never counted as the human's answer
    helps: tuple[Help, ...] = Field(default=(), max_length=3)


# ---- Actions -----------------------------------------------------------------

class ActionBase(Strict):
    session_id: str
    prompt_id: str | None = None
    author: Literal["interpreter", "human", "rule"] = "interpreter"
    evidence_quote: str = ""  # an exact substring of the stop brief, or the action is ask_human
    confidence: float = Field(ge=0, le=1, default=0)


class Reply(ActionBase):
    kind: Literal["reply"] = "reply"
    text: str = Field(max_length=2000)


class Continue(ActionBase):
    kind: Literal["continue"] = "continue"


class Proof(Strict):
    """What the session must show before the loop ends. Nothing here runs a command."""
    kind: Literal["agent_shows", "human_confirms"]
    command: str | None = None
    show: str = ""


class ContinueUntil(ActionBase):
    kind: Literal["continue_until"] = "continue_until"
    goal: str = Field(max_length=500)
    proof: Proof
    max_turns: int = Field(ge=1, le=50)
    max_minutes: int = Field(ge=1, le=480)


class ApprovePermission(ActionBase):
    kind: Literal["approve_permission"] = "approve_permission"
    scope: Literal["once", "session"] = "once"


class DenyPermission(ActionBase):
    kind: Literal["deny_permission"] = "deny_permission"
    reason: str = ""


class PickOption(ActionBase):
    kind: Literal["pick_option"] = "pick_option"
    index: int = Field(ge=0)


class ApproveGate(ActionBase):
    kind: Literal["approve_gate"] = "approve_gate"
    gate: str
    notes: str = ""


class SendFeedback(ActionBase):
    kind: Literal["send_feedback"] = "send_feedback"
    gate: str | None = None
    notes: str = Field(max_length=2000)


class Interrupt(ActionBase):
    kind: Literal["interrupt"] = "interrupt"


class Decide(Strict):
    role: Literal["decide"] = "decide"
    questions: tuple[Question, ...] = Field(min_length=1)


class Do(Strict):
    """The human acts outside the session."""
    role: Literal["do"] = "do"
    steps: tuple[str, ...] = Field(max_length=5)
    where: str = ""
    done_check: str = ""


class Review(Strict):
    """The human reads an artifact."""
    role: Literal["review"] = "review"
    artifact: str
    check_items: tuple[str, ...] = ()


class AskHuman(ActionBase):
    kind: Literal["ask_human"] = "ask_human"
    detail: Annotated[Union[Decide, Do, Review], Field(discriminator="role")]
    why_escalated: str = ""


class Snooze(ActionBase):
    kind: Literal["snooze"] = "snooze"
    until: str | None = None
    until_event: Literal["session_idle", "turn_end", "none"] = "none"


class Dismiss(ActionBase):
    kind: Literal["dismiss"] = "dismiss"
    reason: Literal["done", "stale", "duplicate", "fyi_read"]


class Notify(ActionBase):
    """A finished run becomes a notice. Code sets the excerpt from the final reply."""
    kind: Literal["notify"] = "notify"
    excerpt: str = Field(max_length=600)


class SetPriorityHint(ActionBase):
    kind: Literal["set_priority_hint"] = "set_priority_hint"
    hint: float = Field(ge=0, le=1)


Action = Annotated[
    Union[Reply, Continue, ContinueUntil, ApprovePermission, DenyPermission, PickOption,
          ApproveGate, SendFeedback, Interrupt, AskHuman, Snooze, Dismiss, SetPriorityHint, Notify],
    Field(discriminator="kind"),
]
ACTION_CLASS = {c.model_fields["kind"].default: c for c in get_args(get_args(Action)[0])}
ACTION_KINDS = tuple(ACTION_CLASS)
SESSION_EFFECT = {"reply", "continue", "continue_until", "approve_permission", "deny_permission",
                  "pick_option", "approve_gate", "send_feedback", "interrupt"}


# ---- Output ------------------------------------------------------------------

class Proposal(Strict):
    """One to three steps. The policy decides each step on its own, in order."""
    proposal_id: str
    brief_id: str
    steps: tuple[Action, ...] = Field(min_length=1, max_length=3)
    rationale: str = Field(default="", max_length=300)

    @model_validator(mode="after")
    def check_steps(self) -> "Proposal":
        if len({a.session_id for a in self.steps if a.kind in SESSION_EFFECT}) > 1:
            raise ValueError("session steps must target one session")
        gates = [a.gate for a in self.steps if a.kind == "approve_gate"]
        if any(a.kind == "send_feedback" and a.gate in gates for a in self.steps):
            raise ValueError("a gate cannot be approved and returned in one proposal")
        return self


class Advice(Strict):
    question: Question | None = None
    proposal: Proposal


class Abstain(Strict):
    """The interpreter proposes nothing. The detail names the step that failed a check."""
    reason: Literal["quote_not_in_brief", "kind_not_allowed", "invalid_output", "model_error",
                    "no_agent_reply", "brief_too_large"]
    detail: str = ""


class Interpretation(Strict):
    brief_id: str
    facts: Facts | None = None
    advice: Advice | None = None
    abstained: Abstain | None = None
