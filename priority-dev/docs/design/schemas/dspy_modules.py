# /// script
# requires-python = ">=3.11"
# dependencies = ["pydantic>=2.7", "dspy[typesafe]==3.4.1"]
# ///
"""Design sketch: the DSPy modules of the first spikes. No Jev call.

`uv run dspy_modules.py` checks the flow with a dummy model and prints the prompt size
of each signature. It makes no network call. Section numbers refer to ../dspy-modules.md.
"""
from __future__ import annotations

import os
from typing import Literal, get_args

import dspy
from dspy.utils import DummyLM
from pydantic import create_model

import interpreter_schemas as S

# ---- Models (section 2) ------------------------------------------------------

def nemo() -> dspy.LM:  # triage, pick, fill, card: JSON schema output is supported
    return dspy.LM("openrouter/mistralai/mistral-nemo", api_key=os.environ.get("OPENROUTER_API_KEY"), temperature=0)


def inkling() -> dspy.LM:  # digest, shrink: no response_format, so the text adapter
    return dspy.LM("openrouter/thinkingmachines/inkling:free", api_key=os.environ.get("OPENROUTER_API_KEY"), temperature=0)


# ---- Signatures (section 3) --------------------------------------------------

class TriageLM(dspy.Signature):
    """Read the end of a run of a coding agent. Report the state of the session."""
    slice_text: str = dspy.InputField()
    status: Literal["done", "waiting_answer", "waiting_permission", "blocked", "failed", "continuing"] = dspy.OutputField(desc="What the session does now")
    needs_human: bool = dspy.OutputField(desc="True only when no rule or agent can give the answer")
    answer_class: Literal["none", "approve_continue", "pick_default", "provide_fact", "decide", "external_action"] = dspy.OutputField(desc="The kind of answer that is due")
    risk: Literal["low", "medium", "high"] = dspy.OutputField(desc="The cost of a wrong answer")
    priority_hint: Literal["can_wait", "soon", "now"] = dspy.OutputField(desc="How soon the human should look")
    unsure: list[str] = dspy.OutputField(desc="Names of the fields above that you are unsure about, or an empty list")


ACTION_CLASS = {c.model_fields["kind"].default: c for c in get_args(get_args(S.Action)[0])}
KindT = Literal[tuple(ACTION_CLASS)]  # type: ignore[valid-type]


class PickStep(dspy.Signature):
    """Choose the kind of the next step for a waiting coding session. Quote the words that support the choice."""
    slice_text: str = dspy.InputField()
    facts: str = dspy.InputField(desc="The facts from the triage step, as JSON")
    allowed_kinds: list[str] = dspy.InputField(desc="Choose one of these kinds only")
    kind: KindT = dspy.OutputField()
    evidence_quote: str = dspy.OutputField(desc="Exact words from the slice. Empty when the kind is ask_human")
    confidence: float = dspy.OutputField(desc="0 to 1")


class Fill(dspy.Signature):
    """Write the fields of one action for a waiting coding session. Use only facts in the slice."""
    slice_text: str = dspy.InputField()
    kind: str = dspy.InputField(desc="The kind of action to write")
    payload: S.Strict = dspy.OutputField()  # the type is replaced for each kind


class WriteCard(dspy.Signature):
    """Write the question card that a busy human reads. Be short. Give options only if the agent gave them."""
    slice_text: str = dspy.InputField()
    card: S.Question = dspy.OutputField()


def payload_model(cls: type[S.ActionBase]) -> type[S.Strict]:
    """The fields of an action that the model writes. Code sets the session, author, quote, and confidence."""
    skip = set(S.ActionBase.model_fields) | {"kind"}
    fields = {n: (f.annotation, f) for n, f in cls.model_fields.items() if n not in skip}
    return create_model(cls.__name__ + "Payload", __base__=S.Strict, **fields)


FILL = {k: Fill.with_updated_fields("payload", type_=payload_model(c)) for k, c in ACTION_CLASS.items()}
RISK = {"low": 0.15, "medium": 0.5, "high": 0.85}
HINT = {"can_wait": 0.15, "soon": 0.5, "now": 0.85}
ANSWER_DUE = {"waiting_answer", "waiting_permission", "blocked", "failed"}


# ---- Modules (section 4) -----------------------------------------------------

