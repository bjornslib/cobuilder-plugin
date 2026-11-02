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


# The probe copy of a snooze step with a changed until_event takes another value that the model allows.
OTHER_UNTIL_EVENT = {"session_idle": "turn_end", "turn_end": "none", "none": "session_idle"}

# The probe copy of a step with a swapped kind takes a kind that the judge sees as a different action.
# ask_human is never a target, so the swap makes no ask step.
OTHER_KIND = {"reply": "interrupt", "continue": "interrupt", "continue_until": "interrupt",
              "approve_permission": "deny_permission", "deny_permission": "approve_permission",
              "pick_option": "reply", "approve_gate": "send_feedback", "send_feedback": "approve_gate",
              "interrupt": "continue", "snooze": "dismiss", "dismiss": "snooze",
              "set_priority_hint": "notify", "notify": "snooze"}

# The one step that an empty reference gets in its inserted_step copy.
INSERTED_STEP = {"kind": "notify", "excerpt": "The run finished. Read the final reply."}


def _ask_index(steps: list) -> int | None:
    """The index of the first ask_human step with a dict detail, or None."""
    return next((i for i, step in enumerate(steps)
                if isinstance(step, dict) and step.get("kind") == "ask_human"
                and isinstance(step.get("detail"), dict)), None)


def _ask_copies(reference: dict, index: int) -> list[tuple[str, dict]]:
    """One copy for each closed field of the ask_human step at index that can change."""
    copies = []
    for name, change in (("multi_select", _flip_multi), ("role", _swap_role), ("option_label", _rename_label)):
        changed = copy.deepcopy(reference)
        if change(changed["steps"][index]["detail"]):
            copies.append((name, changed))
    return copies


def _other_priority(reference: dict) -> dict | None:
    """The copy with the next priority, or None when the priority is not P1, P2, or P3."""
    if reference["priority"] not in OTHER_PRIORITY:
        return None
    return {**copy.deepcopy(reference), "priority": OTHER_PRIORITY[reference["priority"]]}


def _other_until_event(reference: dict) -> dict | None:
    """The copy with another until_event on the first snooze step that has one, or None."""
    for index, step in enumerate(reference["steps"]):
        if isinstance(step, dict) and step.get("kind") == "snooze" and "until_event" in step:
            if step["until_event"] not in OTHER_UNTIL_EVENT:
                return None
            changed = copy.deepcopy(reference)
            changed["steps"][index]["until_event"] = OTHER_UNTIL_EVENT[step["until_event"]]
            return changed
    return None


def _swapped_kind(reference: dict) -> dict | None:
    """The copy with another kind on the first step, or None. Only a reference with no ask step is swapped."""
    steps = reference["steps"]
    if not steps or _ask_index(steps) is not None:
        return None
    if not isinstance(steps[0], dict) or steps[0].get("kind") not in OTHER_KIND:
        return None
    changed = copy.deepcopy(reference)
    changed["steps"][0]["kind"] = OTHER_KIND[steps[0]["kind"]]
    return changed


def _dropped_step(reference: dict) -> dict | None:
    """The copy without the last step, or None when the reference has fewer than two steps."""
    if len(reference["steps"]) < 2:
        return None
    return {**copy.deepcopy(reference), "steps": copy.deepcopy(reference["steps"][:-1])}


def _inserted_step(reference: dict) -> dict | None:
    """The copy with one notify step, or None when the reference has a step."""
    if reference["steps"]:
        return None
    return {**copy.deepcopy(reference), "steps": [dict(INSERTED_STEP)]}


def probe_copies(reference: dict) -> list[tuple[str, dict]]:
    """Code-made copies of one reference object, each with one closed field changed.

    Each item is the name of the changed field and the copy. A change that cannot be made gives no copy.
    """
    index = _ask_index(reference["steps"])
    copies = _ask_copies(reference, index) if index is not None else []
    for name, change in (("priority", _other_priority), ("until_event", _other_until_event),
                         ("kind_swap", _swapped_kind), ("dropped_step", _dropped_step),
                         ("inserted_step", _inserted_step)):
        changed = change(reference)
        if changed is not None:
            copies.append((name, changed))
    return copies
