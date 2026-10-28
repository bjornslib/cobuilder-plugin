"""The Interpreter: Triage, Pick, one Fill for each step, and Card, as small DSPy calls.

Code, not the model, sets the session, the author, the quote, and the confidence of each step, and checks
the kind and the quote. Every failure ends as an Abstain with a logged reason. No exception leaves forward.
"""
from __future__ import annotations

import logging
import re
from pathlib import Path
from typing import Any

import dspy
from dspy.utils.exceptions import AdapterParseError
from pydantic import ValidationError

from priority import config
from priority.interpreter.calls import CallRecorder
from priority.interpreter.checks import check_fill_payload, check_steps
from priority.interpreter.models import (ACTION_CLASS, ACTION_KINDS, Abstain, Advice, Facts, Interpretation,
                                         Notify, Proposal, digest)
from priority.interpreter.signatures import (ANSWER_DUE, FACT_FIELDS, FILL, HINT, RISK, PickStep, TriageLM,
                                             WriteCard, WriteCombined, payload_model)

INTERPRETER_MODEL = config.model()
MAX_TOKENS = 3000  # a reasoning model spends tokens on its reasoning first, so a low cap cuts the reply
log = logging.getLogger("priority.interpreter")
# The fallback of ChatAdapter would make a second model call after a parse fault. A run makes one.
ADAPTERS = {"chat": lambda: dspy.ChatAdapter(use_json_adapter_fallback=False), "json": dspy.JSONAdapter}


NOTIFY_LIMIT = 600


def notify_excerpt(final: str, limit: int = NOTIFY_LIMIT) -> str:
    """The first `limit` characters of the final reply, cut back to the last sentence end."""
    head = final[:limit]
    ends = [match.end() for match in re.finditer(r"[.!?]", head)]
    return head[: ends[-1]] if ends else head


def interpreter_lm(retries: int = 0) -> dspy.LM:
    """The real interpreter model. Only the command line calls this, because it reads the key."""
    return dspy.LM(INTERPRETER_MODEL, api_key=config.load_key(), api_base=config.base_url(),
                   temperature=config.temperature(), max_tokens=MAX_TOKENS, timeout=120, num_retries=retries, cache=False)


class _Fault(Exception):
    """A step of the run failed. It carries the Abstain."""

    def __init__(self, abstain: Abstain):
        super().__init__(abstain.detail)
        self.abstain = abstain


class Interpreter(dspy.Module):
    def __init__(self, lm: dspy.LM | None = None, *, allowed_kinds: tuple[str, ...] = ACTION_KINDS,
                 log_dir: Path | str | None = None, session_id: str = "", adapter: str = "chat",
                 variant: str = "chain"):
        super().__init__()
        if adapter not in ADAPTERS:
            raise ValueError(f"unknown adapter {adapter!r}: use one of {', '.join(map(repr, ADAPTERS))}")
        if variant not in ("chain", "combined"):
            raise ValueError(f"unknown variant {variant!r}: use one of 'chain', 'combined'")
        self.lm, self.allowed_kinds, self.log_dir, self.session_id = lm, tuple(allowed_kinds), log_dir, session_id
        self.adapter_name, self.variant = adapter, variant
        self.triage = dspy.Predict(TriageLM)
        self.pick = dspy.Predict(PickStep)
        self.fill = {kind: dspy.Predict(signature) for kind, signature in FILL.items()}
        self.card = dspy.Predict(WriteCard)
        self.combined = dspy.Predict(WriteCombined)

    def forward(self, brief=None, brief_text=None, final_text=None) -> Interpretation:
        """Run the chain on one brief. The optimiser passes `brief_text` and `final_text`."""
        if brief is None:
            brief = brief_text
        if brief is None:
            raise ValueError("Interpreter needs a brief or brief_text")
        if isinstance(brief, str):
            text, final = brief, final_text or ""
        else:
            text, final = brief.for_model(), brief.final
        recorder = CallRecorder(self.log_dir, self.adapter_name)
        run = _Run(self, text, recorder, digest(text), final)
        adapter = ADAPTERS[self.adapter_name]()
        try:
            with dspy.context(lm=self.lm or dspy.settings.lm, adapter=adapter, callbacks=[recorder]):
                return run.interpret()
        except _Fault as fault:
            log.warning("abstain %s: %s", fault.abstain.reason, fault.abstain.detail)
            return Interpretation(brief_id=run.brief_id, facts=run.facts, abstained=fault.abstain)


