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
from pydantic import BaseModel, ConfigDict, Field, model_validator


class Strict(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)


def digest(*parts: str) -> str:
    return hashlib.sha256("\x1f".join(parts).encode()).hexdigest()[:16]


# ---- 1. Input: the stop brief ----------------------------------------------
# A stop brief is one run: from the record that woke the agent to the stop that
# waits. Code reads structured transcript records. It judges no meaning.

class AssistantText(Strict):
    """Text that the agent wrote before a tool call. Never clipped."""
    type: Literal["text"] = "text"
    text: str


class ToolExchange(Strict):
    """One tool call with its result, paired by tool_use_id. Never clipped in storage."""
    type: Literal["tool"] = "tool"
    tool: str
    input: str  # the command, path, or prompt, redacted
    result: str  # the full result text, redacted
    is_error: bool  # from the result record. A failed Bash call also starts with "Exit code N"


RunItem = Annotated[Union[AssistantText, ToolExchange], Field(discriminator="type")]


class Ask(Strict):
    """What woke the agent. The origin comes from the record, never from a guess."""
    origin: Literal["human", "goal_hook", "task_notification", "peer"]
    text: str


class GoalState(Strict):
    text: str
    stop_attempts: int  # stop hook feedback records seen since the goal was set
    last_reason: str | None = None  # the reason that the last stop attempt was refused
    proof: "Proof | None" = None  # what the session must show, set by continue_until


class RunDigest(Strict):
    """A model summary of one finished run. The Digest call makes it at each stop."""
    ran: str = Field(max_length=600)  # what the agent did, in plain words
    result: str = Field(max_length=300)  # how the run ended
    open_items: tuple[str, ...] = Field(default=(), max_length=5)  # questions and tasks left open
    decisions: tuple[str, ...] = Field(default=(), max_length=5)  # choices made in the run, by the agent or the human


class PendingPrompt(Strict):
    """A prompt that waits for an answer."""
    prompt_id: str
    source: Literal["hook", "pane", "transcript"]  # a transcript prompt is an AskUserQuestion call
    kind: Literal["permission", "choice", "free_text", "gate"]
    options: tuple[str, ...] = ()
    multi_select: bool = False
    tool: str | None = None
    command: str | None = None  # the shell command, redacted


class SessionContext(Strict):
    session_id: str
    project: str
    branch: str | None = None
    workflow_stage: str | None = None  # a CoBuilder gate or stop brief step, if known
    last_human_reply_at: str | None = None
    answered_by_us_last_hour: int = 0


class StopBrief(Strict):
    """The exact input of the interpreter. Built by code, stored once, never edited."""
    brief_id: str  # digest of the session id and the uuid of the stop record
    cursor: str  # transcript path and byte offset, to find the source again
    trigger: Literal["end_turn", "goal_stop_attempt", "question_tool", "permission_wait"]
    context: SessionContext
    ask: Ask
    goal: GoalState | None = None
    items: tuple[RunItem, ...] = ()  # the run in order: text, and each tool call with its result
    last_thinking: str | None = None  # off by default, a lab ablation
    final: str  # the last assistant message of the run, in full, redacted
    previous: RunDigest | None = None  # the Digest of the run before, a stored fact
    pending: PendingPrompt | None = None
    redactions: int = 0
    allowed_kinds: tuple[str, ...]  # the action kinds the advisor may name

    def for_model(self, agent_reports_first: bool = False) -> str:
        """The text that the models read. It leaves out the ids, the cursor, and the kinds.

        agent_reports_first is a lab option. It copies each Agent exchange into a block at the top.
        """
        d = json.loads(self.model_dump_json(exclude={"brief_id", "cursor", "redactions", "allowed_kinds"},
                                            exclude_none=True))
        if agent_reports_first:
            d = {"agent_reports": [i for i in d.get("items", []) if i.get("tool") == "Agent"], **d}
        return json.dumps(d)


