#!/usr/bin/env python3
# /// script
# requires-python = ">=3.9"
# dependencies = []
# ///
"""Word caps for the prose that authors write into a bundle.

A cap bounds the words in one field. It never bounds how many points a record makes.
Brevity comes from fewer words per point, so no record drops a decision to fit. A cap is
soft: a field over it is a warning. A field over twice its cap is a ceiling breach, and
`verify_bundle.py` fails the bundle on it.

This module is the one source of the caps. `shared/prose-budget.md` explains how to
write inside them. `build_index.py` warns on a design record over a cap.
`verify_bundle.py` fails the bundle on any record over a cap.

Run it as a checker while you draft:

    uv run shared/prose_budget.py show
    uv run shared/prose_budget.py check docs/architecture/designs/<name>/intent.json
    uv run shared/prose_budget.py check <bundle-dir>/data/story.json

`check` reads a file by its name: goal.json, intent.json, assessment.json, or
story.json. It prints each field over its cap, and marks each field over the ceiling.
It exits 1 only when a field is over the ceiling.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

# Field caps, in words. A cap is a guard rail against a runaway field, not a target:
# it never limits how many decisions, risks, or alternatives a record states. A list has
# a cap on each item and none on the number of items, so a record never loses a point
# to fit. The story-level caps come from the worked example in the cobuilder-harness
# bundle (PR 79), which the guidance holds up as a good STE narrative.
LIST_ITEM_WORDS = 30

# A cap is soft: a field over it is a warning, because the fix is sometimes to keep a point
# that the cap would cut. A field over HARD_FACTOR times its cap is a ceiling breach, and
# the bundle fails. The ceiling stops the runaway field and never decides what to write.
HARD_FACTOR = 2

GOAL = {"outcome": 50}
GOAL_LISTS = ("done_when", "abort_if")

INTENT = {"problem": 60, "why_now": 50, "approach": 100, "testing": 60}
INTENT_LISTS = ("out_of_scope", "risks", "reviewer_focus", "unknowns")
ALTERNATIVE_WORDS = 40  # `option` and `rejected_because` together

ASSESSMENT_SUMMARY = 80
ASSESSMENT_ANSWER = 100
ASSESSMENT_ANSWERS = ("sensible", "maintainability", "pattern")

LEVEL = {"narration": 45, "problem": 80, "solution": 80, "voice": 220}
BEAT_WORDS = 90


def is_ceiling_breach(line: str) -> bool:
    """True when an overage line names a field over HARD_FACTOR times its cap."""
    found = re.search(r": (\d+) words, cap (\d+)", line)
    return bool(found) and int(found.group(1)) > HARD_FACTOR * int(found.group(2))


def split_overages(lines: list[str]) -> tuple[list[str], list[str]]:
    """Return (over the cap only, over the ceiling)."""
    hard = [line for line in lines if is_ceiling_breach(line)]
    return [line for line in lines if not is_ceiling_breach(line)], hard


def words(value: object) -> int:
    return len(value.split()) if isinstance(value, str) else 0


def _string_field(record: dict, name: str, cap: int, label: str) -> list[str]:
    n = words(record.get(name))
    return [f"{label}{name}: {n} words, cap {cap}"] if n > cap else []


def _list_field(record: dict, name: str, label: str) -> list[str]:
    items = record.get(name)
    if not isinstance(items, list):
        return []
    found = []
    for i, item in enumerate(items):
        n = words(item)
        if n > LIST_ITEM_WORDS:
            found.append(f"{label}{name}[{i}]: {n} words, cap {LIST_ITEM_WORDS}")
    return found


def goal_overages(goal: object, label: str = "") -> list[str]:
    if not isinstance(goal, dict):
        return []
    found: list[str] = []
    for name, cap in GOAL.items():
        found += _string_field(goal, name, cap, label)
    for name in GOAL_LISTS:
        found += _list_field(goal, name, label)
    return found


def intent_overages(intent: object, label: str = "") -> list[str]:
    if not isinstance(intent, dict):
        return []
    found: list[str] = []
    # A change that carries N designs lists them in `intent.design`. Its prose fields get
    # the cap once per design, so a two-design pull request keeps both designs' points.
    designs = intent.get("design")
    scale = len(designs) if isinstance(designs, list) and designs else 1
    for name, cap in INTENT.items():
        found += _string_field(intent, name, cap * scale, label)
    for name in INTENT_LISTS:
        found += _list_field(intent, name, label)
    alternatives = intent.get("alternatives")
    if isinstance(alternatives, list):
        for i, alt in enumerate(alternatives):
            if isinstance(alt, dict):
                n = words(alt.get("option")) + words(alt.get("rejected_because"))
                if n > ALTERNATIVE_WORDS:
                    found.append(f"{label}alternatives[{i}]: {n} words, cap {ALTERNATIVE_WORDS}")
    return found


def assessment_overages(assessment: object, label: str = "") -> list[str]:
    if not isinstance(assessment, dict):
        return []
    found = _string_field(assessment, "summary", ASSESSMENT_SUMMARY, label)
    for name in ASSESSMENT_ANSWERS:
        answer = assessment.get(name)
        if isinstance(answer, dict):
            n = words(answer.get("answer"))
            if n > ASSESSMENT_ANSWER:
                found.append(f"{label}{name}.answer: {n} words, cap {ASSESSMENT_ANSWER}")
    return found


def level_overages(level: object, label: str = "") -> list[str]:
    if not isinstance(level, dict):
        return []
    found: list[str] = []
    for name, cap in LEVEL.items():
        found += _string_field(level, name, cap, label)
    beats = level.get("beats")
    if isinstance(beats, list):
        for i, beat in enumerate(beats):
            n = words(beat.get("text")) if isinstance(beat, dict) else 0
            if n > BEAT_WORDS:
                found.append(f"{label}beats[{i}]: {n} words, cap {BEAT_WORDS}")
    return found


def design_overages(record: object, label: str = "") -> list[str]:
    """Overages in one design's goal, intent, and assessment records."""
    if not isinstance(record, dict):
        return []
    return (
        goal_overages(record.get("goal"), f"{label}goal.")
        + intent_overages(record.get("intent"), f"{label}intent.")
        + assessment_overages(record.get("assessment"), f"{label}assessment.")
    )


