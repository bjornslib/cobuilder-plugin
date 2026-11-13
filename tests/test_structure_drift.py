"""Tests for shared/structure/drift.py, slice 8 of structure-coaching (E4).

The module reads the public surface of a Python source with ast. It gives one
event for each change between two surfaces. Each event names its kind, its
symbol, and its class: input, output, or error. The cases use source strings
only. No case reads a repository.

Run with: uv run pytest tests/test_structure_drift.py -q
"""
from __future__ import annotations

import ast
import importlib.util
import sys
from pathlib import Path
from types import ModuleType
from typing import Any

import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent
DRIFT_PATH = REPO_ROOT / "shared" / "structure" / "drift.py"
EVENT_CLASSES = ("input", "output", "error")

# Each row gives the kind, the source before, the source after, and the class.
# The epic does not map removed to a class, so that row checks only the set.
KIND_CASES = [
    pytest.param(
        "new-required-param",
        "def f(a):\n    return a\n",
        "def f(a, b):\n    return a\n",
        "input",
        id="new-required-param",
    ),
    pytest.param(
        "param-removed",
        "def f(a, b):\n    return a\n",
        "def f(a):\n    return a\n",
        "input",
        id="param-removed",
    ),
    pytest.param(
        "param-order",
        "def f(a, b):\n    return a\n",
        "def f(b, a):\n    return a\n",
        "input",
        id="param-order",
    ),
    pytest.param(
        "default-changed",
        "def f(a=1):\n    return a\n",
        "def f(a=2):\n    return a\n",
        "input",
        id="default-changed",
    ),
    pytest.param(
        "return-changed",
        "def f() -> int:\n    return 1\n",
        "def f() -> str:\n    return '1'\n",
        "output",
        id="return-changed",
    ),
    pytest.param(
        "raises-changed",
        "def f():\n    raise ValueError('x')\n",
        "def f():\n    raise KeyError('x')\n",
        "error",
        id="raises-changed",
    ),
    pytest.param(
        "catches-changed",
        "def f():\n    try:\n        g()\n    except ValueError:\n        pass\n",
        "def f():\n    try:\n        g()\n    except KeyError:\n        pass\n",
        "error",
        id="catches-changed",
    ),
    pytest.param(
        "removed",
        "def f():\n    return 1\n",
        "def g():\n    return 1\n",
        None,
        id="removed",
    ),
]


def _load_drift() -> ModuleType:
    """Return the drift module. Assert that the file exists first."""
    assert DRIFT_PATH.exists(), f"missing {DRIFT_PATH}: slice 8 creates this module"
    spec = importlib.util.spec_from_file_location("structure_drift_under_test", DRIFT_PATH)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    # Register the module first. Dataclasses look up their module by name.
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def _api(module: ModuleType, name: str) -> Any:
    """Return a public name of the module. Fail with an assertion when there is none."""
    assert hasattr(module, name), f"drift.py has no public name {name!r} yet"
    return getattr(module, name)


def _field(event: Any, key: str) -> Any:
    """Return one key of an event. Assert that the key exists."""
    assert isinstance(event, dict), f"an event is a dict, not {event!r}"
    assert key in event, f"the event has no {key!r} key: {event!r}"
    return event[key]


def _attr(obj: Any, name: str) -> Any:
    """Return one attribute of a surface. Assert that the attribute exists."""
    assert hasattr(obj, name), f"the surface has no {name!r} attribute"
    return getattr(obj, name)


def _events(before: str, after: str) -> list[dict[str, Any]]:
    """Return the drift events between two sources."""
    module = _load_drift()
    public_surface = _api(module, "public_surface")
    drift_events = _api(module, "drift_events")
    return drift_events(public_surface(before), public_surface(after))


def _imported_roots(tree: ast.AST) -> list[str]:
    """Return the top package of each import. A relative import fails the check."""
    roots: list[str] = []
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            roots.extend(alias.name.split(".")[0] for alias in node.names)
        elif isinstance(node, ast.ImportFrom):
            assert node.level == 0, f"line {node.lineno} uses a relative import"
            roots.append((node.module or "").split(".")[0])
    return roots


@pytest.mark.parametrize(("kind", "before", "after", "klass"), KIND_CASES)
def test_each_event_kind_fires_once_for_its_change(kind, before, after, klass):
    events = _events(before, after)
    kinds = [_field(event, "kind") for event in events]
    assert kinds == [kind], f"expected one {kind} event, got {kinds}"
    assert _field(events[0], "symbol") == "f"