class InterpreterCall(Strict):
    """One model call, stored with the exact text that the model received."""
    call_id: str
    brief_id: str
    stage: Literal["triage", "advise", "digest", "shrink"]
    model: str
    rendered_input: str  # the exact text that the model received
    shrunk_items: int = 0  # tool results that the Shrink call replaced, only when the stop brief was over budget
    output_json: str
    latency_ms: int


# ---- 2. Facts: one Jev call with five typed questions ----------------------

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
    brief_json: str = dspy.InputField()
    status: StatusT = dspy.OutputField(desc="What the session does now")
    needs_human: NeedsHumanT = dspy.OutputField(desc="Whether only the human can give the answer")
    answer_class: AnswerClassT = dspy.OutputField(desc="The kind of answer that is due")
    risk: RiskT = dspy.OutputField(desc="The cost of a wrong answer")
    priority_hint: PriorityT = dspy.OutputField(desc="How soon the human should look")


class Facts(Strict):
    status: str
    needs_human: bool
    answer_class: str
    risk: float
    priority_hint: float
    confidence: dict[str, float]  # one entry for each field above


# ---- 3. The question card --------------------------------------------------

class Option(Strict):
    label: str = Field(max_length=120)
    detail: str = ""


class Help(Strict):
    """A button that helps the human answer. The kinds are our own."""
    kind: Literal["copy_command", "open_file", "open_url", "explain"]
    label: str
    value: str  # the command, the path, the URL, or the text to explain


class Question(Strict):
    ask: str = Field(max_length=300)
    options: tuple[Option, ...] = ()
    multi_select: bool = False
    free_text: bool = True  # the human may type an answer that is not an option
    agent_recommendation: str | None = None  # never counted as the human's answer
    helps: tuple[Help, ...] = Field(default=(), max_length=3)


# ---- 4. Actions ------------------------------------------------------------

Author = Literal["interpreter", "human", "rule"]


class ActionBase(Strict):
    session_id: str
    prompt_id: str | None = None  # the prompt that this action answers
    author: Author = "interpreter"
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
    command: str | None = None  # the command that the agent must run and report
    show: str = ""  # what to report, for example "the exit code and the last 20 lines"


class ContinueUntil(ActionBase):
    """Send continue after each turn until the proof passes or a budget ends."""
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
    """A CoBuilder gate: design, implement, or another approval stage of the workflow."""
    kind: Literal["approve_gate"] = "approve_gate"
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
    hint: float = Field(ge=0, le=1)  # an input to the ranking rule, not the rank


Action = Annotated[
    Union[Reply, Continue, ContinueUntil, ApprovePermission, DenyPermission, PickOption,
          ApproveGate, SendFeedback, Interrupt, AskHuman, Snooze, Dismiss, SetPriorityHint],
    Field(discriminator="kind"),
]
SESSION_EFFECT = {"reply", "continue", "continue_until", "approve_permission", "deny_permission",
                  "pick_option", "approve_gate", "send_feedback", "interrupt"}


def action_hash(a: ActionBase) -> str:
    """The idempotency key. It does not cover author, evidence, or confidence."""
    body = a.model_dump(exclude={"author", "evidence_quote", "confidence"})
    return digest(json.dumps(body, sort_keys=True))


class Proposal(Strict):
    """One to three steps. The policy decides each step on its own, in order."""
    proposal_id: str
    brief_id: str
    steps: tuple[Action, ...] = Field(min_length=1, max_length=3)
    rationale: str = Field(default="", max_length=300)

    @model_validator(mode="after")
    def check_steps(self) -> "Proposal":
        sessions = {a.session_id for a in self.steps if a.kind in SESSION_EFFECT}
        if len(sessions) > 1:
            raise ValueError("session steps must target one session")
        gates = [a.gate for a in self.steps if a.kind == "approve_gate"]
        if any(a.kind == "send_feedback" and a.gate in gates for a in self.steps):
            raise ValueError("a gate cannot be approved and returned in one proposal")
        return self


