"""The labelled demos of the propose predictor: the picker, and the stops that a program shows as demos.

A demo is a train stop: its brief in, its full reference out. A stop whose brief is a demo of the program
leaves every score of that program, because the model saw its answer in the prompt.
"""
from __future__ import annotations

from priority.evaluation.payload_rules import as_steps, get_field

DEMO_COUNT = 4


def _shape(example: object) -> tuple:
    """The sequence of reference step kinds of one example."""
    return tuple(get_field(step, "kind") for step in as_steps(get_field(example, "expected_payloads")))


def pick_demos(examples: list, k: int = DEMO_COUNT) -> list:
    """Up to k examples, the shortest brief first, at most one for each shape. Print one line for each."""
    ordered = sorted(examples, key=lambda e: (len(get_field(e, "brief_text", "")), str(get_field(e, "session_id")),
                                              str(get_field(e, "stop"))))
    picked, shapes = [], set()
    for example in ordered:
        shape = _shape(example)
        if shape in shapes:
            continue
        shapes.add(shape)
        picked.append(example)
        print(f"demo: session {get_field(example, 'session_id')} stop {get_field(example, 'stop')} "
              f"({', '.join(shape) or 'no steps'})")
        if len(picked) == k:
            break
    return picked


def as_demo(example: object) -> object:
    """The demo of one example: its brief in, its full reference out."""
    import dspy

    return dspy.Example(session_id=get_field(example, "session_id"), stop=get_field(example, "stop"),
                        brief_text=get_field(example, "brief_text"), status=get_field(example, "status"),
                        needs_human=get_field(example, "needs_human"),
                        steps=as_steps(get_field(example, "expected_payloads")),
                        priority=get_field(example, "priority")).with_inputs("brief_text")


def demo_briefs(program: object) -> set[str]:
    """The brief texts of the demos that the program holds."""
    named = getattr(program, "named_predictors", None)
    if not callable(named):
        return set()
    return {get_field(demo, "brief_text") for _, predictor in named()
            for demo in getattr(predictor, "demos", None) or []} - {None}


def drop_demo_stops(examples: list, briefs: set[str]) -> list:
    """The examples whose brief is not a demo. Print how many stops left."""
    kept = [example for example in examples if get_field(example, "brief_text") not in briefs]
    print(f"demo stops excluded: {len(examples) - len(kept)}")
    return kept