def story_overages(story: object) -> list[str]:
    """Overages in every timeline entry's intent, assessment, and levels."""
    found: list[str] = []
    entries = story.get("timeline") if isinstance(story, dict) else None
    for entry in entries or []:
        if not isinstance(entry, dict):
            continue
        base = f"pr{entry.get('pr')}."
        found += intent_overages(entry.get("intent"), f"{base}intent.")
        found += assessment_overages(entry.get("assessment"), f"{base}assessment.")
        levels = entry.get("levels")
        for key, level in (levels.items() if isinstance(levels, dict) else []):
            found += level_overages(level, f"{base}{key}.")
    return found


CHECKERS = {
    "goal.json": goal_overages,
    "intent.json": intent_overages,
    "assessment.json": assessment_overages,
    "story.json": story_overages,
}


def show() -> str:
    item = f"{LIST_ITEM_WORDS} words per item, any number of items"
    rows = [
        ("goal.outcome", GOAL["outcome"]),
        ("goal.done_when, goal.abort_if", item),
        ("intent.problem, intent.testing (times the number of designs in intent.design)", INTENT["problem"]),
        ("intent.why_now", INTENT["why_now"]),
        ("intent.approach", INTENT["approach"]),
        ("intent.alternatives (option and reason together)", f"{ALTERNATIVE_WORDS} words per item, any number of items"),
        ("intent.out_of_scope, risks, reviewer_focus, unknowns", item),
        ("assessment.summary", ASSESSMENT_SUMMARY),
        ("assessment.sensible, maintainability, pattern (answer)", ASSESSMENT_ANSWER),
        ("level.narration", LEVEL["narration"]),
        ("level.problem, level.solution", LEVEL["problem"]),
        ("level.voice", LEVEL["voice"]),
        ("level.beats[].text", f"{BEAT_WORDS} words per item, any number of items"),
    ]
    return "\n".join(
        f"{name:<58} {cap} words" if isinstance(cap, int) else f"{name:<58} {cap}" for name, cap in rows
    )


def main(argv: list[str]) -> int:
    if len(argv) >= 2 and argv[1] == "show":
        print(show())
        return 0
    if len(argv) >= 3 and argv[1] == "check":
        soft_total = hard_total = 0
        for name in argv[2:]:
            path = Path(name)
            checker = CHECKERS.get(path.name)
            if checker is None:
                print(f"{name}: not a goal.json, intent.json, assessment.json, or story.json", file=sys.stderr)
                return 2
            soft, hard = split_overages(checker(json.loads(path.read_text(encoding="utf-8"))))
            for line in soft:
                print(f"{name}: over the cap: {line}")
            for line in hard:
                print(f"{name}: OVER THE CEILING: {line}")
            soft_total += len(soft)
            hard_total += len(hard)
        if soft_total == 0 and hard_total == 0:
            print("ok")
        else:
            print(f"{soft_total} field(s) over the cap, {hard_total} over the ceiling")
        return 1 if hard_total else 0
    print(__doc__, file=sys.stderr)
    return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv))