# ---- 5. Output of the interpreter ------------------------------------------

class Abstain(Strict):
    """The interpreter proposes nothing. The inbox gets an ask_human item instead."""
    brief_id: str
    reason: Literal["quote_not_in_brief", "invalid_output", "model_timeout",
                    "model_error", "brief_empty", "kind_not_allowed"]
    detail: str = ""


class EvidenceCheck(Strict):
    """Only in a goal run. The advisor quotes what the agent showed. Code checks the quotes."""
    claimed_met: bool
    command_quote: str = ""  # the command, as it appears in a tool call of this run
    result_quote: str = ""  # the text, as it appears in the result of that call


def check_evidence(sl: "StopBrief", ev: EvidenceCheck) -> tuple[bool, str]:
    """Code, no model. It reads the transcript record of the call that really ran."""
    proof = sl.goal.proof if sl.goal else None
    if proof is None or proof.kind != "agent_shows" or not proof.command:
        return False, "no command to check"
    for it in sl.items:
        if isinstance(it, ToolExchange) and it.tool == "Bash" and proof.command in it.input:
            if it.is_error:
                return False, "the command failed"
            if ev.result_quote not in it.result:
                return False, "the quoted result is not in the tool result"
            return True, "the command ran, passed, and the quote is in its result"
    return False, "the command did not run in this run"


class Advice(Strict):
    """What the advisor returns: a card for the human, and a proposal."""
    question: Question | None = None
    proposal: Proposal
    evidence: EvidenceCheck | None = None


class Interpretation(Strict):
    brief_id: str
    facts: Facts
    advice: Advice | None = None
    abstained: Abstain | None = None


class Advise(dspy.Signature):
    """Write the question card and propose the next steps for a waiting session."""
    brief_json: str = dspy.InputField()
    facts_json: str = dspy.InputField(desc="The five typed facts from the triage call")
    advice: Advice = dspy.OutputField()


class Digest(dspy.Signature):
    """Summarise one finished run of a coding agent for the next stop brief of the same session."""
    brief_json: str = dspy.InputField()
    digest: RunDigest = dspy.OutputField()


class Shrink(dspy.Signature):
    """Shorten one tool result. Keep errors, file names, numbers, and the last lines."""
    tool: str = dspy.InputField()
    text: str = dspy.InputField()
    target_chars: int = dspy.InputField()
    short: str = dspy.OutputField()


RENDER_BUDGET_CHARS = 160_000  # a guess: about 40,000 tokens. Only over this does Shrink run


# ---- 6. Stored recommendation and settings ---------------------------------

class Recommendation(Strict):
    """Stored for every proposal, shown to the human or not."""
    proposal: Proposal
    facts: Facts
    shown_to_human: bool
    call_ids: tuple[str, ...]  # the InterpreterCall rows that made it


class Outcome(Strict):
    proposal_id: str
    result: Literal["accepted", "edited", "replaced", "rejected", "snoozed", "dismissed"]
    final: Proposal | None = None  # what the human sent, if anything
    seconds_to_answer: float | None = None


class NotifyConfig(Strict):
    """Every value is a setting. Defaults are the starting values."""
    batch_window_minutes: int = Field(default=30, ge=1)  # one batch is one notification
    quiet_hours: tuple[str, str] | None = ("22:00", "07:00")  # only N0 passes
    timezone: str = "Australia/Sydney"


# ---- 7. Example data -------------------------------------------------------

