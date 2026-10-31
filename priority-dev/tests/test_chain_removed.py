"""Slice 21 RED: the interpreter chain is gone.

Each test checks the absence of a name by import or attribute, never by
reading source text: the chain signatures, the chain checks, the combined
interpreter, the done outcome, the busy component selector, and the variant
option.
"""
from __future__ import annotations

import importlib.util
import inspect

import pytest

from brief_support import require
from interpret_support import interpreter_api, no_live_call  # noqa: F401


def absent(module_name: str, names: tuple[str, ...]) -> list[str]:
    """The names that the module still has. A missing module has none."""
    if importlib.util.find_spec(module_name) is None:
        return []
    module = require(module_name)
    return [name for name in names if hasattr(module, name)]


def test_the_chain_signatures_are_gone():
    left = absent("priority.interpreter.signatures", ("TriageLM", "PickStep", "Fill", "FILL", "WriteCard",
                                                      "WriteCombined"))
    assert left == [], f"signatures.py still has {left}"


def test_the_chain_checks_are_gone():
    assert absent("priority.interpreter.checks", ("check_steps", "check_fill_payload")) == []


def test_the_combined_interpreter_and_the_done_outcome_are_gone():
    module = require("priority.interpreter.module")
    assert absent("priority.interpreter", ("CombinedInterpreter",)) == []
    assert absent("priority.interpreter.module", ("CombinedInterpreter", "done_outcome")) == []
    holders = [name for name, value in vars(module).items() if inspect.isclass(value) and hasattr(value, "done_outcome")]
    assert holders == [], f"these classes still have done_outcome: {holders}"


def test_the_busy_component_selector_is_gone():
    assert absent("priority.optimise", ("BusyComponentSelector",)) == []


def test_the_interpreter_has_no_variant_option():
    with pytest.raises(TypeError):
        interpreter_api().Interpreter(lm=None, variant="chain")
