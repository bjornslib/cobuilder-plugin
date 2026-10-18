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