def example_brief() -> StopBrief:
    return StopBrief(
        brief_id=digest("sess-7c1", "rec-0412"), cursor="~/.claude/projects/-work-exporter/7c1e.jsonl@184220",
        trigger="end_turn",
        context=SessionContext(session_id="sess-7c1", project="exporter", branch="stop brief-2-csv",
                               workflow_stage="implement: @@stop brief@@ 2 of 5", answered_by_us_last_hour=1),
        ask=Ask(origin="human", text="Build @@stop brief@@ 2: the CSV export endpoint. Run the tests before you stop."),
        items=(
            AssistantText(text="I will read the routes first, then add the writer."),
            ToolExchange(tool="Read", input="src/export/routes.py", result="def export_routes(app):\n    ...", is_error=False),
            ToolExchange(tool="Edit", input="src/export/csv_writer.py", result="File updated.", is_error=False),
            ToolExchange(tool="Bash", input="pytest tests/export -q",
                         result="Exit code 1\nFAILED tests/export/test_csv.py::test_header_order\n1 failed, 13 passed",
                         is_error=True),
            AssistantText(text="One test fails on the header order. I fix the column list and run the tests again."),
            ToolExchange(tool="Edit", input="src/export/csv_writer.py", result="File updated.", is_error=False),
            ToolExchange(tool="Bash", input="pytest tests/export -q", result="14 passed in 0.9s", is_error=False),
        ),
        final=("Stop brief 2 is done. 14 tests pass.\n\nBefore I start @@stop brief@@ 3, one question. "
               "Should the CSV timestamps use UTC or the project timezone?\n"
               "1. UTC (I recommend this: it matches the API)\n2. The project timezone\n"
               "Reply 1 or 2."),
        previous=RunDigest(ran="Built the export model and its 9 tests.", result="Stop brief 1 done, tests pass.",
                           decisions=("Money fields use integer cents",)),
        redactions=0, allowed_kinds=tuple(sorted(SESSION_EFFECT | {"ask_human", "snooze", "dismiss"})),
    )


def example_goal_brief() -> StopBrief:
    """A goal run at a stop attempt. The agent shows the evidence that the loop asked for."""
    base = example_brief()
    return base.model_copy(update={
        "trigger": "goal_stop_attempt",
        "ask": Ask(origin="goal_hook", text="Stop hook feedback: [All 5 stop briefs pass their tests]: not yet shown"),
        "goal": GoalState(text="All 5 stop briefs pass their tests", stop_attempts=2, last_reason="no test output shown",
                          proof=Proof(kind="agent_shows", command="pytest -q",
                                      show="the exit code and the last 5 lines of output")),
        "items": (ToolExchange(tool="Bash", input="pytest -q", result="68 passed in 4.1s", is_error=False),),
        "final": "All 5 stop briefs are built. I ran pytest -q: 68 passed in 4.1s.",
    })


def example_facts() -> Facts:
    return Facts(status="waiting_answer", needs_human=False, answer_class="pick_default", risk=0.2,
                 priority_hint=0.3, confidence={"status": 0.93, "needs_human": 0.81, "answer_class": 0.88,
                                                "risk": 0.74, "priority_hint": 0.6})


