"""The canvas colours an epic by its state. Finished states must read green."""
import importlib.util
import json
from pathlib import Path

import pytest

SCRIPT = Path(__file__).resolve().parent.parent / "plugins/artifact/scripts/build_canvas.py"
spec = importlib.util.spec_from_file_location("build_canvas", SCRIPT)
build_canvas = importlib.util.module_from_spec(spec)
spec.loader.exec_module(build_canvas)


def placed_colour(state):
    js = build_canvas.to_js({"epics": [{"slug": "a", "state": state, "depends_on": []}]})
    data = json.loads(js.split("const D = ", 1)[1].split("\nconst { createShapeId", 1)[0])
    return data["placed"][0]["colour"]


@pytest.mark.parametrize("state,colour", [
    ("planned", "grey"), ("open", "blue"), ("in-progress", "orange"),
    ("done", "green"), ("completed", "green"), ("accepted", "green"),
    ("implemented", "green"), ("merged", "green"),
    ("deferred", "grey"), ("unknown-state", "grey"), ("", "grey"),
])
def test_state_colour(state, colour):
    assert placed_colour(state) == colour


def test_implemented_is_green():
    assert build_canvas.STATE_COLOUR.get("implemented", "grey") == "green"
