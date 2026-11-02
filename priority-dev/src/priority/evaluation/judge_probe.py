"""The code-made copies of a reference for the closed-field probe of `priority judge-check`."""
from __future__ import annotations

import copy

# The probe copy of a reference with a changed priority takes the next priority.
OTHER_PRIORITY = {"P1": "P2", "P2": "P3", "P3": "P1"}


def _flip_multi(detail: dict) -> bool:
    """Flip multi_select on the first question. Return whether a field changed."""
    questions = detail.get("questions") or []
    if not questions or not isinstance(questions[0], dict):
        return False
    questions[0]["multi_select"] = not questions[0].get("multi_select", False)
    return True


def _swap_role(detail: dict) -> bool:
    """Swap the ask_human role. Return whether a field changed."""
    detail["role"] = "review" if detail.get("role") == "decide" else "decide"
    return True


def _rename_label(detail: dict) -> bool:
    """Rename the first option label of the first question. Return whether a field changed."""
    questions = detail.get("questions") or []
    options = questions[0].get("options") if questions and isinstance(questions[0], dict) else None
    if not options or not isinstance(options[0], dict) or "label" not in options[0]:
        return False
    options[0]["label"] = f"not {options[0]['label']}"
    return True


def probe_copies(reference: dict) -> list[tuple[str, dict]]:
    """Code-made copies of one reference object with an ask_human step, each with one closed field changed.

    Each item is the name of the changed field and the copy.
    """
    steps = reference["steps"]
    index = next((i for i, step in enumerate(steps)
                  if isinstance(step, dict) and step.get("kind") == "ask_human"
                  and isinstance(step.get("detail"), dict)), None)
    if index is None:
        return []
    copies = []
    for name, change in (("multi_select", _flip_multi), ("role", _swap_role), ("option_label", _rename_label)):
        changed = copy.deepcopy(reference)
        if change(changed["steps"][index]["detail"]):
            copies.append((name, changed))
    if reference["priority"] in OTHER_PRIORITY:
        copies.append(("priority", {**copy.deepcopy(reference), "priority": OTHER_PRIORITY[reference["priority"]]}))
    return copies
