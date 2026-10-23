# /// script
# requires-python = ">=3.11"
# dependencies = ["pydantic>=2.7", "dspy[typesafe]==3.4.1"]
# ///
"""Design sketch: the typed input and output of the interpreter.

This file is a sketch. It runs, and `uv run interpreter_schemas.py` checks it.
It is not the code layout. Section numbers refer to ../schemas.md.
"""
from __future__ import annotations

import hashlib
import json
from typing import Annotated, Literal, Union

import dspy
from dspy.experimental import Choice, Noul, Score
from pydantic import BaseModel, ConfigDict, Field


class Strict(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)


# ---- 1. Input -------------------------------------------------------------

Role = Literal["human", "peer", "task_notification", "assistant", "tool_result"]


class SliceRecord(Strict):
    """One transcript record, redacted and clipped."""
    uuid: str
    role: Role
    text: str = Field(max_length=4000)
    tool: str | None = None  # tool name when the record is a tool call
    clipped: bool = False


class PendingPrompt(Strict):
    """A prompt that waits for an answer, seen by a hook or a pane read."""
    prompt_id: str
    source: Literal["hook", "pane", "transcript"]
    kind: Literal["permission", "choice", "free_text", "gate"]
    options: tuple[str, ...] = ()
    tool: str | None = None
    command: str | None = None  # the shell command, redacted


class SessionContext(Strict):
    session_id: str
    project: str
    branch: str | None = None
    workflow_stage: str | None = None  # a CoBuilder gate or slice step, if known
    last_human_reply_at: str | None = None
    answered_by_us_last_hour: int = 0


class TurnSlice(Strict):
    """What the interpreter receives. Built by the interpreter host, never by a model."""
    slice_id: str  # hash of session_id and the last record uuid
    cursor: str  # transcript path and byte offset, for replay
    context: SessionContext
    records: tuple[SliceRecord, ...]
    pending: PendingPrompt | None = None
    redactions: int = 0
    allowed_kinds: tuple[str, ...]  # the action kinds the advisor may name


# ---- 2. Facts (typed decisions, DSPy form) ---------------------------------

StatusT = Annotated[
    Literal["done", "waiting_answer", "waiting_permission", "blocked", "failed", "continuing"],
    Choice[
        ("done", "The agent finished and asks for nothing"),
        ("waiting_answer", "The agent asks a question"),
        ("waiting_permission", "A tool prompt waits for yes or no"),
        ("blocked", "The agent cannot go on without outside help"),
        ("failed", "The agent stopped on an error"),
        ("continuing", "The agent still works"),
    ],
]
NeedsHumanT = Annotated[bool, Noul[(True, "Only the human can answer"), (False, "An advisor may answer")]]
AnswerClassT = Annotated[
    Literal["none", "approve_continue", "pick_default", "provide_fact", "decide", "external_action"],
    Choice[
        ("none", "No answer is due"),
        ("approve_continue", "Yes or go on"),
        ("pick_default", "Pick the option the agent recommends"),
        ("provide_fact", "A fact the human holds"),
        ("decide", "A choice with a cost the human owns"),
        ("external_action", "The human must act outside the session"),
    ],
]
RiskT = Score["low: reversible and local", "medium: costly to undo", "high: destructive or outside"]
PriorityT = Score["can wait", "soon", "now"]


class Triage(dspy.Signature):
    """Read the end of a turn. Report the state of the session."""
    slice_json: str = dspy.InputField()
    status: StatusT = dspy.OutputField()
    needs_human: NeedsHumanT = dspy.OutputField()
    answer_class: AnswerClassT = dspy.OutputField()
    risk: RiskT = dspy.OutputField()
    priority_hint: PriorityT = dspy.OutputField()


class Question(Strict):
    """A typed question card. Taken from the petekp/inbox item (section 3)."""
    ask: str = Field(max_length=300)
    options: tuple[str, ...] = ()
    agent_recommendation: str | None = None  # never counted as the human's answer
    helps: tuple[str, ...] = Field(default=(), max_length=3)


# ---- 3. Actions -------------------------------------------------------------

Author = Literal["interpreter", "human", "rule"]