@pytest.mark.parametrize(("kind", "before", "after", "klass"), KIND_CASES)
def test_each_event_has_a_class_of_input_output_or_error(kind, before, after, klass):
    events = _events(before, after)
    assert events, f"no event for {kind}"
    event_class = _field(events[0], "class")
    assert event_class in EVENT_CLASSES, f"{kind} has the class {event_class!r}"
    if klass is not None:
        assert event_class == klass, f"{kind} should have the class {klass!r}"


def test_each_change_gives_its_own_event():
    before = "def f(a, b) -> int:\n    return a\n"
    after = "def f(a) -> str:\n    return 'a'\n"
    kinds = sorted(_field(event, "kind") for event in _events(before, after))
    assert kinds == ["param-removed", "return-changed"], f"got {kinds}"


def test_an_unchanged_surface_gives_no_event():
    source = "def f(a, b=1) -> int:\n    return a\n"
    assert _events(source, source) == []


CLASS_SOURCE = (
    "def build(x):\n    return x\n"
    "\n"
    "class Client:\n"
    "    def __init__(self, url):\n        self.url = url\n"
    "    def fetch(self, key):\n        return key\n"
    "    def _retry(self, count):\n        return count\n"
)


def test_the_surface_holds_module_functions_public_methods_and_init():
    module = _load_drift()
    surface = _api(module, "public_surface")(CLASS_SOURCE)
    assert "build" in surface, f"the module function is missing: {sorted(surface)}"
    assert "Client.__init__" in surface, f"__init__ is missing: {sorted(surface)}"
    assert "Client.fetch" in surface, f"the public method is missing: {sorted(surface)}"
    assert "Client._retry" not in surface, "a private method is in the surface"


def test_a_change_in_init_or_a_public_method_names_that_method():
    before = (
        "class Client:\n"
        "    def __init__(self, url):\n        self.url = url\n"
        "    def fetch(self, key) -> str:\n        return key\n"
    )
    after = (
        "class Client:\n"
        "    def __init__(self, url, token):\n        self.url = url\n"
        "    def fetch(self, key) -> int:\n        return 1\n"
    )
    pairs = sorted((_field(event, "kind"), _field(event, "symbol")) for event in _events(before, after))
    assert pairs == [
        ("new-required-param", "Client.__init__"),
        ("return-changed", "Client.fetch"),
    ], f"got {pairs}"


def test_a_name_with_a_leading_underscore_gives_no_event():
    before = (
        "def _helper(a):\n    return a\n"
        "class Client:\n"
        "    def _retry(self, count):\n        return count\n"
        "    def __eq__(self, other):\n        return True\n"
    )
    after = (
        "def _helper(a, b):\n    return a\n"
        "class Client:\n"
        "    def _retry(self, count, limit):\n        return count\n"
        "    def __eq__(self, other, extra):\n        return True\n"
    )
    surface = _api(_load_drift(), "public_surface")(before)
    for name in ("_helper", "Client._retry", "Client.__eq__"):
        assert name not in surface, f"{name} is private, so it is not in the surface"
    assert _events(before, after) == []


def test_a_syntax_error_gives_an_empty_surface():
    module = _load_drift()
    assert _api(module, "public_surface")("def f(:\n    return 1\n") == {}


def test_the_surface_records_each_part_of_a_signature():
    source = (
        "def f(a, b=1, *, c, d=2) -> int:\n"
        "    try:\n        g()\n    except KeyError:\n        pass\n"
        "    raise ValueError('x')\n"
    )
    surface = _api(_load_drift(), "public_surface")(source)
    assert "f" in surface, f"the surface has no f: {sorted(surface)}"
    symbol = surface["f"]
    assert _attr(symbol, "name") == "f"
    assert _attr(symbol, "req") == ("a",)
    assert _attr(symbol, "opt") == ("b",)
    assert _attr(symbol, "kw_req") == ("c",)
    assert _attr(symbol, "kw_opt") == ("d",)
    assert sorted(_attr(symbol, "defaults")) == ["1", "2"]
    assert _attr(symbol, "ret") == "int"
    assert _attr(symbol, "raises") == frozenset({"ValueError"})
    assert _attr(symbol, "catches") == frozenset({"KeyError"})


def test_the_module_imports_the_standard_library_only():
    assert DRIFT_PATH.exists(), f"missing {DRIFT_PATH}: slice 8 creates this module"
    tree = ast.parse(DRIFT_PATH.read_text(encoding="utf-8"))
    roots = {root for root in _imported_roots(tree) if root and root != "__future__"}
    outside = sorted(root for root in roots if root not in sys.stdlib_module_names)
    assert outside == [], f"the module imports outside the standard library: {outside}"
