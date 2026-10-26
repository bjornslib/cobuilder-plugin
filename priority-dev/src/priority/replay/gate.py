"""The go or no-go section: one verdict for each abort_if condition of the goal file."""
from __future__ import annotations

import json
from pathlib import Path

from priority.replay.store import Measured

HELD, REFUTED, NOT_MEASURED = "held", "refuted", "not measured"
HOOK_BASIS = "the replay makes no hook call, so it cannot show whether a hook blocks a session"
MORE_BASIS = "the replay has no measure for this condition"


def read_conditions(goal: Path) -> list[str]:
    """The abort_if list of the goal file."""
    return [str(text) for text in json.loads(goal.read_text())["abort_if"]]


def model_output(measured: Measured) -> tuple[str, str]:
    """(verdict, basis) of condition 1, from the real sessions only."""
    real = {line["session"] for line in measured.results if line["real"]}
    total = len(real)
    if not total:
        return NOT_MEASURED, "no session of the replay is real, so no stop of a real transcript was measured"
    good = {name: sum(1 for line in measured.results if line["adapter"] == name and line["real"]
                      and not line["abstain_reason"]) for name in measured.adapters}
    stored = len(real & measured.stored)
    held = all(count * 2 < total for count in good.values()) and not stored
    counts = ", ".join(f"{name} {count}/{total}" for name, count in good.items())
    basis = (f"real sessions with no Abstain: {counts}. Real sessions with a stored digest: digest {stored}/{total}. "
             f"The condition holds when fewer than half of the real sessions end with no Abstain for each adapter "
             f"and no real session has a stored digest")
    return (HELD if held else REFUTED), basis


def verdicts(measured: Measured) -> list[tuple[str, str]]:
    """(verdict, basis) for each condition, by its position in the list."""
    found = []
    for number in range(1, len(measured.conditions) + 1):
        if number == 1:
            found.append(model_output(measured))
        else:
            found.append((NOT_MEASURED, HOOK_BASIS if number == 2 else MORE_BASIS))
    return found


def section(measured: Measured) -> list[str]:
    lines = ["## Go or no-go"]
    for number, (text, (verdict, basis)) in enumerate(zip(measured.conditions, verdicts(measured)), start=1):
        lines += ["", f"### abort_if {number}", "", f"- condition: {text}", f"- verdict: {verdict}", f"- basis: {basis}"]
    return lines
