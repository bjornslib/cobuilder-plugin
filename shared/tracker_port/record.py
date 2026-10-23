"""The neutral record and the capability flags that every tracker adapter returns."""

from __future__ import annotations

from collections.abc import Mapping
from dataclasses import dataclass
from typing import Literal

Scalar = str | int | float | bool | None
Kind = Literal["program", "epic", "slice", "pr"]
Lifecycle = Literal["open", "in_progress", "closed"]


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
