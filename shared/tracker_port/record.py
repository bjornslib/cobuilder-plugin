"""The neutral record and the capability flags that every tracker adapter returns."""

from __future__ import annotations

from collections.abc import Mapping
from dataclasses import dataclass, field
from typing import Literal

Scalar = str | int | float | bool | None
Kind = Literal["program", "epic", "slice", "pr"]
Lifecycle = Literal["open", "in_progress", "closed"]

# The title rule of ADR-0044: an issue title is the name, not a copy of the cb id.
TITLE_RULE = "name"


def bd_title(cb_id: str, kind: str, name: str | None) -> str:
    # A pull request keeps its ref, and a record with no name keeps its cb id. TITLE_RULE sets the rest.
    if kind == "pr" or not name:
        return cb_id
    return name if TITLE_RULE == "name" else f"{cb_id} — {name}"


@dataclass(frozen=True)
class TrackerRecord:
    id: str
    kind: Kind
    parent: str | None
    blocked_by: tuple[str, ...]
    lifecycle: Lifecycle
    assignee: str | None
    envelope: Mapping[str, Scalar | tuple[Scalar, ...]]
    external_ref: str | None
    # Text fields. A bd row holds them in the fields of the same names. They stay out of equality.
    title: str | None = field(default=None, compare=False)
    description: str | None = field(default=None, compare=False)
    acceptance_criteria: str | None = field(default=None, compare=False)
    design: str | None = field(default=None, compare=False)
    # Kind pr only: the epic ids of its `tracks` dependencies.
    tracks: tuple[str, ...] = ()


@dataclass(frozen=True)
class Capabilities:
    native_ready: bool
    atomic_claim: bool
    rich_envelope: bool
    offline_read: bool

# Envelope keys the file fills only when the held envelope lacks them or holds None.
# A runtime score, attempt count, or epic branch, pr, or state that is already set is never replaced by the file.
FILL_WHEN_EMPTY = frozenset({"score", "attempts", "branch", "pr", "state", "stage"})


def merge_refresh_envelope(
    held: Mapping[str, Scalar | tuple[Scalar, ...]],
    incoming: Mapping[str, Scalar | tuple[Scalar, ...]],
) -> dict[str, Scalar | tuple[Scalar, ...]]:
    """Overwrite the file-derived keys; keep runtime keys the file lacks."""
    fill = {
        key: value
        for key, value in incoming.items()
        if key not in FILL_WHEN_EMPTY or held.get(key) is None
    }
    return {**held, **fill}