def examples() -> dict[str, BaseModel]:
    s = example_brief()
    q = Question(
        ask="Use UTC or the project timezone for the CSV timestamps?",
        options=(Option(label="UTC", detail="Matches the API"), Option(label="Project timezone")),
        agent_recommendation="UTC",
        helps=(Help(kind="open_file", label="Open the API spec", value="docs/api.md"),
               Help(kind="copy_command", label="Show the timestamp column", value="head -3 out/export.csv")),
    )
    reply = Reply(session_id="sess-7c1", text="1", evidence_quote="1. UTC (I recommend this", confidence=0.9)
    one = Proposal(proposal_id="p-1", brief_id=s.brief_id, steps=(reply,), rationale="The agent recommends UTC.")
    two = Proposal(proposal_id="p-2", brief_id=s.brief_id, rationale="Answer the question, then run to the end of the plan.", steps=(
        reply,
        ContinueUntil(session_id="sess-7c1", goal="Stop briefs 3 to 5 pass their tests", max_turns=20, max_minutes=120,
                      proof=Proof(kind="agent_shows", command="pytest -q", show="the exit code and the last 5 lines"), evidence_quote="Before I start @@stop brief@@ 3"),
    ))
    return {
        "stop_brief": s,
        "facts": example_facts(),
        "interpreter_call_triage": InterpreterCall(
            call_id="c-1", brief_id=s.brief_id, stage="triage", model="typesafe:jev-latest",
            rendered_input="(the state and the five questions, see schemas.md section 10)",
            output_json=example_facts().model_dump_json(), latency_ms=410),
        "advice_with_question_card": Advice(question=q, proposal=one),
        "run_digest": s.previous,
        "goal_brief": example_goal_brief(),
        "evidence_check": EvidenceCheck(claimed_met=True, command_quote="pytest -q", result_quote="68 passed in 4.1s"),
        "proposal_two_steps": two,
        "abstain": Abstain(brief_id=s.brief_id, reason="quote_not_in_brief",
                           detail="The quote 'Use UTC, as agreed' is not in the stop brief"),
        "continue_until": ContinueUntil(
            session_id="sess-7c1", goal="All 5 stop briefs pass their tests", max_turns=20, max_minutes=120,
            proof=Proof(kind="agent_shows", command="pytest -q", show="the exit code and the last 5 lines"), evidence_quote="Reply 1 or 2.", confidence=0.7),
        "ask_human_do": AskHuman(session_id="sess-7c1", why_escalated="Needs the AWS console", detail=Do(
            steps=("Open the console", "Create the bucket"), where="aws console",
            done_check="The bucket name appears in the next prompt")),
        "ask_human_review": AskHuman(session_id="sess-7c1", why_escalated="The gate needs a person",
                                     detail=Review(artifact="docs/plans/x/04-stop briefs.md", check_items=("Stop brief order",))),
        "recommendation": Recommendation(proposal=one, facts=example_facts(), shown_to_human=False,
                                         call_ids=("c-1", "c-2")),
        "outcome": Outcome(proposal_id="p-1", result="accepted", final=one, seconds_to_answer=41.0),
        "notify_config": NotifyConfig(),
    }


if __name__ == "__main__":
    ex = examples()
    for k, v in ex.items():
        assert type(v).model_validate_json(v.model_dump_json()) == v, k
    try:
        Proposal(proposal_id="x", brief_id="y", steps=(ApproveGate(session_id="s", gate="g"),
                                                       SendFeedback(session_id="s", gate="g", notes="n")))
        raise SystemExit("a contradictory plan passed")
    except ValueError:
        pass
    g = example_goal_brief()
    assert check_evidence(g, EvidenceCheck(claimed_met=True, command_quote="pytest -q", result_quote="68 passed"))[0]
    assert not check_evidence(g, EvidenceCheck(claimed_met=True, result_quote="70 passed"))[0]
    assert not check_evidence(example_brief(), EvidenceCheck(claimed_met=True))[0]  # no goal, no check
    fail = g.model_copy(update={"items": (ToolExchange(tool="Bash", input="pytest -q", result="Exit code 1", is_error=True),)})
    assert not check_evidence(fail, EvidenceCheck(claimed_met=True, result_quote="Exit"))[0]
    assert not check_evidence(g.model_copy(update={"items": ()}), EvidenceCheck(claimed_met=True))[0]
    a = ApprovePermission(session_id="s1", prompt_id="p1", evidence_quote="Allow Bash(ls)?")
    b = ApprovePermission(session_id="s1", prompt_id="p1", author="human")
    assert action_hash(a) == action_hash(b)
    if len(__import__("sys").argv) > 1:
        print(json.dumps({k: json.loads(v.model_dump_json()) for k, v in ex.items()}, indent=2))
        raise SystemExit
    print(list(Triage.output_fields), len(SESSION_EFFECT), "session actions")
    print("ok")