class ActionBase(Strict):
    session_id: str
    prompt_id: str | None = None  # the prompt that this action answers
    author: Author = "interpreter"
    evidence_quote: str = ""  # an exact substring of the slice, or the action is ask_human
    confidence: float = Field(ge=0, le=1, default=0)


class Reply(ActionBase):
    kind: Literal["reply"] = "reply"
    text: str = Field(max_length=2000)


class Continue(ActionBase):
    kind: Literal["continue"] = "continue"


class ApprovePermission(ActionBase):
    kind: Literal["approve_permission"] = "approve_permission"
    scope: Literal["once", "session"] = "once"


class DenyPermission(ActionBase):
    kind: Literal["deny_permission"] = "deny_permission"
    reason: str = ""


class PickOption(ActionBase):
    kind: Literal["pick_option"] = "pick_option"
    index: int = Field(ge=0)


class Approve(ActionBase):
    kind: Literal["approve"] = "approve"
    gate: str
    notes: str = ""  # Plannotator: "Approve with Notes" when notes exist


class SendFeedback(ActionBase):
    kind: Literal["send_feedback"] = "send_feedback"
    gate: str | None = None
    notes: str = Field(max_length=2000)


class Interrupt(ActionBase):
    kind: Literal["interrupt"] = "interrupt"


class Decide(Strict):
    role: Literal["decide"] = "decide"
    question: Question


class Do(Strict):
    """The human acts outside the session (petekp/inbox do)."""
    role: Literal["do"] = "do"
    steps: tuple[str, ...] = Field(max_length=5)
    where: str = ""  # a URL, a path, or a tool name
    done_check: str = ""  # how we know the human finished


class Review(Strict):
    """The human reads an artifact (Plannotator)."""
    role: Literal["review"] = "review"
    artifact: str  # a path or a PR number
    check_items: tuple[str, ...] = ()


class AskHuman(ActionBase):
    kind: Literal["ask_human"] = "ask_human"
    detail: Annotated[Union[Decide, Do, Review], Field(discriminator="role")]
    why_escalated: str = ""


class Snooze(ActionBase):
    kind: Literal["snooze"] = "snooze"
    until: str | None = None  # an ISO time
    until_event: Literal["session_idle", "turn_end", "none"] = "none"


class Dismiss(ActionBase):
    kind: Literal["dismiss"] = "dismiss"  # petekp/inbox skip
    reason: Literal["done", "stale", "duplicate", "fyi_read"]


class SetPriorityHint(ActionBase):
    kind: Literal["set_priority_hint"] = "set_priority_hint"
    hint: float = Field(ge=0, le=1)  # a hint only: rank is a rule, not the agent


Action = Annotated[
    Union[Reply, Continue, ApprovePermission, DenyPermission, PickOption, Approve,
          SendFeedback, Interrupt, AskHuman, Snooze, Dismiss, SetPriorityHint],
    Field(discriminator="kind"),
]
SESSION_EFFECT = {"reply", "continue", "approve_permission", "deny_permission",
                  "pick_option", "approve", "send_feedback", "interrupt"}


def action_hash(a: ActionBase) -> str:
    """The idempotency key. It does not cover author, evidence, or confidence."""
    body = a.model_dump(exclude={"author", "evidence_quote", "confidence"})
    return hashlib.sha256(json.dumps(body, sort_keys=True).encode()).hexdigest()[:16]


# ---- 4. Output --------------------------------------------------------------

class Facts(Strict):
    status: str
    needs_human: bool
    answer_class: str
    risk: float
    priority_hint: float
    confidence: dict[str, float]  # one entry for each field above


class Interpretation(Strict):
    slice_id: str
    facts: Facts
    question: Question | None = None
    proposals: tuple[Action, ...] = ()  # zero or one in v0.3, a list for later
    abstained: str | None = None  # the reason when the interpreter proposes nothing


# ---- 5. Recommendation record and notification settings ----------------------

class Recommendation(Strict):
    """Stored for every proposal that reaches the human. The pair is training data."""
    proposal_id: str
    slice_id: str
    facts: Facts
    proposed: Action
    shown_to_human: bool


