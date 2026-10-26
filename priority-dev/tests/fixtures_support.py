"""Helpers for the slice 15 tests, the labelled fixture set. No test here makes a model call.

The made-up sessions, stops, and labels below are synthetic. They hold no real
transcript text. Each `why` string is plain invented filler.
"""
from __future__ import annotations

import importlib
import importlib.util
import json
import subprocess
import sys
from pathlib import Path

from probe_support import PRIORITY_DEV  # noqa: F401 (re-exported for the slice 15 tests)

if str(PRIORITY_DEV / "src") not in sys.path:
    sys.path.insert(0, str(PRIORITY_DEV / "src"))

SESSION_IDS = [f"made-up-session-{i:02d}" for i in range(1, 11)]
STOPS_PER_SESSION = 5
STOPS_IN_SESSION = 9

CONFIRMED_BY = "made-up-reviewer"
CONFIRMED_ON = "2026-10-26"

LABEL_FIELDS = ("status", "needs_human", "answer_class", "risk", "priority_hint",
                "steps", "ambiguous", "why", "confirmed_by", "confirmed_on")


def require(module: str):
    """Import the module, or fail on an assertion when it does not exist yet."""
    try:
        found = importlib.util.find_spec(module)
    except ModuleNotFoundError:
        found = None
    assert found is not None, f"the module {module} does not exist yet"
    return importlib.import_module(module)


def labels_api():
    """The label loader module, or an assertion failure when it does not exist yet."""
    return require("priority.evaluation.labels")


def split_api():
    """The split module, or an assertion failure when it does not exist yet."""
    return require("priority.evaluation.split")


def stop_key(number: int) -> str:
    """The zero-padded stop key used in the labels file, for example "003"."""
    return f"{number:03d}"


def make_label(stop_number: int, session_index: int = 0, **overrides) -> dict:
    """One made-up label in the confirmed shape, for the given 1-based stop number."""
    templates = {
        1: {"status": "waiting_answer", "needs_human": True, "answer_class": "decide",
            "risk": "low", "priority_hint": "soon", "steps": ["ask_human"],
            "ambiguous": False,
            "why": "The blue widget trial ended. The agent asks which paint colour "
                   "to use, and only the human can pick it."},
        2: {"status": "continuing", "needs_human": False, "answer_class": "none",
            "risk": "low", "priority_hint": "can_wait", "steps": ["continue"],
            "ambiguous": False,
            "why": "The agent restocked the green shelf and keeps counting the red boxes, "
                   "so the run goes on with no human input."},
        3: {"status": "done", "needs_human": False, "answer_class": "none",
            "risk": "low", "priority_hint": "can_wait", "steps": ["dismiss"],
            "ambiguous": False,
            "why": "The yellow lamp tally matches the paper list. The work is done "
                   "and there is nothing to show the human."},
        4: {"status": "waiting_answer", "needs_human": True, "answer_class": "provide_fact",
            "risk": "medium", "priority_hint": "now", "steps": [["reply", "ask_human"]],
            "ambiguous": False,
            "why": "The agent needs the cellar door code. A short reply with the code "
                   "answers it, but the human may need to approve the entry first."},
        5: {"status": "blocked", "needs_human": True, "answer_class": "external_action",
            "risk": "high", "priority_hint": "now", "steps": ["snooze", "continue"],
            "ambiguous": False,
            "why": "The purple gate is locked and the key arrives by post tomorrow. "
                   "The run waits for the post, then goes on."},
    }
    label = dict(templates[stop_number])
    if session_index == 0 and stop_number == 5:
        label["ambiguous"] = True
        label["why"] += " Two readings fit: the run may wait for the post, or the human may fetch the spare key."
    if session_index == 9 and stop_number == 3:
        label["steps"] = []
        label["why"] = "The grey drawer holds no item that needs the human, so the run ends with no step."
    label["confirmed_by"] = CONFIRMED_BY
    label["confirmed_on"] = CONFIRMED_ON
    label.update(overrides)
    return label


def make_labels(session_ids=SESSION_IDS, stops_per=STOPS_PER_SESSION) -> dict:
    """A made-up labels document in the confirmed file shape, with every stop confirmed."""
    sessions = {}
    for index, session_id in enumerate(session_ids):
        stops = {stop_key(n): make_label(n, session_index=index)
                 for n in range(1, stops_per + 1)}
        sessions[session_id] = {"stops": stops}
    return {"confirmed_by": CONFIRMED_BY, "confirmed_on": CONFIRMED_ON, "sessions": sessions}


def make_manifest(session_ids=SESSION_IDS, stops_per=STOPS_PER_SESSION) -> list:
    """A made-up manifest: session ids and stop numbers only, with no transcript text."""
    return [{"session": session_id, "stops_in_session": STOPS_IN_SESSION,
             "stops": list(range(1, stops_per + 1)), "skipped": []}
            for session_id in session_ids]


def write_set(tmp_path: Path, labels: dict | None = None, manifest: list | None = None):
    """Write a made-up manifest and labels pair into a temp folder. Return both paths."""
    manifest_path = tmp_path / "set-manifest.json"
    labels_path = tmp_path / "labels-confirmed.json"
    manifest_path.write_text(json.dumps(manifest if manifest is not None else make_manifest(), indent=2) + "\n")
    labels_path.write_text(json.dumps(labels if labels is not None else make_labels(), indent=2) + "\n")
    return manifest_path, labels_path


def run_check(*args: str):
    """Run `priority fixtures check` with the given args, from the priority-dev folder."""
    return subprocess.run(
        ["uv", "run", "priority", "fixtures", "check", *args],
        cwd=PRIORITY_DEV,
        capture_output=True,
        text=True,
        check=False,
    )


def combined(result) -> str:
    """Stdout plus stderr, so a test finds a failure reason wherever it is printed."""
    return (result.stdout or "") + "\n" + (result.stderr or "")


def split_parts(stdout: str):
    """Parse the `train <id>`, `holdout <id>`, and `stop <id> <n> <part>` lines of a check report."""
    train, holdout, stop_part = set(), set(), {}
    for line in stdout.splitlines():
        words = line.split()
        if len(words) == 2 and words[0] in ("train", "holdout"):
            (train if words[0] == "train" else holdout).add(words[1])
        if len(words) == 4 and words[0] == "stop" and words[3] in ("train", "holdout"):
            stop_part[(words[1], words[2])] = words[3]
    return train, holdout, stop_part
