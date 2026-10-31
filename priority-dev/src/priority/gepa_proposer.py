"""The GEPA instruction proposer: the default reflective flow plus a schema guard for the propose component."""
from __future__ import annotations

from typing import Literal, get_args, get_origin

SCHEMA_GUARD_LINE = "Use exactly these fields. Do not invent field names."
MAX_PROPOSAL_CHARS = 4000


def _render(name: str, annotation: object) -> str:
    """Short schema text for one output field of ProposeStop."""
    from priority.interpreter.models import ACTION_KINDS
    from priority.interpreter.signatures import MAX_STEPS

    if get_origin(annotation) is Literal:
        return f"{name}: one of " + ", ".join(get_args(annotation))
    if annotation is bool:
        return f"{name}: bool"
    return f"{name}: a list of 0 to {MAX_STEPS} steps, each with a kind from " + ", ".join(ACTION_KINDS)


def schema_guard(component_name: object) -> str:
    """The schema guard for one GEPA component: exact fields and allowed values."""
    from priority.interpreter.signatures import ProposeStop

    if component_name != "propose":
        return SCHEMA_GUARD_LINE
    fields = "; ".join(_render(name, info.annotation) for name, info in ProposeStop.output_fields.items())
    return f"Schema guard for {component_name}: {fields}. {SCHEMA_GUARD_LINE}"


def _strip_guard(text: str) -> str:
    """The draft without any earlier schema guard block."""
    head = text.split(SCHEMA_GUARD_LINE, 1)[0]
    marker = head.rfind("Schema guard for ")
    if marker != -1:
        head = head[:marker]
    return head.rstrip()


def _cap_draft(text: str, limit: int = MAX_PROPOSAL_CHARS) -> str:
    """The draft within the length cap, cut back to the last space."""
    if len(text) <= limit:
        return text
    cut = text[:limit]
    return cut.rsplit(" ", 1)[0] if " " in cut else cut


def guided_instruction_proposer(candidate: dict, reflective_dataset: dict,
                                components_to_update: list) -> dict:
    """The GEPA instruction proposer: the default reflective flow plus a schema guard.

    The call signature matches dspy's ProposalFn: the candidate instruction mapping, the reflective dataset
    of ReflectiveExamples (Inputs, Generated Outputs, Feedback), and the components to update. It returns
    the new instruction mapping. Each proposed instruction gains the exact output fields of ProposeStop,
    so a drifted field name fails the shape check instead of entering the prompt. An earlier guard is
    stripped before the new one is added, so guards do not pile up, and each draft is capped.
    """
    from dspy.teleprompt.gepa import InstructionProposer

    proposed = InstructionProposer()(
        candidate=candidate,
        reflective_dataset=reflective_dataset,
        components_to_update=components_to_update,
    )
    return {name: _cap_draft(_strip_guard(text)) + "\n\n" + schema_guard(name)
            for name, text in proposed.items()}