class Outcome(Strict):
    proposal_id: str
    result: Literal["accepted", "edited", "replaced", "rejected", "snoozed", "dismissed"]
    final: Action | None = None  # what the human sent, if anything
    seconds_to_answer: float | None = None


class NotifyConfig(Strict):
    """Every value is a setting. Defaults are the starting values."""
    batch_window_minutes: dict[Literal["N2", "N3"], int] = {"N2": 30, "N3": 30}
    quiet_hours: tuple[str, str] | None = ("22:00", "07:00")  # only N0 passes
    timezone: str = "Australia/Sydney"


class Advise(dspy.Signature):
    """Propose one action for a waiting session, or ask the human."""
    slice_json: str = dspy.InputField()
    facts_json: str = dspy.InputField()
    proposal: Action = dspy.OutputField()


def examples() -> dict[str, Action]:
    q = Question(ask="Use the existing table or add a new one?", options=("existing", "new"),
                 agent_recommendation="existing", helps=("The table has 3 columns",))
    return {
        "reply": Reply(session_id="s1", prompt_id="p1", text="Use Postgres 17.",
                       evidence_quote="Which database should I use?", confidence=0.91),
        "continue": Continue(session_id="s1", evidence_quote="Shall I continue?", confidence=0.97),
        "approve_permission": ApprovePermission(session_id="s1", prompt_id="p2", scope="once",
                                                evidence_quote="Allow Bash(ls -la)?", confidence=0.99),
        "deny_permission": DenyPermission(session_id="s1", prompt_id="p3", reason="Writes outside the repo"),
        "pick_option": PickOption(session_id="s1", prompt_id="p4", index=0,
                                  evidence_quote="1. Existing table (recommended)", confidence=0.88),
        "approve": Approve(session_id="s1", prompt_id="p5", gate="design-review", notes="Check the retry limit.",
                           evidence_quote="Approve the design?", confidence=0.8),
        "send_feedback": SendFeedback(session_id="s1", gate="design-review", notes="Split slice 2 in two."),
        "interrupt": Interrupt(session_id="s1", evidence_quote="rm -rf build/ running", confidence=0.7),
        "ask_human_decide": AskHuman(session_id="s1", detail=Decide(question=q),
                                     why_escalated="Cost of a new table is not in the transcript"),
        "ask_human_do": AskHuman(session_id="s1", why_escalated="Needs the AWS console",
                                 detail=Do(steps=("Open the console", "Create the bucket"), where="aws console",
                                           done_check="Bucket name appears in the next prompt")),
        "ask_human_review": AskHuman(session_id="s1", why_escalated="Gate needs a person",
                                     detail=Review(artifact="docs/plans/x/04-slices.md", check_items=("Slice order",))),
        "snooze": Snooze(session_id="s1", until_event="turn_end"),
        "dismiss": Dismiss(session_id="s1", reason="fyi_read"),
        "set_priority_hint": SetPriorityHint(session_id="s1", hint=0.8),
    }


if __name__ == "__main__":
    a = ApprovePermission(session_id="s1", prompt_id="p1", evidence_quote="Allow Bash(ls)?")
    b = ApprovePermission(session_id="s1", prompt_id="p1", author="human")
    assert action_hash(a) == action_hash(b)
    parsed = Interpretation.model_validate_json(
        Interpretation(slice_id="x", facts=Facts(status="done", needs_human=False,
        answer_class="none", risk=0.1, priority_hint=0.1, confidence={"status": 0.9}),
        proposals=(a,)).model_dump_json())
    assert parsed.proposals[0].kind == "approve_permission"
    ex = examples()
    for k, v in ex.items():
        assert type(v).model_validate_json(v.model_dump_json()) == v, k
    if len(__import__("sys").argv) > 1:
        out = {k: json.loads(v.model_dump_json()) for k, v in ex.items()}
        out["notify_config"] = json.loads(NotifyConfig().model_dump_json())
        print(json.dumps(out, indent=2)); raise SystemExit
    print(Triage.output_fields.keys(), len(SESSION_EFFECT), "session actions")
    print("ok")