class Interpreter(dspy.Module):
    """Stage 1 and stage 2 as small calls. The code, not the model, builds the typed result."""

    def __init__(self, lm: dspy.LM | None = None):
        super().__init__()
        self.lm = lm
        self.triage = dspy.Predict(TriageLM)
        self.pick = dspy.Predict(PickStep)
        self.fill = {k: dspy.Predict(s) for k, s in FILL.items()}
        self.card = dspy.Predict(WriteCard)

    def forward(self, sl: S.TurnSlice) -> S.Interpretation:
        text = sl.for_model()
        with dspy.context(lm=self.lm or dspy.settings.lm):
            t = self.triage(slice_text=text)
            facts = S.Facts(status=t.status, needs_human=t.needs_human, answer_class=t.answer_class,
                            risk=RISK[t.risk], priority_hint=HINT[t.priority_hint],
                            confidence={f: 0.5 if f in t.unsure else 0.9 for f in TriageLM.output_fields if f != "unsure"})
            if t.status not in ANSWER_DUE and not t.unsure:
                return S.Interpretation(slice_id=sl.slice_id, facts=facts)
            p = self.pick(slice_text=text, facts=facts.model_dump_json(), allowed_kinds=list(sl.allowed_kinds))
            abstain = self.check_pick(sl, text, p)
            if abstain:
                return S.Interpretation(slice_id=sl.slice_id, facts=facts, abstained=abstain)
            payload = self.fill[p.kind](slice_text=text, kind=p.kind).payload if payload_model(ACTION_CLASS[p.kind]).model_fields else None
            step = ACTION_CLASS[p.kind](session_id=sl.context.session_id, author="interpreter",
                                        evidence_quote=p.evidence_quote, confidence=min(max(p.confidence, 0), 1),
                                        **(payload.model_dump() if payload else {}))
            card = self.card(slice_text=text).card if t.needs_human or t.status == "waiting_answer" else None
        prop = S.Proposal(proposal_id="p-" + sl.slice_id, slice_id=sl.slice_id, steps=(step,))
        return S.Interpretation(slice_id=sl.slice_id, facts=facts, advice=S.Advice(question=card, proposal=prop))

    @staticmethod
    def check_pick(sl: S.TurnSlice, text: str, p) -> S.Abstain | None:
        if p.kind not in sl.allowed_kinds:
            return S.Abstain(slice_id=sl.slice_id, reason="kind_not_allowed", detail=p.kind)
        if p.kind != "ask_human" and p.evidence_quote not in text:
            return S.Abstain(slice_id=sl.slice_id, reason="quote_not_in_slice", detail=p.evidence_quote[:80])
        return None


class DigestRun(dspy.Module):
    def __init__(self, lm: dspy.LM | None = None):
        super().__init__()
        self.lm = lm
        self.run = dspy.Predict(S.Digest)

    def forward(self, sl: S.TurnSlice) -> S.RunDigest:
        with dspy.context(lm=self.lm or dspy.settings.lm):
            return self.run(slice_json=sl.for_model()).digest


# ---- Check -------------------------------------------------------------------

def prompt_chars(sig: type[dspy.Signature]) -> int:
    inputs = {n: "x" for n in sig.input_fields}
    return sum(len(m["content"]) for m in dspy.ChatAdapter().format(sig, [], inputs))


if __name__ == "__main__":
    sl = S.example_slice().model_copy(update={"allowed_kinds": tuple(ACTION_CLASS)})
    quote = sl.final[:20]
    lm = DummyLM([
        {"status": "waiting_answer", "needs_human": "false", "answer_class": "pick_default", "risk": "low", "priority_hint": "soon", "unsure": "[]"},
        {"kind": "reply", "evidence_quote": quote, "confidence": "0.8"},
        {"payload": '{"text": "1"}'},
        {"card": S.examples()["advice_with_question_card"].question.model_dump_json()},
    ])
    out = Interpreter(lm)(sl)
    assert out.advice and out.advice.proposal.steps[0].kind == "reply" and out.advice.question, out
    bad = DummyLM([{"status": "waiting_answer", "needs_human": "false", "answer_class": "none", "risk": "low", "priority_hint": "soon", "unsure": "[]"},
                   {"kind": "reply", "evidence_quote": "words that are not in the slice", "confidence": "0.8"}])
    assert Interpreter(bad)(sl).abstained.reason == "quote_not_in_slice"
    done = DummyLM([{"status": "done", "needs_human": "false", "answer_class": "none", "risk": "low", "priority_hint": "can_wait", "unsure": "[]"}])
    assert Interpreter(done)(sl).advice is None
    print("characters in the system and user prompt (empty slice):")
    for name, sig in [("TriageLM", TriageLM), ("PickStep", PickStep), ("WriteCard", WriteCard), ("Digest", S.Digest), ("Advise (old, one call)", S.Advise)] + \
                     [(f"Fill:{k}", s) for k, s in FILL.items()]:
        print(f"  {name:28} {prompt_chars(sig):6}")
    print("ok")
