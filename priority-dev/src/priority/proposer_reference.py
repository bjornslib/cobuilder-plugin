"""The reference material that the E8 reflection model reads: the propose schema, the step payloads, and design text.

The text comes from the code, not from `docs/`: the output fields of `ProposeStop`, the allowed values of its
literal fields, every step kind of `ACTION_KINDS` with the payload fields of its model, the priority rule of
the `ProposeStop` docstring, and the module design `docs/design/dspy-modules.md`. It holds no trainset example.
"""
from __future__ import annotations

from pathlib import Path
from typing import Literal, get_args, get_origin

from priority.interpreter.models import ACTION_KINDS, Step
from priority.interpreter.signatures import ProposeStop

DESIGN_DOC = Path(__file__).resolve().parents[2] / "docs" / "design" / "dspy-modules.md"
PRIORITY_MARKER = "The priority tells the system"


def _literal_values(annotation: object) -> str:
    """The allowed values of a Literal field, or an empty text for any other annotation."""
    if get_origin(annotation) is Literal:
        return ", ".join(str(value) for value in get_args(annotation))
    return ""


def _output_lines() -> list[str]:
    """One line per output field of ProposeStop, with its allowed values."""
    lines: list[str] = []
    for name, info in ProposeStop.output_fields.items():
        values = _literal_values(info.annotation)
        if values:
            lines.append(f"- {name}: one of {values}")
        elif info.annotation is bool:
            lines.append(f"- {name}: true or false")
        else:
            lines.append(f"- {name}: 0 to 3 steps, in run order")
    return lines


def _step_models() -> dict[str, type]:
    """Each step kind of ACTION_KINDS, mapped to its payload model."""
    models = get_args(get_args(Step)[0])
    return {model.model_fields["kind"].default: model for model in models}


def _detail_models(annotation: object) -> list[type]:
    """The role models of a discriminated `detail` field, with or without its Annotated wrapper."""
    members = get_args(annotation)
    if len(members) == 1 and get_args(members[0]):
        return list(get_args(members[0]))
    return list(members)


def _detail_lines(annotation: object) -> list[str]:
    """One line per role of a discriminated `detail` field, with that role's payload fields."""
    lines: list[str] = []
    for model in _detail_models(annotation):
        role = model.model_fields["role"].default
        fields = [name for name in model.model_fields if name != "role"]
        lines.append(f"  - detail role {role}: " + (", ".join(fields) if fields else "no payload fields"))
    return lines


def _step_lines() -> list[str]:
    """One line per step kind of ACTION_KINDS, with the payload fields of its model."""
    by_kind = _step_models()
    lines: list[str] = []
    for kind in ACTION_KINDS:
        model = by_kind[kind]
        fields = [name for name in model.model_fields if name != "kind"]
        lines.append(f"- {kind}: " + (", ".join(fields) if fields else "no payload fields"))
        detail = model.model_fields.get("detail")
        if detail is not None:
            lines.extend(_detail_lines(detail.annotation))
    return lines


def _priority_rule() -> str:
    """The priority rule text of the ProposeStop docstring."""
    doc = ProposeStop.__doc__ or ""
    marker = doc.find(PRIORITY_MARKER)
    return doc[marker:].strip() if marker != -1 else ""


def proposer_reference() -> str:
    """The schema reference text for the reflection model, built from the code and the module design."""
    design = DESIGN_DOC.read_text(encoding="utf-8").strip() if DESIGN_DOC.is_file() else ""
    blocks = [
        "Propose schema reference. The field names, the allowed values, and the step payloads come from the code.",
        "Output fields of ProposeStop:",
        *_output_lines(),
        "Step kinds and their payload fields:",
        *_step_lines(),
        "Priority rule:",
        _priority_rule(),
        "Module design:",
        design,
    ]
    return "\n".join(blocks).rstrip() + "\n"
