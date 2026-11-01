"""The one DSPy signature of the interpreter, ProposeStop. Its docstring is the instruction that GEPA rewrites."""
from __future__ import annotations

from typing import Annotated, Literal

import dspy
from pydantic import Field, RootModel

from priority.interpreter.models import Step

MAX_STEPS = 3


class Steps(RootModel[list[Step]]):
    """0 to 3 steps, in run order. The limit is part of the type, because dspy validates the field
    annotation only and moves a `Field(max_length=...)` of a signature field into metadata."""
    root: Annotated[list[Step], Field(max_length=MAX_STEPS)]


class ProposeStop(dspy.Signature):
    """You are the orchestrator of coding sessions. A coding agent stopped, and the stop brief shows its run.
    The brief ends with the final reply of the agent. Report the state of the session.
    Then propose the steps that the system runs for this stop, and give one priority for the whole proposal.

    Use 0 to 3 steps, in the order to run them. Use only facts from the stop brief. Each step has one kind:
    - reply: send a text to the agent.
    - continue: tell the agent to go on.
    - continue_until: let the agent go on until a goal holds, with a proof and turn and minute limits.
    - approve_permission or deny_permission: answer a permission request of the agent.
    - pick_option: choose one option that the agent gave, by its index from 0.
    - approve_gate: approve a gate. send_feedback: return a gate or the work with notes.
    - interrupt: stop the agent.
    - ask_human: send the stop to the human. Put all questions of the stop in one ask_human step.
      The role decide holds the questions, do holds the tasks of the human, and review names the artifact.
    - snooze: wait until a time or an event.
    - dismiss: close the stop with a reason.
    - notify: tell the human that the run finished, with an excerpt of the final reply.

    Field placement and length: `why_escalated` belongs on the ask_human step, next to `kind` and
    `detail`, never inside `detail`. `role` belongs on `detail` only, never inside a question.
    `ask` holds at most 300 characters, and each option `label` holds at most 120 characters.
    Trim or rephrase instead of exceeding a cap.


    The priority tells the system when to show the proposal to the human.
    P1 disturbs the human now with an alert. P2 shows the proposal in the inbox now.
    P3 puts the proposal in the next digest. Use P3 when no step is notify or ask_human."""

    brief_text: str = dspy.InputField(desc="The stop brief. It ends with the final reply of the agent")
    status: Literal["done", "waiting_answer", "waiting_permission", "blocked", "failed", "continuing"] = \
        dspy.OutputField(desc="What the session does now")
    needs_human: bool = dspy.OutputField(desc="True only when no rule or agent can give the answer")
    steps: Steps = dspy.OutputField(desc="0 to 3 steps, in the order to run them")
    priority: Literal["P1", "P2", "P3"] = dspy.OutputField(desc="One priority for the whole proposal")