class _Run:
    """The state of one run: the brief text, the facts so far, and the call recorder."""

    def __init__(self, owner: Interpreter, text: str, recorder: CallRecorder, brief_id: str, final: str):
        self.owner, self.text, self.recorder, self.brief_id = owner, text, recorder, brief_id
        self.final = final
        self.facts: Facts | None = None

    def call(self, stage: str, predictor: dspy.Predict, **inputs: Any):
        """One model call. A parse fault gives invalid_output, and any other error gives model_error."""
        self.recorder.stage = stage
        valid = False
        try:
            reply = predictor(brief_text=self.text, **inputs)
            valid = True
            return reply
        except (AdapterParseError, ValidationError) as error:
            abstain = Abstain(reason="invalid_output", detail=f"{stage}: {type(error).__name__}: {error}")
        except Exception as error:  # noqa: BLE001  (a model call may raise anything, and none may escape)
            abstain = Abstain(reason="model_error", detail=f"{stage}: {type(error).__name__}: {error}")
        finally:
            self.recorder.commit(valid)
        raise _Fault(abstain)

    def interpret(self) -> Interpretation:
        reply = self.call("triage", self.owner.triage)
        unsure = [name for name in reply.unsure if name in FACT_FIELDS]
        self.facts = Facts(status=reply.status, needs_human=reply.needs_human, answer_class=reply.answer_class,
                           risk=RISK[reply.risk], priority_hint=HINT[reply.priority_hint],
                           confidence={name: 0.5 if name in unsure else 0.9 for name in FACT_FIELDS})
        if reply.status == "done" and not unsure:
            return self.done_outcome()
        if reply.status not in ANSWER_DUE and not unsure:
            return Interpretation(brief_id=self.brief_id, facts=self.facts)
        if self.owner.variant == "combined":
            return self.combined_outcome()
        picked = self.call("pick", self.owner.pick, facts=self.facts.model_dump_json(),
                           allowed_kinds=list(self.owner.allowed_kinds)).steps
        abstain = check_steps(self.text, picked, self.owner.allowed_kinds)
        if abstain:
            raise _Fault(abstain)
        steps = [self.step(number, step) for number, step in enumerate(picked, start=1)]
        card = self.call("card", self.owner.card).card if self.facts.needs_human else None
        try:
            proposal = Proposal(proposal_id="p-" + self.brief_id, brief_id=self.brief_id, steps=tuple(steps))
        except ValidationError as error:
            raise _Fault(Abstain(reason="invalid_output", detail=f"proposal: {error}")) from error
        return Interpretation(brief_id=self.brief_id, facts=self.facts, advice=Advice(question=card, proposal=proposal))

    def combined_outcome(self) -> Interpretation:
        """Triage plus one call that writes the steps, the payloads, and the card."""
        reply = self.call("combined", self.owner.combined, facts=self.facts.model_dump_json(),
                          allowed_kinds=list(self.owner.allowed_kinds))
        actions = list(reply.actions or [])
        abstain = check_steps(self.text, actions, self.owner.allowed_kinds)
        if abstain:
            raise _Fault(abstain)
        steps = [self.combined_step(number, action) for number, action in enumerate(actions, start=1)]
        card = reply.card if self.facts.needs_human else None
        try:
            proposal = Proposal(proposal_id="p-" + self.brief_id, brief_id=self.brief_id, steps=tuple(steps))
        except ValidationError as error:
            raise _Fault(Abstain(reason="invalid_output", detail=f"proposal: {error}")) from error
        return Interpretation(brief_id=self.brief_id, facts=self.facts, advice=Advice(question=card, proposal=proposal))

    def combined_step(self, number: int, action):
        """Build one step from the combined call. Code sets the fields that the model must not write."""
        cls = ACTION_CLASS[action.kind]
        try:
            payload = payload_model(cls)(**(dict(action.payload or {})))
        except ValidationError as error:
            raise _Fault(Abstain(reason="invalid_output", detail=f"step {number}: {error}")) from error
        try:
            return cls(
                session_id=self.owner.session_id, author="interpreter", evidence_quote=action.evidence_quote,
                confidence=min(max(action.confidence, 0.0), 1.0), **payload.model_dump())
        except ValidationError as error:
            raise _Fault(Abstain(reason="invalid_output", detail=f"step {number}: {error}")) from error

    def done_outcome(self) -> Interpretation:
        """A done stop gives one notify step built by code. No Pick, Fill, or Card call runs."""
        if not self.final:
            raise _Fault(Abstain(reason="no_agent_reply",
                                 detail="the final reply is empty, so there is nothing to notify"))
        excerpt = notify_excerpt(self.final)
        try:
            step = Notify(session_id=self.owner.session_id, author="interpreter", evidence_quote=excerpt,
                          confidence=1.0, excerpt=excerpt)
            proposal = Proposal(proposal_id="p-" + self.brief_id, brief_id=self.brief_id, steps=(step,))
        except ValidationError as error:
            raise _Fault(Abstain(reason="invalid_output", detail=f"notify: {error}")) from error
        return Interpretation(brief_id=self.brief_id, facts=self.facts,
                              advice=Advice(question=None, proposal=proposal))

    def step(self, number: int, picked):
        """Run Fill for one step. Code sets the fields that the model must not write."""
        payload = self.call("fill", self.owner.fill[picked.kind], kind=picked.kind,
                            evidence_quote=picked.evidence_quote).payload
        fault = check_fill_payload(picked.kind, payload)
        if fault is not None:
            raise _Fault(Abstain(reason=fault.reason,
                                 detail=f"step {number}: {fault.detail}"))
        try:
            return ACTION_CLASS[picked.kind](
                session_id=self.owner.session_id, author="interpreter", evidence_quote=picked.evidence_quote,
                confidence=min(max(picked.confidence, 0.0), 1.0), **payload.model_dump())
        except ValidationError as error:
            raise _Fault(Abstain(reason="invalid_output", detail=f"step {number}: {error}")) from error


class CombinedInterpreter(Interpreter):
    """The one-call variant: Triage, then one call for the steps, payloads, and card."""

    def __init__(self, lm: dspy.LM | None = None, **kwargs):
        kwargs["variant"] = "combined"
        super().__init__(lm, **kwargs)
