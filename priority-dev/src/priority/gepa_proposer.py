"""The GEPA instruction proposer: the default reflective flow plus a schema guard for the propose component."""
from __future__ import annotations

import re
from collections.abc import Iterator
from typing import Literal, get_args, get_origin

from priority.evaluation.metric import ReflectionFailure

SCHEMA_GUARD_LINE = "Use exactly these fields. Do not invent field names."

MAX_INSTRUCTION_CHARS = 6000

PROPOSER_BASE = (
    "You improve the instruction of the propose component of a coding-session orchestrator.\n"
    "Start from the current instruction. Keep it, and change only what the examples show is wrong.\n"
    "Change a rule only when the same failure shows in 2 or more examples.\n"
    "Fix the lowest scores first, and keep every rule that scores 1.00.\n"
    "Write rules that hold for any coding session. Never write a session detail, an option label, a file "
    "name, a command, or a quoted reply from the examples.\n"
    "End the new instruction with one line that states what you changed and why."
)

GENERAL_RULES = (
    "Write rules that hold for any coding session, not for one session. "
    "Never quote an option label, a file name, a command, or a session detail from the examples. "
    "Describe the kind of choice and the rule that decides it."
)
FILE_NAME = re.compile(r"\b[A-Za-z_][\w-]{2,}\.[A-Za-z][A-Za-z0-9]{0,7}\b")


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


def _option_labels(node: object) -> Iterator[str]:
    """Every option label in a nested payload."""
    if isinstance(node, dict):
        for option in node.get("options") or []:
            if isinstance(option, dict) and isinstance(option.get("label"), str):
                yield option["label"]
        for value in node.values():
            yield from _option_labels(value)
    elif isinstance(node, list):
        for item in node:
            yield from _option_labels(item)


def _strings(node: object) -> Iterator[str]:
    """Every string in a nested payload."""
    if isinstance(node, str):
        yield node
    elif isinstance(node, dict):
        for value in node.values():
            yield from _strings(value)
    elif isinstance(node, list):
        for item in node:
            yield from _strings(item)


def blocked_details(examples: list) -> frozenset[str]:
    """The lower-case option labels of 3 or more words and the file names in the trainset references."""
    found: set[str] = set()
    for example in examples:
        payloads = example.expected_payloads
        found.update(label.lower() for label in _option_labels(payloads) if len(label.split()) >= 3)
        found.update(name.lower() for text in _strings(payloads) for name in FILE_NAME.findall(text))
    return frozenset(found)


def _quoted(text: str, blocked: frozenset) -> tuple[int, int]:
    """How many blocked option labels and file names occur in the text, ignoring case."""
    lower = text.lower()
    hits = [detail for detail in blocked if detail in lower]
    files = sum(1 for detail in hits if FILE_NAME.fullmatch(detail))
    return len(hits) - files, files


def _admit(candidate: dict, name: str, text: str, blocked: frozenset) -> str:
    """The guarded proposal, or the parent instruction when the proposal quotes a blocked detail."""
    labels, files = _quoted(text, blocked)
    if labels or files:
        print(f"proposal rejected: quotes {labels} trainset option labels and {files} file names")
        return candidate[name]
    return _strip_guard(text) + "\n\n" + schema_guard(name)


def _build_proposer(version: str) -> object:
    """The dspy InstructionProposer for one proposer version. v1 is the E7 proposer, v2 the E8 proposer."""
    from dspy.teleprompt.gepa import InstructionProposer

    if version == "v1":
        return InstructionProposer(additional_instructions=GENERAL_RULES)
    from priority.proposer_reference import proposer_reference

    return InstructionProposer(base_instructions=PROPOSER_BASE, additional_instructions=GENERAL_RULES,
                               skills=[proposer_reference()], max_chars=MAX_INSTRUCTION_CHARS)


def guided_instruction_proposer(candidate: dict, reflective_dataset: dict, components_to_update: list,
                                *, blocked: frozenset = frozenset(), version: str = "v2") -> dict:
    """The GEPA instruction proposer: the default reflective flow plus a schema guard.

    The call signature matches dspy's ProposalFn: the candidate instruction mapping, the reflective dataset
    of ReflectiveExamples (Inputs, Generated Outputs, Feedback), and the components to update. It returns
    the new instruction mapping. Each proposed instruction gains the exact output fields of ProposeStop,
    so a drifted field name fails the shape check instead of entering the prompt. An earlier guard is
    stripped before the new one is added, so guards do not pile up. No draft is cut: an earlier 4000-character
    cut lost the tail of every proposal and left rules unfinished.

    The reflection model gets GENERAL_RULES. A proposal that quotes a blocked detail, an option label of 3 or
    more words or a file name from the trainset, keeps the parent instruction, and the run prints counts only.

    `version="v1"` keeps the E7 proposer. `version="v2"`, the default, adds PROPOSER_BASE as the base
    instructions, the schema reference as one skills text, and MAX_INSTRUCTION_CHARS as the length budget.
    """
    from dspy.utils.exceptions import LMAuthError, LMBillingError, LMUnsupportedModelError

    try:
        proposed = _build_proposer(version)(
            candidate=candidate,
            reflective_dataset=reflective_dataset,
            components_to_update=components_to_update,
        )
    except (LMAuthError, LMBillingError, LMUnsupportedModelError) as error:
        raise ReflectionFailure(f"the reflection model failed: {type(error).__name__}") from error
    return {name: _admit(candidate, name, text, blocked) for name, text in proposed.items()}
