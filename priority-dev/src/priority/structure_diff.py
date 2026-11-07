"""The typed diff of a reference payload and a program output, for the GEPA reflection feedback.

The diff holds fixed schema values only: a status, a yes or no, a count, a kind, and a filled flag.
It never copies payload text, an option label, a help value, or an excerpt. A parser reads the lines
apart, so the grammar is pinned:

- `status: <reference> -> <prediction>`
- `needs_human: <yes|no> -> <yes|no>`
- `priority: <reference> -> <prediction>`
- one group per step, in step order, positions counted from 1:
  `step <n>: missing <kind>`, `step <n>: extra <kind>`, or `step <n>: <a> -> <b>` for two kinds.
  A kind difference takes the kind line alone.
- `ask_human`: `step <n> ask_human role: <a> -> <b>`, then the question count, then each question up to
  the shorter list: the option count, `multi_select`, `free_text`, `recommendation`, `helps`, and
  `ask filled`.
- `continue_until`: the proof kind. `approve_permission`: the scope.
- each required text field of the step kind: `step <n> <kind> <field> filled: <yes|no> -> <yes|no>`.

Only a difference becomes a line. `None` and an absent field read `none`. An empty diff reads
`structure: matches`, and a prediction that abstained reads `no output: the reply did not parse`.
"""
from __future__ import annotations

from priority.evaluation.payload_rules import abstain_of, as_steps, get_field

MATCHES = "structure: matches"
NO_OUTPUT = "no output: the reply did not parse"

# The required text fields, by step kind, in the order of their filled line. Each holds free text.
REQUIRED_TEXT = (
    ("reply", "text"),
    ("continue_until", "goal"),
    ("approve_gate", "gate"),
    ("send_feedback", "notes"),
    ("notify", "excerpt"),
    ("dismiss", "reason"),
    ("review", "artifact"),
)


def _text(value: object) -> str:
    """One schema value as its line text: a boolean is yes or no, and None is none."""
    if value is None:
        return "none"
    if isinstance(value, bool):
        return "yes" if value else "no"
    return str(value)


def _filled(value: object) -> str:
    """yes when the text holds a non-blank character, no in every other case."""
    return "yes" if isinstance(value, str) and value.strip() else "no"


def _line(prefix: str, first: object, second: object) -> list[str]:
    """The one line of a difference, or no line at all when the two values agree."""
    if first == second:
        return []
    return [f"{prefix}: {_text(first)} -> {_text(second)}"]


def _steps(obj: object) -> list:
    """The step list of a reference or an output, from `steps` or the label field `expected_payloads`."""
    steps = get_field(obj, "steps")
    if steps is None:
        steps = get_field(obj, "expected_payloads")
    return as_steps(steps)


def _kind(step: object) -> str:
    """The kind of one step."""
    kind = get_field(step, "kind")
    return kind if isinstance(kind, str) else "none"


def _options(question: object) -> list:
    """The option list of one question."""
    return as_steps(get_field(question, "options"))


def _questions(detail: object) -> list:
    """The question list of one `ask_human` detail."""
    return as_steps(get_field(detail, "questions"))


def _recommended(question: object, options: list) -> bool:
    """True when `agent_recommendation` names one option label of this side."""
    recommended = get_field(question, "agent_recommendation")
    labels = [get_field(option, "label") for option in options]
    return recommended is not None and recommended in labels


def _help_kinds(question: object) -> str:
    """The help kinds in order, joined by `, `, or `none` when the list is empty."""
    kinds = [get_field(button, "kind") for button in as_steps(get_field(question, "helps"))]
    return ", ".join(kinds) if kinds else "none"


def _question_lines(number: int, question: int, ref: object, pred: object) -> list[str]:
    """The lines of one question, in the pinned order. `number` is the step, `question` the question."""
    prefix = f"step {number} ask_human question {question}"
    ref_options, pred_options = _options(ref), _options(pred)
    lines = _line(f"{prefix} options", len(ref_options), len(pred_options))
    lines += _line(f"{prefix} multi_select", get_field(ref, "multi_select"), get_field(pred, "multi_select"))
    lines += _line(f"{prefix} free_text", get_field(ref, "free_text"), get_field(pred, "free_text"))
    lines += _line(f"{prefix} recommendation", _recommended(ref, ref_options), _recommended(pred, pred_options))
    lines += _line(f"{prefix} helps", _help_kinds(ref), _help_kinds(pred))
    lines += _line(f"{prefix} ask filled", _filled(get_field(ref, "ask")), _filled(get_field(pred, "ask")))
    return lines


def _ask_lines(number: int, ref: object, pred: object) -> list[str]:
    """The lines of one `ask_human` step whose kinds agree."""
    ref_detail, pred_detail = get_field(ref, "detail"), get_field(pred, "detail")
    lines = _line(f"step {number} ask_human role", get_field(ref_detail, "role"), get_field(pred_detail, "role"))
    ref_questions, pred_questions = _questions(ref_detail), _questions(pred_detail)
    lines += _line(f"step {number} ask_human questions", len(ref_questions), len(pred_questions))
    for index in range(min(len(ref_questions), len(pred_questions))):
        lines += _question_lines(number, index + 1, ref_questions[index], pred_questions[index])
    return lines


def _proof_kind(step: object) -> object:
    """The proof kind of one `continue_until` step, or None when the proof is absent."""
    proof = get_field(step, "proof")
    return get_field(proof, "kind") if proof is not None else None


def _filled_lines(number: int, kind: str, ref: object, pred: object) -> list[str]:
    """The filled line of the step's required text field, when the kind has one."""
    for step_kind, field in REQUIRED_TEXT:
        if step_kind != kind:
            continue
        return _line(f"step {number} {kind} {field} filled",
                     _filled(get_field(ref, field)), _filled(get_field(pred, field)))
    return []


def _step_lines(number: int, ref: object, pred: object) -> list[str]:
    """The lines of one step whose kinds agree: its kind detail, then its required text field."""
    kind = _kind(ref)
    lines = []
    if kind == "ask_human":
        lines += _ask_lines(number, ref, pred)
    elif kind == "continue_until":
        lines += _line(f"step {number} continue_until proof kind", _proof_kind(ref), _proof_kind(pred))
    elif kind == "approve_permission":
        lines += _line(f"step {number} approve_permission scope",
                       get_field(ref, "scope"), get_field(pred, "scope"))
    lines += _filled_lines(number, kind, ref, pred)
    return lines


def _step_difference(ref_steps: list, pred_steps: list) -> list[str]:
    """The lines of the step lists, up to the longer of the two."""
    lines: list[str] = []
    for index in range(max(len(ref_steps), len(pred_steps))):
        number = index + 1
        ref = ref_steps[index] if index < len(ref_steps) else None
        pred = pred_steps[index] if index < len(pred_steps) else None
        if ref is None:
            lines.append(f"step {number}: extra {_kind(pred)}")
        elif pred is None:
            lines.append(f"step {number}: missing {_kind(ref)}")
        elif _kind(ref) != _kind(pred):
            lines.append(f"step {number}: {_kind(ref)} -> {_kind(pred)}")
        else:
            lines += _step_lines(number, ref, pred)
    return lines


def structure_diff(reference: object, prediction: object) -> list[str]:
    """The typed difference of one reference and one prediction, as the pinned line list."""
    if abstain_of(prediction) is not None:
        return [NO_OUTPUT]
    lines: list[str] = []
    for field in ("status", "needs_human", "priority"):
        lines += _line(field, get_field(reference, field), get_field(prediction, field))
    lines += _step_difference(_steps(reference), _steps(prediction))
    return lines or [MATCHES]
