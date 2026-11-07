"""The mix of a set of stops: the repository and kind tags of each stop, and the line that prints them.

A repository is the manifest group: `first set` is CoBuilder, `train 2 X` is X, and no group is `(no group)`.
A kind tag is needs_human, ask_human, snooze, notify-only (every step is notify), or continue (continue or
continue_until). A step that lists alternatives counts each kind it names.
"""
from __future__ import annotations

import re
from collections import Counter

from priority.evaluation.payload_rules import get_field

MIX_KINDS = ("needs_human", "ask_human", "snooze", "notify-only", "continue")
COBUILDER = "CoBuilder"
NO_GROUP = "(no group)"
_FIRST_SET = "first set"
_GROUP = re.compile(r"^(?:train|holdout) 2 (.+)$")


def repo_name(group: str | None) -> str:
    """The repository that a manifest group names. `first set` is CoBuilder, `train 2 X` is X, and no group is `(no group)`."""
    if not group:
        return NO_GROUP
    if group == _FIRST_SET:
        return COBUILDER
    match = _GROUP.match(group)
    return match.group(1) if match else group


def stop_tags(steps: list, needs_human: bool) -> list[str]:
    """The kind tags of one stop, from its label steps and its needs_human flag. A step is a kind or a list of kinds."""
    kinds = [kind for entry in steps for kind in (entry if isinstance(entry, list) else [entry])]
    tags = ["needs_human"] if needs_human else []
    if "ask_human" in kinds:
        tags.append("ask_human")
    if "snooze" in kinds:
        tags.append("snooze")
    if kinds and all(kind == "notify" for kind in kinds):
        tags.append("notify-only")
    if any(kind in ("continue", "continue_until") for kind in kinds):
        tags.append("continue")
    return tags


def _tags(example: object) -> list[str]:
    """The tags of one stop: its repository, then its kind tags. A repository tag carries a prefix, so a name never
    collides with a kind tag."""
    repo = get_field(example, "repo", NO_GROUP)
    return [f"repo:{repo}", *get_field(example, "tags", [])]


def counts_of(examples: list) -> Counter:
    """How many stops carry each tag."""
    return Counter(tag for example in examples for tag in _tags(example))


def _percent(count: int, total: int) -> int:
    return round(100 * count / total)


def mix_line(label: str, examples: list) -> str:
    """One line of shares: each repository, then each kind tag, as whole percents of the stops."""
    if not examples:
        return f"{label} mix: (none)"
    total = len(examples)
    repos = Counter(get_field(example, "repo", NO_GROUP) for example in examples)
    kinds = counts_of(examples)
    repo_text = ", ".join(f"{name} {_percent(count, total)}%"
                          for name, count in sorted(repos.items(), key=lambda item: (item[0] != COBUILDER, item[0])))
    kind_text = "; ".join(f"{tag} {_percent(kinds[tag], total)}%" for tag in MIX_KINDS)
    return f"{label} mix: {repo_text}; {kind_text}"
