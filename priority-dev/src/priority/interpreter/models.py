"""The typed steps of the interpreter: the question, the 13 step payloads, and the call Abstain.

Each step model holds only the fields that the model writes. Code adds `session_id` and `author` to each
step after the call. The design is probes/program-flow-v2.svg.
"""
from __future__ import annotations

from typing import Annotated, Literal, Union, get_args

from pydantic import BaseModel, ConfigDict, Field


class Strict(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)


# ---- The question ------------------------------------------------------------

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


# ---- The steps ---------------------------------------------------------------

class Reply(Strict):
    kind: Literal["reply"] = "reply"
    text: str = Field(max_length=2000)


class Continue(Strict):
    kind: Literal["continue"] = "continue"


class Proof(Strict):
    """What the session must show before the loop ends. Nothing here runs a command."""
    kind: Literal["agent_shows", "human_confirms"]
    command: str | None = None
    show: str = ""


class ContinueUntil(Strict):
    kind: Literal["continue_until"] = "continue_until"
    goal: str = Field(max_length=500)
    proof: Proof
    max_turns: int = Field(ge=1, le=50)
    max_minutes: int = Field(ge=1, le=480)


class ApprovePermission(Strict):
    kind: Literal["approve_permission"] = "approve_permission"
    scope: Literal["once", "session"] = "once"


class DenyPermission(Strict):
    kind: Literal["deny_permission"] = "deny_permission"
    reason: str = ""


class PickOption(Strict):
    kind: Literal["pick_option"] = "pick_option"
    index: int = Field(ge=0)


class ApproveGate(Strict):
    kind: Literal["approve_gate"] = "approve_gate"
    gate: str
    notes: str = ""


class SendFeedback(Strict):
    kind: Literal["send_feedback"] = "send_feedback"
    gate: str | None = None
    notes: str = Field(max_length=2000)


class Interrupt(Strict):
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


class AskHuman(Strict):
    kind: Literal["ask_human"] = "ask_human"
    detail: Annotated[Union[Decide, Do, Review], Field(discriminator="role")]
    why_escalated: str = ""


class Snooze(Strict):
    kind: Literal["snooze"] = "snooze"
    until: str | None = None
    until_event: Literal["session_idle", "turn_end", "none"] = "none"


class Dismiss(Strict):
    kind: Literal["dismiss"] = "dismiss"
    reason: Literal["done", "stale", "duplicate", "fyi_read"]


class Notify(Strict):
    """A finished run becomes a notice. The model takes the excerpt from the final reply."""
    kind: Literal["notify"] = "notify"
    excerpt: str = Field(max_length=600)


Step = Annotated[
    Union[Reply, Continue, ContinueUntil, ApprovePermission, DenyPermission, PickOption,
          ApproveGate, SendFeedback, Interrupt, AskHuman, Snooze, Dismiss, Notify],
    Field(discriminator="kind"),
]
ACTION_KINDS = tuple(c.model_fields["kind"].default for c in get_args(get_args(Step)[0]))


class Abstain(Strict):
    """A Digest or Shrink call, or the brief of the digest command, gave no result. The detail names the fault."""
    reason: Literal["invalid_output", "model_error", "no_agent_reply", "brief_too_large"]
    detail: str = ""
